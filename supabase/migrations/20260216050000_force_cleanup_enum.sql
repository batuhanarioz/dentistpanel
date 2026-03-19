-- =========================================================
-- Cleanup Appointment Status Enum (Force Update)
-- =========================================================

BEGIN;

-- 1. Cleaning pre-requisites
DROP TYPE IF EXISTS public.appointment_status_new CASCADE;

-- 2. Update all 'pending' entries to 'confirmed' to ensure data consistency
UPDATE public.appointments
SET status = 'confirmed'
WHERE status::text = 'pending';

-- 3. Remove the Default Constraint (Critical step)
ALTER TABLE public.appointments ALTER COLUMN status DROP DEFAULT;

-- 4. Create the new enum type
CREATE TYPE public.appointment_status_new AS ENUM (
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);

-- 5. Convert the column to the new type
-- distinct casting ensures we don't have type mismatches
ALTER TABLE public.appointments
ALTER COLUMN status TYPE public.appointment_status_new 
USING (
  CASE 
    WHEN status::text = 'pending' THEN 'confirmed'::public.appointment_status_new
    ELSE status::text::public.appointment_status_new
  END
);

-- 6. Set the new default
ALTER TABLE public.appointments
ALTER COLUMN status SET DEFAULT 'confirmed'::public.appointment_status_new;

-- 7. Drop the old type
DROP TYPE IF EXISTS public.appointment_status CASCADE;

-- 8. Rename new type to the standard name
ALTER TYPE public.appointment_status_new RENAME TO appointment_status;

COMMIT;
