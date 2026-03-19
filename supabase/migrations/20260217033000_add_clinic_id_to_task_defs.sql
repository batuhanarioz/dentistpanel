-- 1) Add clinic_id to dashboard_task_definitions
ALTER TABLE public.dashboard_task_definitions
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 2) Drop the existing global unique constraint on 'code'
-- The constraint name might be 'dashboard_task_definitions_code_key' based on the user's provided CREATE TABLE
ALTER TABLE public.dashboard_task_definitions
DROP CONSTRAINT IF EXISTS dashboard_task_definitions_code_key;

-- 3) Add Partial Unique Indexes to handle "One Default" and "One Per Clinic"

-- A) Ensure only one global default per code (where clinic_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_task_definitions_code_default
ON public.dashboard_task_definitions (code)
WHERE clinic_id IS NULL;

-- B) Ensure uniqueness per clinic (so a clinic can't have duplicate codes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_task_definitions_code_clinic
ON public.dashboard_task_definitions (clinic_id, code)
WHERE clinic_id IS NOT NULL;

-- 4) Update RLS Policies
-- Enable RLS if not already enabled
ALTER TABLE public.dashboard_task_definitions ENABLE ROW LEVEL SECURITY;

-- Drop old policies to act fresh
DROP POLICY IF EXISTS "dashboard_task_definitions_select_all" ON public.dashboard_task_definitions;
DROP POLICY IF EXISTS "dashboard_task_definitions_modify_super_admin" ON public.dashboard_task_definitions;

-- Policy: Everyone can read defaults. Users can read their own clinic's definitions.
CREATE POLICY "dashboard_task_definitions_read"
ON public.dashboard_task_definitions FOR SELECT
USING (
  clinic_id IS NULL                                -- Global defaults
  OR clinic_id = public.current_user_clinic_id()   -- Own clinic's overrides
  OR public.current_user_is_super_admin()          -- Super admin sees all
);

-- Policy: Super Admin can manage everything
CREATE POLICY "dashboard_task_definitions_all_super_admin"
ON public.dashboard_task_definitions FOR ALL
USING (
  public.current_user_is_super_admin()
)
WITH CHECK (
  public.current_user_is_super_admin()
);

-- Policy: Clinic Admins can create/update/delete ONLY their own clinic's definitions
CREATE POLICY "dashboard_task_definitions_write_clinic_admin"
ON public.dashboard_task_definitions FOR ALL
USING (
  public.current_user_is_admin() 
  AND clinic_id = public.current_user_clinic_id()
)
WITH CHECK (
  public.current_user_is_admin() 
  AND clinic_id = public.current_user_clinic_id()
);

-- 5) Trigger to auto-set clinic_id on insert if not provided?
-- Actually for this table, if clinic_id is NULL, it means "Global Default".
-- So we probably DON'T want to auto-force clinic_id unless the user intends it to be clinic-specific.
-- BUT, typically, if a clinic admin inserts a row, it SHOULD be for their clinic.
-- If a super admin inserts a row, they might intend it to be global (NULL) or specific.
-- Let's stick to explicit clinic_id handling in the application layer or use a smart trigger.
-- Given the "auto_set_clinic_id" function exists, let's see if we should apply it.
-- If we apply it, a clinic admin inserting a row will get their clinic_id. Good.
-- A super admin inserting a row (without clinic_id) will get... their clinic_id?
-- Super admin usually has NULL clinic_id? 
-- Let's check `current_user_clinic_id` implementation in schema.sql:
-- `select clinic_id from public.users where id = auth.uid();`
-- If super admin has NULL clinic_id, then `new.clinic_id := NULL` -> it remains NULL (Global Default).
-- If normal admin has a clinic_id, `new.clinic_id := their_id`.
-- This seems correct! "Global" for super admins, "Private" for clinic admins.
-- BUT wait, does Super Admin want to create a SPECIFIC clinic task? They would provide clinic_id explicitly.
-- The trigger `auto_set_clinic_id` checks `if new.clinic_id is null then ...`.
-- So if Super Admin provides a clinic_id, it is respected.
-- If Super Admin DOES NOT provide one, it becomes NULL (Global).
-- If Clinic Admin DOES NOT provide one, it acts as their clinic (because `current_user_clinic_id` returns their ID).
-- EXCEPT `auto_set_clinic_id` is defined as:
--   if new.clinic_id is null then new.clinic_id := public.current_user_clinic_id(); end if;
-- If Super Admin has NULL clinic_id in `users` table, then it sets it to NULL. Correct.
-- If Clinic Admin has UUID, it sets to UUID. Correct.
-- So adding the trigger is a good safety measure.

CREATE TRIGGER trg_dashboard_task_definitions_clinic_id
BEFORE INSERT ON public.dashboard_task_definitions
FOR EACH ROW EXECUTE FUNCTION public.auto_set_clinic_id();
