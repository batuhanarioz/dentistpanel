-- 1) Trigger Fonksiyonunu Güncelle (Statü değişimlerini ve görevlerin tekrar açılmasını yönet)
CREATE OR REPLACE FUNCTION public.sync_checklist_on_appointment_change()
RETURNS trigger AS $$
DECLARE
    def_id_status uuid;
    def_id_note uuid;
    def_id_payment uuid;
    payment_exists boolean;
BEGIN
    SELECT id INTO def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    -- [A] Randevu İptal veya Gelmedi olduysa O RANDEVUYA AİT TÜM BEKLEYEN GÖREVLERİ KAPAT
    IF NEW.status IN ('cancelled', 'no_show') THEN
        UPDATE public.checklist_items 
        SET status = 'dismissed', completed_at = now()
        WHERE appointment_id = NEW.id AND status = 'pending';
        RETURN NEW; -- İptal durumunda başka bildirim açmaya gerek yok
    END IF;

    -- [B] Randevu Tamamlandı ise
    IF NEW.status = 'completed' THEN
        -- 1. Durum güncelleme görevini kapat
        UPDATE public.checklist_items 
        SET status = 'completed', completed_at = now()
        WHERE appointment_id = NEW.id AND definition_id = def_id_status AND status = 'pending';

        -- 2. Tedavi Notu Kontrolü (Hali hazırda Dismissed/Completed olsa bile eksikse tekrar PENDING yap)
        IF NEW.treatment_note IS NOT NULL AND NEW.treatment_note <> '' THEN
            UPDATE public.checklist_items 
            SET status = 'completed', completed_at = now()
            WHERE appointment_id = NEW.id AND definition_id = def_id_note AND status = 'pending';
        ELSE
            INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
            VALUES (NEW.clinic_id, NEW.id, def_id_note, 'pending')
            ON CONFLICT (appointment_id, definition_id) 
            DO UPDATE SET status = 'pending', completed_at = NULL
            WHERE public.checklist_items.status <> 'pending';
        END IF;

        -- 3. Ödeme Kontrolü
        SELECT EXISTS (SELECT 1 FROM public.payments WHERE appointment_id = NEW.id) INTO payment_exists;
        IF payment_exists THEN
            UPDATE public.checklist_items 
            SET status = 'completed', completed_at = now()
            WHERE appointment_id = NEW.id AND definition_id = def_id_payment AND status = 'pending';
        ELSE
            INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
            VALUES (NEW.clinic_id, NEW.id, def_id_payment, 'pending')
            ON CONFLICT (appointment_id, definition_id) 
            DO UPDATE SET status = 'pending', completed_at = NULL
            WHERE public.checklist_items.status <> 'pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Ödeme Silindiğinde Görevi Gerekirse Tekrar Aç
CREATE OR REPLACE FUNCTION public.sync_checklist_on_payment_delete()
RETURNS trigger AS $$
DECLARE
    def_id_payment uuid;
BEGIN
    SELECT id INTO def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    -- SİLİNEN ÖDEMEDEN SONRA, O RANDEVUYA AİT HİÇ ÖDEME KALMADIYSA GÖREVİ AÇ
    IF EXISTS (SELECT 1 FROM public.appointments WHERE id = OLD.appointment_id AND status = 'completed') 
       AND NOT EXISTS (SELECT 1 FROM public.payments WHERE appointment_id = OLD.appointment_id AND id != OLD.id) 
    THEN
        INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
        VALUES (OLD.clinic_id, OLD.appointment_id, def_id_payment, 'pending')
        ON CONFLICT (appointment_id, definition_id) 
        DO UPDATE SET status = 'pending', completed_at = NULL;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Refresh Fonksiyonunu İyileştir (Statü değişimlerini ve görevlerin tekrar açılmasını yönet)
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

    -- [A] TEMİZLİK: Artık geçerli olmayan bekleyen görevleri kapat
    UPDATE public.checklist_items ci
    SET status = 'dismissed', completed_at = now()
    FROM public.appointments a
    WHERE ci.appointment_id = a.id
      AND ci.clinic_id = p_clinic_id
      AND ci.status = 'pending'
      AND (
          a.status IN ('cancelled', 'no_show')
          OR (ci.definition_id = v_def_id_note AND a.treatment_note IS NOT NULL AND a.treatment_note <> '')
          OR (ci.definition_id = v_def_id_payment AND EXISTS (SELECT 1 FROM public.payments p WHERE p.appointment_id = a.id))
          OR (ci.definition_id = v_def_id_doctor AND a.doctor_id IS NOT NULL)
          OR (ci.definition_id = v_def_id_status AND a.status IN ('completed', 'cancelled', 'no_show'))
      );

    -- [B] EKLEME & GÜNCELLEME: Eksik olan görevleri ekle veya statü değiştiyse geri getir
    -- 1) Durum Güncellemesi
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_status, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND ends_at < now() AND status NOT IN ('completed', 'cancelled', 'no_show')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 2) Tedavi Notu
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_note, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND status = 'completed' AND (treatment_note IS NULL OR treatment_note = '')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 3) Doktor Atama
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_doctor, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND doctor_id IS NULL
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 4) Ödeme Kontrolü
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT a.clinic_id, a.id, v_def_id_payment, 'pending'
    FROM public.appointments a
    WHERE a.clinic_id = p_clinic_id AND a.status = 'completed' AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.appointment_id = a.id)
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
