-- ==============================================================================
-- 1) 'agreed_total' Kolonunu Ekle
-- Her ödeme/taksit satırı, oluşturulduğu andaki 'Klinik ile Anlaşılan Toplam Tutarı'
-- hafızasında tutar. Böylece taksit silinse bile hedef hedef tutar unutulmaz.
-- ==============================================================================
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS agreed_total numeric DEFAULT 0;

-- ==============================================================================
-- 2) Ödeme Eksik Mi Kontrolü İçin Yardımcı Fonksiyon
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_payment_missing(p_app_id uuid)
RETURNS boolean AS $$
DECLARE
    v_agreed_total numeric;
    v_total_paid numeric;
    v_payment_count integer;
BEGIN
    -- Bu randevuya ait ödemelerden 'agreed_total' değeri en yüksek çıkanı bul
    SELECT COALESCE(MAX(agreed_total), 0) INTO v_agreed_total
    FROM public.payments WHERE appointment_id = p_app_id;
    
    -- Toplam ödenen miktar
    SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_total_paid, v_payment_count
    FROM public.payments WHERE appointment_id = p_app_id;

    -- Eğer içeride hiç ödeme yoksa EKSİK'tir (Klasik mantık)
    IF v_payment_count = 0 THEN
        RETURN true;
    END IF;

    -- Eğer herhangi bir 'agreed_total' varsa, toplam tutar bu hedefin altında kalmamalı
    -- (v_agreed_total > 0 demek bir zamanlar bir plandan kalan bir hedef var demek)
    IF v_agreed_total > 0 THEN
        -- Eğer virgül hassasiyetinden dolayı ufak hatalar olursa diye > 0.01
        IF v_agreed_total - v_total_paid > 0.01 THEN
            RETURN true; -- Eksik
        ELSE
            RETURN false; -- Tamam
        END IF;
    ELSE
        -- Hiç 'agreed_total' girilmemiş eski kayıtlar vb. olabilir, ödeme varsa TAMAM
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 3) Randevu Değiştiğinde
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_checklist_on_appointment_change()
RETURNS trigger AS $$
DECLARE
    def_id_status uuid;
    def_id_note uuid;
    def_id_payment uuid;
BEGIN
    SELECT id INTO def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    IF NEW.status IN ('cancelled', 'no_show') THEN
        UPDATE public.checklist_items 
        SET status = 'dismissed', completed_at = now()
        WHERE appointment_id = NEW.id AND status = 'pending';
        RETURN NEW;
    END IF;

    IF NEW.status = 'completed' THEN
        -- Durum Güncelleme Kapat
        UPDATE public.checklist_items 
        SET status = 'completed', completed_at = now()
        WHERE appointment_id = NEW.id AND definition_id = def_id_status AND status = 'pending';

        -- Tedavi Notu
        IF NEW.treatment_note IS NOT NULL AND NEW.treatment_note <> '' THEN
            UPDATE public.checklist_items 
            SET status = 'completed', completed_at = now()
            WHERE appointment_id = NEW.id AND definition_id = def_id_note AND status = 'pending';
        ELSE
            INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
            VALUES (NEW.clinic_id, NEW.id, def_id_note, 'pending')
            ON CONFLICT (appointment_id, definition_id) 
            DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';
        END IF;

        -- Ödeme Bakiye Kontrolü
        IF public.is_payment_missing(NEW.id) THEN
            INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
            VALUES (NEW.clinic_id, NEW.id, def_id_payment, 'pending')
            ON CONFLICT (appointment_id, definition_id) 
            DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';
        ELSE
            UPDATE public.checklist_items 
            SET status = 'completed', completed_at = now()
            WHERE appointment_id = NEW.id AND definition_id = def_id_payment AND status = 'pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 4) Ödeme Silindiğinde, Eklendiğinde veya Değiştiğinde Dinamik Bakiye Tetikleyici
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_checklist_on_payment_change()
RETURNS trigger AS $$
DECLARE
    app_id uuid;
    c_id uuid;
    def_id_payment uuid;
BEGIN
    SELECT id INTO def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    IF TG_OP = 'DELETE' THEN
        app_id := OLD.appointment_id;
        c_id := OLD.clinic_id;
    ELSE
        app_id := NEW.appointment_id;
        c_id := NEW.clinic_id;
    END IF;

    -- Sadece tamamlanmış randevular için kontrol yap
    IF EXISTS (SELECT 1 FROM public.appointments WHERE id = app_id AND status = 'completed') THEN
        IF public.is_payment_missing(app_id) THEN
            -- Bakiye eksikse Görevi Aç
            INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
            VALUES (c_id, app_id, def_id_payment, 'pending')
            ON CONFLICT (appointment_id, definition_id) 
            DO UPDATE SET status = 'pending', completed_at = NULL;
        ELSE
            -- Bakiye tamsa Görevi Kapat
            UPDATE public.checklist_items 
            SET status = 'completed', completed_at = now()
            WHERE appointment_id = app_id AND definition_id = def_id_payment AND status = 'pending';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Eski delete trigger'ını düşür
DROP TRIGGER IF EXISTS trg_sync_checklist_on_payment_delete ON public.payments;

-- Yeni kapsayıcı trigger'ı kur
DROP TRIGGER IF EXISTS trg_sync_checklist_on_payment_change ON public.payments;
CREATE TRIGGER trg_sync_checklist_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_checklist_on_payment_change();


-- ==============================================================================
-- 5) Refresh Fonksiyonunu Temizle
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.refresh_checklist_items(p_clinic_id uuid)
RETURNS void AS $$
DECLARE
    v_def_id_status uuid;
    v_def_id_note uuid;
    v_def_id_doctor uuid;
    v_def_id_payment uuid;
BEGIN
    SELECT id INTO v_def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO v_def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO v_def_id_doctor FROM public.checklist_definitions WHERE code = 'MISSING_DOCTOR';
    SELECT id INTO v_def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    IF v_def_id_status IS NULL THEN RETURN; END IF;

    -- TEMİZLİK
    UPDATE public.checklist_items ci
    SET status = 'dismissed', completed_at = now()
    FROM public.appointments a
    WHERE ci.appointment_id = a.id
      AND ci.clinic_id = p_clinic_id
      AND ci.status = 'pending'
      AND (
          a.status IN ('cancelled', 'no_show')
          OR (ci.definition_id = v_def_id_note AND a.treatment_note IS NOT NULL AND a.treatment_note <> '')
          OR (ci.definition_id = v_def_id_payment AND NOT public.is_payment_missing(a.id))
          OR (ci.definition_id = v_def_id_doctor AND a.doctor_id IS NOT NULL)
          OR (ci.definition_id = v_def_id_status AND a.status IN ('completed', 'cancelled', 'no_show'))
      );

    -- EKLEME (Tamamlanmış randevular ve eksikler)
    -- 1) Durum
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_status, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND ends_at < now() AND status NOT IN ('completed', 'cancelled', 'no_show')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 2) Not
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_note, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND status = 'completed' AND (treatment_note IS NULL OR treatment_note = '')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 3) Doktor
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_doctor, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND doctor_id IS NULL
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 4) Bakiyeli Ödeme
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_payment, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND status = 'completed' AND public.is_payment_missing(id)
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
