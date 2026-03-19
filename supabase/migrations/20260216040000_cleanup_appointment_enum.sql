-- =========================================================
-- Cleanup Appointment Status Enum (Remove 'pending') - FIXED
-- =========================================================

-- 1. Ensure all 'pending' appointments are updated to 'confirmed'
UPDATE public.appointments
SET status = 'confirmed'
WHERE status = 'pending';

-- 2. Create the new enum type without 'pending'
CREATE TYPE public.appointment_status_new AS ENUM (
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);

-- 3. Drop the default constraint FIRST to avoid casting errors
ALTER TABLE public.appointments
ALTER COLUMN status DROP DEFAULT;

-- 4. Alter the table to use the new type
-- We cast the column to text first, then to the new enum type.
ALTER TABLE public.appointments
ALTER COLUMN status TYPE public.appointment_status_new 
USING (status::text::public.appointment_status_new);

-- 5. Set the new default value using the new enum type
ALTER TABLE public.appointments
ALTER COLUMN status SET DEFAULT 'confirmed'::public.appointment_status_new;

-- 6. Drop the old enum type
DROP TYPE public.appointment_status;

-- 7. Rename the new type to the original name
ALTER TYPE public.appointment_status_new RENAME TO appointment_status;
