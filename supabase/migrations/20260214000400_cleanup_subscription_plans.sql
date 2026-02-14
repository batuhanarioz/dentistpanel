-- Remove zombie columns from subscription_plans table
-- These columns were replaced by max_doctors and max_staff in migration 20260214000100
alter table public.subscription_plans 
drop column if exists max_users,
drop column if exists max_patients;
