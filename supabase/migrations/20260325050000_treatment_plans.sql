-- ============================================================
-- Treatment Plans + Treatment Plan Items
-- Bu migration DB'de zaten mevcut olan tabloları belgeler.
-- Tablolar manuel oluşturulmuştu; bu dosya deployment güvenliği içindir.
-- ============================================================

-- ── treatment_plans ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
    clinic_id               uuid        NOT NULL,
    patient_id              uuid        NOT NULL,
    appointment_id          uuid,
    doctor_id               uuid,
    created_by              uuid,
    status                  text        NOT NULL DEFAULT 'draft',
    title                   text,
    note                    text,
    total_estimated_amount  numeric     DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    next_appointment_id     uuid,

    CONSTRAINT treatment_plans_pkey PRIMARY KEY (id),
    CONSTRAINT treatment_plans_clinic_fk  FOREIGN KEY (clinic_id)  REFERENCES public.clinics(id)  ON DELETE CASCADE,
    CONSTRAINT treatment_plans_patient_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
    CONSTRAINT treatment_plans_status_chk CHECK (
        status IN ('planned', 'in_progress', 'completed', 'cancelled')
    )
);

-- ── treatment_plan_items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    clinic_id           uuid        NOT NULL,
    treatment_plan_id   uuid        NOT NULL,
    patient_id          uuid        NOT NULL,
    tooth_no            text,
    procedure_name      text        NOT NULL,
    description         text,
    quantity            numeric     NOT NULL DEFAULT 1,
    unit_price          numeric     NOT NULL DEFAULT 0,
    total_price         numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
    assigned_doctor_id  uuid,
    status              text        NOT NULL DEFAULT 'planned',
    sort_order          integer     NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT treatment_plan_items_pkey PRIMARY KEY (id),
    CONSTRAINT treatment_plan_items_clinic_fk FOREIGN KEY (clinic_id)
        REFERENCES public.clinics(id) ON DELETE CASCADE,
    CONSTRAINT treatment_plan_items_plan_fk   FOREIGN KEY (treatment_plan_id)
        REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
    CONSTRAINT treatment_plan_items_status_chk CHECK (
        status IN ('planned', 'in_progress', 'completed', 'cancelled')
    )
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.treatment_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

-- Klinik kullanıcıları kendi kliniklerini görebilir
CREATE POLICY IF NOT EXISTS "treatment_plans_clinic_access"
    ON public.treatment_plans
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "treatment_plan_items_clinic_access"
    ON public.treatment_plan_items
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ── İndeksler ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic_id    ON public.treatment_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id   ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_id ON public.treatment_plan_items(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_clinic  ON public.treatment_plan_items(clinic_id);

-- total_price GENERATED ALWAYS AS (quantity * unit_price) STORED — trigger gerekmez

-- ── updated_at trigger ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_treatment_plans_updated_at ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plans_updated_at
    BEFORE UPDATE ON public.treatment_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_treatment_plan_items_updated_at ON public.treatment_plan_items;
CREATE TRIGGER trg_treatment_plan_items_updated_at
    BEFORE UPDATE ON public.treatment_plan_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
