-- Add metadata to anamnesis table
ALTER TABLE public.patient_anamnesis 
ADD COLUMN IF NOT EXISTS filled_by text CHECK (filled_by IN ('STAFF', 'PATIENT')) DEFAULT 'STAFF',
ADD COLUMN IF NOT EXISTS filled_at timestamptz DEFAULT now();

-- Ensure unique constraint for upsert
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_anamnesis_patient_id_key') THEN
        ALTER TABLE public.patient_anamnesis ADD CONSTRAINT patient_anamnesis_patient_id_key UNIQUE (patient_id);
    END IF;
END $$;

-- Create temporary check-in codes table
CREATE TABLE IF NOT EXISTS public.checkin_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL,
    appointment_id uuid NOT NULL UNIQUE,
    code varchar(4) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT checkin_codes_pkey PRIMARY KEY (id),
    CONSTRAINT checkin_codes_clinic_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    CONSTRAINT checkin_codes_appointment_fkey FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkin_codes_clinic ON public.checkin_codes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_checkin_codes_code ON public.checkin_codes(code, expires_at);

-- RLS Policies
ALTER TABLE public.checkin_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkin codes are viewable by clinic staff" ON public.checkin_codes
    FOR SELECT TO authenticated
    USING (clinic_id IN (SELECT id FROM clinics));

CREATE POLICY "Checkin codes are manageable by clinic staff" ON public.checkin_codes
    FOR ALL TO authenticated
    USING (clinic_id IN (SELECT id FROM clinics));

-- Public access for verification (only lookup by code and clinic)
CREATE POLICY "Public can lookup checkin codes" ON public.checkin_codes
    FOR SELECT TO anon
    USING (expires_at > now());
