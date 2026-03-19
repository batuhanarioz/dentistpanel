-- Database Schema Improvements Migration
-- Period: 2026-03-07
-- Description: Fixes security risks in RLS, adds missing indexes, and ensures multi-tenant isolation for chat histories.

-- 1. Tighten RLS policies for clinic_automations
DROP POLICY IF EXISTS "Allow authenticated users to insert/update clinic_automations" ON public.clinic_automations;
DROP POLICY IF EXISTS "Allow authenticated users to read clinic_automations" ON public.clinic_automations;

CREATE POLICY "clinic_automations_select_policy" ON public.clinic_automations
FOR SELECT TO authenticated
USING (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "clinic_automations_insert_policy" ON public.clinic_automations
FOR INSERT TO authenticated
WITH CHECK (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "clinic_automations_update_policy" ON public.clinic_automations
FOR UPDATE TO authenticated
USING (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "clinic_automations_delete_policy" ON public.clinic_automations
FOR DELETE TO authenticated
USING (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- 2. Tighten RLS policies for automation_logs
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.automation_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.automation_logs;

CREATE POLICY "automation_logs_select_policy" ON public.automation_logs
FOR SELECT TO authenticated
USING (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "automation_logs_insert_policy" ON public.automation_logs
FOR INSERT TO authenticated
WITH CHECK (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- 3. Fix Multi-Tenant Isolation for n8n_chat_histories
-- First, add clinic_id column
ALTER TABLE public.n8n_chat_histories ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);

-- Enable RLS
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Add Policy
DROP POLICY IF EXISTS "n8n_chat_histories_isolation" ON public.n8n_chat_histories;
CREATE POLICY "n8n_chat_histories_isolation" ON public.n8n_chat_histories
FOR ALL TO authenticated
USING (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

-- 4. Add Missing Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatment_definitions_clinic_id ON public.treatment_definitions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_clinic_id ON public.checklist_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_clinic_id ON public.n8n_chat_histories(clinic_id);

-- 5. Data Integrity: CHECK constraint for payment status
-- First, identify existing statuses to avoid breaking the constraint
-- Typical statuses: 'paid', 'planned', 'partial', 'cancelled', 'deferred'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
CHECK (status = ANY (ARRAY['paid', 'pending', 'planned', 'partial', 'cancelled', 'deferred', 'Ödendi', 'Beklemede', 'Kısmi', 'İptal']));

-- 6. Add auto_set_clinic_id trigger to n8n_chat_histories
-- (Assumes public.auto_set_clinic_id() already exists as identified in audit)
DROP TRIGGER IF EXISTS trg_set_clinic_id_n8n ON public.n8n_chat_histories;
CREATE TRIGGER trg_set_clinic_id_n8n
    BEFORE INSERT ON public.n8n_chat_histories
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_clinic_id();
