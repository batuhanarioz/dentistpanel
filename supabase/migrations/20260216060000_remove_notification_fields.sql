-- Migration: Remove contact_preference and reminder_minutes_before from appointments
-- Created: 2026-02-16

BEGIN;

-- 1. Remove columns from public.appointments
ALTER TABLE public.appointments 
DROP COLUMN IF EXISTS contact_preference,
DROP COLUMN IF EXISTS reminder_minutes_before;

COMMIT;
