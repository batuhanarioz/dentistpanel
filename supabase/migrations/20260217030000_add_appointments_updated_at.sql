-- 1. Add updated_at column (using timestamp without time zone for local Turkey time display)
-- usage of 'timestamp without time zone' ensures the DB viewer shows the local time (e.g. 14:00) instead of UTC (11:00)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'Europe/Istanbul');

-- 2. Fix the "wrong time" display for created_at by converting to local timestamp
-- This converts the stored UTC 'timestamptz' to local 'timestamp' (e.g. 23:58 UTC -> 02:58 TRT)
ALTER TABLE public.appointments
ALTER COLUMN created_at TYPE timestamp without time zone
USING created_at AT TIME ZONE 'Europe/Istanbul';

-- Ensure new rows get the correct local time by default
ALTER TABLE public.appointments
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Europe/Istanbul');

-- 3. Function to automatically update the timestamp on any change (status, notes, etc.)
CREATE OR REPLACE FUNCTION public.update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Assign current Istanbul time to updated_at
    NEW.updated_at = (now() AT TIME ZONE 'Europe/Istanbul');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create the trigger
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_appointments_updated_at();
