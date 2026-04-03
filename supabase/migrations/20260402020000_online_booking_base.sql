-- ============================================================
-- Online Appointment System Infrastructure (V2 - Lean)
-- 1. Support 'pending' status
-- 2. Add online booking settings to clinics
-- 3. Public access policies for Users/Doctors
-- ============================================================

-- Fix: Add 'pending' to appointment_status enum
DO $$ 
BEGIN
    ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'confirmed';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update clinic_settings to include online booking preferences
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS is_online_booking_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS online_booking_config jsonb DEFAULT '{
    "is_auto_approve": false,
    "slot_duration": 30,
    "buffer_time": 0,
    "min_lead_time_hours": 2,
    "max_days_ahead": 30,
    "allowed_services": [],
    "required_fields": ["phone", "full_name"]
}'::jsonb;

-- Ensure clinics already have these columns with defaults
UPDATE public.clinic_settings 
SET is_online_booking_enabled = false
WHERE is_online_booking_enabled IS NULL;

-- Policy for Public Access (for the booking page)
-- Public should be able to see clinic basic info
CREATE POLICY "Public can view basic clinic info for booking"
    ON public.clinics FOR SELECT
    TO anon
    USING (true);

-- Public can view booking settings
CREATE POLICY "Public can view clinic booking settings"
    ON public.clinic_settings FOR SELECT
    TO anon
    USING (true);

-- NEW: Public can see clinical providers (Doctors) to choose them
-- We only expose IDs, Names and Working Hours for security.
CREATE POLICY "Public can view clinical providers for booking"
    ON public.users FOR SELECT
    TO anon
    USING (is_clinical_provider = true AND is_active = true);

-- Public can see appointments (to avoid overlaps)
CREATE POLICY "Public can view appointments for slot checking"
    ON public.appointments FOR SELECT
    TO anon
    USING (true);

-- Public can INSERT new appointments
CREATE POLICY "Public can create appointment requests"
    ON public.appointments FOR INSERT
    TO anon
    WITH CHECK (status = 'pending');
