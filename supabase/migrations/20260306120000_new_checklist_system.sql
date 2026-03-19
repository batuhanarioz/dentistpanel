-- =========================================================
-- Yeni Checklist (Kontrol Listesi) Sistemi
-- =========================================================

-- 1) Görev Tanımları (Lookup)
CREATE TABLE IF NOT EXISTS public.checklist_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    tone text NOT NULL DEFAULT 'low', -- critical, high, medium, low
    created_at timestamptz DEFAULT now()
);

-- 2) Klinik Bazlı Çoklu Rol Atamaları
CREATE TABLE IF NOT EXISTS public.checklist_clinic_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    definition_id uuid REFERENCES public.checklist_definitions(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    UNIQUE(clinic_id, definition_id, role)
);

-- 3) Kontrol Listesi Maddeleri (Kalıcı Görevler)
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    definition_id uuid NOT NULL REFERENCES public.checklist_definitions(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending', -- pending, completed, dismissed
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    
    -- Bir randevu için aynı görev türünden (pending durumda) sadece bir tane olabilir
    CONSTRAINT unique_pending_task UNIQUE (appointment_id, definition_id) 
);

-- RLS Aktif Et
ALTER TABLE public.checklist_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_clinic_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "checklist_definitions_select" ON public.checklist_definitions FOR SELECT USING (true);

CREATE POLICY "checklist_clinic_roles_select" ON public.checklist_clinic_roles FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()) 
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
);

CREATE POLICY "checklist_clinic_roles_all_admin" ON public.checklist_clinic_roles FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    AND (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()) OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN')
);

CREATE POLICY "checklist_items_select" ON public.checklist_items FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "checklist_items_all_clinic_users" ON public.checklist_items FOR ALL USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);

-- =========================================================
-- OTOMATİK SENKRONİZASYON (TRIGGER)
-- =========================================================

-- Randevu durumu değiştiğinde ilgili görevleri kapat
CREATE OR REPLACE FUNCTION public.sync_checklist_on_appointment_change()
RETURNS trigger AS $$
DECLARE
    def_id_status uuid;
    def_id_note uuid;
BEGIN
    SELECT id INTO def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';

    -- Randevu Tamamlandı/İptal/Gelmedi olduysa Durum Güncelleme görevini kapat
    IF NEW.status IN ('completed', 'cancelled', 'no_show') THEN
        UPDATE public.checklist_items 
        SET status = 'completed', completed_at = now()
        WHERE appointment_id = NEW.id AND definition_id = def_id_status AND status = 'pending';
    END IF;

    -- Randevu Tamamlandıysa ve Not girildiyse Not görevini kapat
    IF NEW.status = 'completed' AND NEW.treatment_note IS NOT NULL AND NEW.treatment_note <> '' THEN
        UPDATE public.checklist_items 
        SET status = 'completed', completed_at = now()
        WHERE appointment_id = NEW.id AND definition_id = def_id_note AND status = 'pending';
    END IF;

    -- Eğer randevu tamamlandı statüsüne geçtiyse ama notu yoksa, yeni bir MISSING_NOTE görevi aç
    IF NEW.status = 'completed' AND (NEW.treatment_note IS NULL OR NEW.treatment_note = '') THEN
        INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
        VALUES (NEW.clinic_id, NEW.id, def_id_note, 'pending')
        ON CONFLICT (appointment_id, definition_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_checklist_on_appointment
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_checklist_on_appointment_change();

-- Ödeme eklendiğinde ödeme görevini kapat
CREATE OR REPLACE FUNCTION public.sync_checklist_on_payment_insert()
RETURNS trigger AS $$
DECLARE
    def_id_payment uuid;
BEGIN
    SELECT id INTO def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    UPDATE public.checklist_items 
    SET status = 'completed', completed_at = now()
    WHERE appointment_id = NEW.appointment_id AND definition_id = def_id_payment AND status = 'pending';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_checklist_on_payment
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_checklist_on_payment_insert();

-- =========================================================
-- SEED DATA (GÖREV TANIMLARI) - Garanti Altına Al
-- =========================================================
INSERT INTO public.checklist_definitions (code, title, description, tone) VALUES
('STATUS_UPDATE', 'Durum Güncellemesi', 'Randevu süresi geçti, durum belirtilmeli.', 'critical'),
('MISSING_NOTE', 'Tedavi Notu Eksik', 'Tamamlanan randevu için tedavi notu girilmemiş.', 'medium'),
('MISSING_PAYMENT', 'Ödeme Girişi Eksik', 'Tamamlanan randevu için ödeme kaydı bulunamadı.', 'high'),
('MISSING_DOCTOR', 'Doktor Atanmadı', 'Randevu için henüz bir doktor atanmamış.', 'low')
ON CONFLICT (code) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    tone = EXCLUDED.tone;

-- =========================================================
-- OTOMATIK GÖREV YENİLEME (REFRESH)
-- =========================================================

CREATE OR REPLACE FUNCTION public.refresh_checklist_items(p_clinic_id uuid)
RETURNS void AS $$
DECLARE
    v_def_id_status uuid;
    v_def_id_note uuid;
    v_def_id_doctor uuid;
    v_def_id_payment uuid;
BEGIN
    -- Tanımları al
    SELECT id INTO v_def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO v_def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO v_def_id_doctor FROM public.checklist_definitions WHERE code = 'MISSING_DOCTOR';
    SELECT id INTO v_def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';

    -- Eğer tanımlar yoksa devam etme (Hata fırlatmaz, sessizce çıkar)
    IF v_def_id_status IS NULL THEN RETURN; END IF;

    -- 1) Durum Güncellemesi Bekleyenler (Bitiş saati geçti)
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_status, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND ends_at < now() 
      AND status NOT IN ('completed', 'cancelled', 'no_show')
    ON CONFLICT (appointment_id, definition_id) DO NOTHING;

    -- 2) Tedavi Notu Eksik Olanlar (Tamamlandı ama not yok)
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_note, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND status = 'completed'
      AND (treatment_note IS NULL OR treatment_note = '')
    ON CONFLICT (appointment_id, definition_id) DO NOTHING;

    -- 3) Doktor Atanmayanlar
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_doctor, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND doctor_id IS NULL
    ON CONFLICT (appointment_id, definition_id) DO NOTHING;

    -- 4) Ödeme Eksik Olanlar (Tamamlandı ama payment kaydı yok)
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT a.clinic_id, a.id, v_def_id_payment, 'pending'
    FROM public.appointments a
    LEFT JOIN public.payments p ON p.appointment_id = a.id
    WHERE a.clinic_id = p_clinic_id 
      AND a.status = 'completed'
      AND p.id IS NULL
    ON CONFLICT (appointment_id, definition_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
