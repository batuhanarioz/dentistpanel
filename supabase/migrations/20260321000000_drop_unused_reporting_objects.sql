-- Drop unused reporting DB objects created in 20260307090000_reporting_optimizations.sql
-- These were never called by the application (useReports.ts queries tables directly).
-- rpc_get_financial_stats also used due_date for filtering instead of created_at,
-- diverging from the hook's logic — keeping it would be misleading.

DROP FUNCTION IF EXISTS public.rpc_get_financial_stats(uuid, date, date);
DROP VIEW IF EXISTS public.view_appointment_stats;
