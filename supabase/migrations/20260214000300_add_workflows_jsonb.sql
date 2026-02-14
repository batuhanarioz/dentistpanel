-- Add n8n_workflows column to clinics table
alter table public.clinics 
add column if not exists n8n_workflows jsonb not null default '[]'::jsonb;

-- Refresh schema cache (PostgREST specific)
notify pgrst, 'reload schema';
