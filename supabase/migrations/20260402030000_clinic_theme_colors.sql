ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS theme_color_from TEXT DEFAULT '#4f46e5';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS theme_color_to TEXT DEFAULT '#000000';
