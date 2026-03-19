-- =========================================================
-- Fix RLS Policies for Appointments
-- =========================================================

-- Enable RLS just in case
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

-- Also drop policies potentially created by schema.sql or other migrations
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_write" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;

-- 1. SELECT Policy
CREATE POLICY "appointments_select_policy"
ON public.appointments FOR SELECT
USING (
  public.current_user_is_super_admin() OR
  clinic_id = public.current_user_clinic_id()
);

-- 2. INSERT Policy
CREATE POLICY "appointments_insert_policy"
ON public.appointments FOR INSERT
WITH CHECK (
  public.current_user_is_super_admin() OR
  clinic_id = public.current_user_clinic_id()
);

-- 3. UPDATE Policy
CREATE POLICY "appointments_update_policy"
ON public.appointments FOR UPDATE
USING (
  public.current_user_is_super_admin() OR
  clinic_id = public.current_user_clinic_id()
)
WITH CHECK (
  public.current_user_is_super_admin() OR
  clinic_id = public.current_user_clinic_id()
);

-- 4. DELETE Policy
CREATE POLICY "appointments_delete_policy"
ON public.appointments FOR DELETE
USING (
  public.current_user_is_super_admin() OR
  clinic_id = public.current_user_clinic_id()
);
