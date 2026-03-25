-- ============================================================
-- panel_notifications: Klinik içi bildirim sistemi
-- ============================================================

CREATE TABLE IF NOT EXISTS public.panel_notifications (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    clinic_id   uuid        NOT NULL,
    user_id     uuid        NOT NULL,   -- bildirimin gönderildiği kullanıcı
    type        text        NOT NULL DEFAULT 'new_appointment',
    title       text        NOT NULL,
    body        text,
    link        text,       -- tıklanınca nereye gidilsin (örn: /klinik/randevular)
    is_read     boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT panel_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT panel_notifications_clinic_fk FOREIGN KEY (clinic_id)
        REFERENCES public.clinics(id) ON DELETE CASCADE,
    CONSTRAINT panel_notifications_user_fk  FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT panel_notifications_type_chk CHECK (
        type IN ('new_appointment', 'appointment_cancelled', 'appointment_updated', 'payment_received', 'general')
    )
);

ALTER TABLE public.panel_notifications ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi bildirimlerini görebilir
CREATE POLICY IF NOT EXISTS "panel_notifications_own"
    ON public.panel_notifications
    USING (user_id = auth.uid());

-- Adminler kliniğin tüm bildirimlerini görebilir
CREATE POLICY IF NOT EXISTS "panel_notifications_admin"
    ON public.panel_notifications
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users
            WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE INDEX IF NOT EXISTS idx_panel_notifications_user    ON public.panel_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_panel_notifications_clinic  ON public.panel_notifications(clinic_id, created_at DESC);

-- clinic_settings: bildirim ayarları
ALTER TABLE public.clinic_settings
    ADD COLUMN IF NOT EXISTS notification_rules JSONB NOT NULL DEFAULT '{
        "notify_doctor_on_new_appointment": true,
        "notify_roles_on_new_appointment": ["ADMIN", "SEKRETER"]
    }'::jsonb;

-- ── Trigger: yeni randevu → doktora panel bildirimi ─────────
CREATE OR REPLACE FUNCTION public.notify_on_new_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_doctor_user_id uuid;
    v_patient_name   text;
    v_starts_at      text;
BEGIN
    -- appointments.doctor_id doğrudan users.id'ye karşılık gelir
    -- Atanan doktorun clinic_id'si aynı olduğunu doğrula
    SELECT u.id INTO v_doctor_user_id
    FROM public.users u
    WHERE u.id = NEW.doctor_id
      AND u.clinic_id = NEW.clinic_id
    LIMIT 1;

    -- Hasta adını al
    SELECT full_name INTO v_patient_name
    FROM public.patients WHERE id = NEW.patient_id;

    -- Randevu saati (Istanbul)
    v_starts_at := to_char(NEW.starts_at AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI');

    -- Doktor bulunduysa ve farklı bir kullanıcı tarafından oluşturulduysa bildir
    IF v_doctor_user_id IS NOT NULL AND v_doctor_user_id != NEW.created_by THEN
        INSERT INTO public.panel_notifications(clinic_id, user_id, type, title, body, link)
        VALUES (
            NEW.clinic_id,
            v_doctor_user_id,
            'new_appointment',
            'Yeni Randevu',
            COALESCE(v_patient_name, 'Hasta') || ' — ' || v_starts_at,
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_appointment ON public.appointments;
CREATE TRIGGER trg_notify_new_appointment
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_appointment();
