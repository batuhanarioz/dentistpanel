-- Add is_checkin_enabled to clinic_settings
ALTER TABLE public.clinic_settings 
ADD COLUMN IF NOT EXISTS is_checkin_enabled boolean DEFAULT false;

-- Update existing clinics to false (default)
UPDATE public.clinic_settings SET is_checkin_enabled = false WHERE is_checkin_enabled IS NULL;
