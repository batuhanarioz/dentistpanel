-- ==============================================================================
-- 🚨 ÖDEME TAKİBİ KONTROL LİSTESİ MİGRASYONU
-- Bugün vadesi gelen ödemeleri "Kontrol Listesi"ne otomatik düşürür.
-- ==============================================================================

-- 1) Yeni Kontrol Listesi Tanımı Ekle
INSERT INTO public.checklist_definitions (code, title, tone, description)
VALUES (
    'DUE_PAYMENT_FOLLOWUP', 
    'Vadesi Gelen Ödeme Takibi', 
    'high', 
    'Bugün vadesi dolan bir taksit veya planlanmış ödeme girişi bekleniyor.'
)
ON CONFLICT (code) DO NOTHING;

-- 2) refresh_checklist_items Fonksiyonunu Güncelle (Yeni Ödeme Takibi Mantığıyla)
CREATE OR REPLACE FUNCTION public.refresh_checklist_items(p_clinic_id uuid)
RETURNS void AS $$
DECLARE
    v_def_id_status uuid;
    v_def_id_note uuid;
    v_def_id_doctor uuid;
    v_def_id_payment uuid;
    v_def_id_payment_followup uuid;
BEGIN
    SELECT id INTO v_def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO v_def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO v_def_id_doctor FROM public.checklist_definitions WHERE code = 'MISSING_DOCTOR';
    SELECT id INTO v_def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';
    SELECT id INTO v_def_id_payment_followup FROM public.checklist_definitions WHERE code = 'DUE_PAYMENT_FOLLOWUP';

    -- Temel tanım yoksa işlemi durdur
    IF v_def_id_status IS NULL THEN RETURN; END IF;

    -- ───────────────────────────────────────────────────
    -- [A] TEMİZLİK (Gereksiz/Kapanmış Görevleri Temizle)
    -- ───────────────────────────────────────────────────
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
          OR (ci.definition_id = v_def_id_payment_followup AND NOT EXISTS (
              SELECT 1 FROM public.payments p 
              WHERE p.appointment_id = a.id 
                AND p.due_date = CURRENT_DATE 
                AND p.status NOT IN ('paid', 'Ödendi', 'paid', 'cancelled', 'İptal')
          ))
      );

    -- ───────────────────────────────────────────────────
    -- [B] EKLEME (Eksik Görevleri Oluştur veya Tazelem)
    -- ───────────────────────────────────────────────────
    
    -- 1) Durum Hatırlatması (Süresi geçen randevular)
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_status, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND ends_at < now() AND status NOT IN ('completed', 'cancelled', 'no_show')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 2) Tedavi Notu Eksikliği
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_note, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND status = 'completed' AND (treatment_note IS NULL OR treatment_note = '')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 3) Doktor Atanmamış
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_doctor, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND doctor_id IS NULL
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 4) Bakiyeli Ödeme Eksikliği (Randevu bitti ama ödenmedi)
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_payment, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id AND status = 'completed' AND public.is_payment_missing(id)
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';

    -- 5) BUGÜN VADESİ GELEN ÖDEMELER (Taksit/Plan)
    IF v_def_id_payment_followup IS NOT NULL THEN
        INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
        SELECT p.clinic_id, p.appointment_id, v_def_id_payment_followup, 'pending'
        FROM public.payments p
        WHERE p.clinic_id = p_clinic_id 
          AND p.due_date = CURRENT_DATE 
          AND p.status NOT IN ('paid', 'Ödendi', 'paid', 'cancelled', 'İptal')
        ON CONFLICT (appointment_id, definition_id) 
        DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status <> 'pending';
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
