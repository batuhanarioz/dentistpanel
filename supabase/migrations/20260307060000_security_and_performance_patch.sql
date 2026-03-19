-- ==============================================================================
-- 🔒 GÜVENLİK VE PERFORMANS YAMASI (AUDIT FIX)
-- ==============================================================================

-- 1) refresh_checklist_items Fonksiyonunu Güvenli Hale Getir ve Optimize Et
CREATE OR REPLACE FUNCTION public.refresh_checklist_items(p_clinic_id uuid)
RETURNS void AS $$
DECLARE
    v_def_id_status uuid;
    v_def_id_note uuid;
    v_def_id_doctor uuid;
    v_def_id_payment uuid;
    v_def_id_payment_followup uuid;
    v_current_clinic_id uuid;
BEGIN
    -- [GÜVENLİK] Çağıran kişinin bu kliniğe yetkisi var mı? (SUPER_ADMIN değilse)
    v_current_clinic_id := public.current_user_clinic_id();
    IF v_current_clinic_id IS NOT NULL AND v_current_clinic_id <> p_clinic_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only refresh items for your own clinic.';
    END IF;

    -- Tanımları al (Cache'leme olmadığı için her seferinde SELECT çekilir, bunlar lookup'tır)
    SELECT id INTO v_def_id_status FROM public.checklist_definitions WHERE code = 'STATUS_UPDATE';
    SELECT id INTO v_def_id_note FROM public.checklist_definitions WHERE code = 'MISSING_NOTE';
    SELECT id INTO v_def_id_doctor FROM public.checklist_definitions WHERE code = 'MISSING_DOCTOR';
    SELECT id INTO v_def_id_payment FROM public.checklist_definitions WHERE code = 'MISSING_PAYMENT';
    SELECT id INTO v_def_id_payment_followup FROM public.checklist_definitions WHERE code = 'DUE_PAYMENT_FOLLOWUP';

    IF v_def_id_status IS NULL THEN RETURN; END IF;

    -- [A] TEMİZLİK (Sadece son 30 günlük randevuları temizle - Performans)
    UPDATE public.checklist_items ci
    SET status = 'dismissed', completed_at = now()
    FROM public.appointments a
    WHERE ci.appointment_id = a.id
      AND ci.clinic_id = p_clinic_id
      AND ci.status = 'pending'
      AND a.starts_at > (now() - interval '30 days')
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
                AND p.status NOT IN ('paid', 'Ödendi', 'cancelled', 'İptal')
          ))
      );

    -- [B] EKLEME (Sadece son 7 gün ve gelecek randevular için tara - Performans)
    
    -- 1) Durum Güncellemesi
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_status, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND starts_at > (now() - interval '7 days')
      AND ends_at < now() 
      AND status NOT IN ('completed', 'cancelled', 'no_show')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status = 'dismissed';

    -- 2) Tedavi Notu
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_note, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND starts_at > (now() - interval '7 days')
      AND status = 'completed' 
      AND (treatment_note IS NULL OR treatment_note = '')
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status = 'dismissed';

    -- 3) Doktor Atama
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_doctor, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND starts_at >= CURRENT_DATE
      AND doctor_id IS NULL
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status = 'dismissed';

    -- 4) Ödeme/Bakiye
    INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
    SELECT clinic_id, id, v_def_id_payment, 'pending'
    FROM public.appointments
    WHERE clinic_id = p_clinic_id 
      AND starts_at > (now() - interval '30 days')
      AND status = 'completed' 
      AND public.is_payment_missing(id)
    ON CONFLICT (appointment_id, definition_id) 
    DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status = 'dismissed';

    -- 5) Bugün Vadesi Gelen Ödemeler
    IF v_def_id_payment_followup IS NOT NULL THEN
        INSERT INTO public.checklist_items (clinic_id, appointment_id, definition_id, status)
        SELECT p.clinic_id, p.appointment_id, v_def_id_payment_followup, 'pending'
        FROM public.payments p
        WHERE p.clinic_id = p_clinic_id 
          AND p.due_date = CURRENT_DATE 
          AND p.status NOT IN ('paid', 'Ödendi', 'cancelled', 'İptal')
        ON CONFLICT (appointment_id, definition_id) 
        DO UPDATE SET status = 'pending', completed_at = NULL WHERE public.checklist_items.status = 'dismissed';
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) RLS Politikalarını Standardize Et
DROP POLICY IF EXISTS "checklist_items_select" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_all_clinic_users" ON public.checklist_items;

CREATE POLICY "checklist_items_tenant_isolation" ON public.checklist_items
FOR ALL USING (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
) WITH CHECK (
    clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
);
