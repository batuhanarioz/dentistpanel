-- Path: /Users/batuhanarioz/Desktop/Diş Kliniği/dentist-panel/supabase/migrations/20260307110000_payment_integrity_fix.sql
-- Description: Ensures financial records are preserved when an appointment is deleted.
-- Changes: Makes appointment_id nullable and sets foreign key to ON DELETE SET NULL.

-- 1. Remove NOT NULL constraint from appointment_id
ALTER TABLE public.payments ALTER COLUMN appointment_id DROP NOT NULL;

-- 2. Update Foreign Key for appointment_id to avoid CASCADE delete
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_appointment_id_fkey;

ALTER TABLE public.payments 
    ADD CONSTRAINT payments_appointment_id_fkey 
    FOREIGN KEY (appointment_id) 
    REFERENCES public.appointments(id) 
    ON DELETE SET NULL;

-- 3. Ensure patient_id is also nullable and SET NULL (already seems to be, but for safety)
ALTER TABLE public.payments ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_patient_id_fkey;
ALTER TABLE public.payments 
    ADD CONSTRAINT payments_patient_id_fkey 
    FOREIGN KEY (patient_id) 
    REFERENCES public.patients(id) 
    ON DELETE SET NULL;
