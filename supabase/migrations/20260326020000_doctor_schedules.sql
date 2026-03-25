-- ============================================================
-- doctor_schedules: Doktor bazlı çalışma saatleri
-- ============================================================

CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    clinic_id       uuid        NOT NULL,
    user_id         uuid        NOT NULL,   -- doctors.users tablosundaki id
    working_hours   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT doctor_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT doctor_schedules_clinic_fk FOREIGN KEY (clinic_id)
        REFERENCES public.clinics(id) ON DELETE CASCADE,
    CONSTRAINT doctor_schedules_user_fk FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT doctor_schedules_unique UNIQUE (clinic_id, user_id)
);

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "doctor_schedules_clinic_access"
    ON public.doctor_schedules
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_clinic ON public.doctor_schedules(clinic_id);

DROP TRIGGER IF EXISTS trg_doctor_schedules_updated_at ON public.doctor_schedules;
CREATE TRIGGER trg_doctor_schedules_updated_at
    BEFORE UPDATE ON public.doctor_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
