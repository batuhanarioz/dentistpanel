-- =========================================================
-- Migrate Appointment Statuses: Pending -> Confirmed
-- =========================================================

-- 1. Update all existing 'pending' appointments to 'confirmed'
UPDATE public.appointments
SET status = 'confirmed'
WHERE status = 'pending';

-- 2. Set default value for status column to 'confirmed'
ALTER TABLE public.appointments
ALTER COLUMN status SET DEFAULT 'confirmed';

-- 3. (Optional) If you want to enforce that 'pending' is no longer used, you could add a check constraint,
-- but since it's an enum, we just won't use it in the app code anymore.
-- The enum type 'appointment_status' still contains 'pending', which is fine for safety.
