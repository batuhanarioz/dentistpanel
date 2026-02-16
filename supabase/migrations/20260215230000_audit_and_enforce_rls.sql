-- =========================================================
-- RLS Denetimi ve Güvenlik Sıkılaştırma
-- =========================================================

-- 1) RLS'in tüm tablolarda aktif olduğundan emin ol
alter table if exists public.clinics enable row level security;
alter table if exists public.users enable row level security;
alter table if exists public.patients enable row level security;
alter table if exists public.appointments enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.subscription_plans enable row level security;
alter table if exists public.dashboard_task_definitions enable row level security;
alter table if exists public.clinic_task_configs enable row level security;

-- 2) Görev tanımları (Lookup table) için politikalar
do $$ 
begin
  if not exists (select 1 from pg_policies where tablename = 'dashboard_task_definitions' and policyname = 'dashboard_task_definitions_select_all') then
    create policy "dashboard_task_definitions_select_all"
    on public.dashboard_task_definitions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'dashboard_task_definitions' and policyname = 'dashboard_task_definitions_modify_super_admin') then
    create policy "dashboard_task_definitions_modify_super_admin"
    on public.dashboard_task_definitions for all using (
      public.current_user_is_super_admin()
    ) with check (
      public.current_user_is_super_admin()
    );
  end if;
end $$;

-- 3) Klinik bazlı görev ayarları için politikalar
do $$ 
begin
  if not exists (select 1 from pg_policies where tablename = 'clinic_task_configs' and policyname = 'clinic_task_configs_select') then
    create policy "clinic_task_configs_select"
    on public.clinic_task_configs for select using (
      public.current_user_is_super_admin()
      or clinic_id = public.current_user_clinic_id()
    );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'clinic_task_configs' and policyname = 'clinic_task_configs_all') then
    create policy "clinic_task_configs_all"
    on public.clinic_task_configs for all using (
      public.current_user_is_super_admin()
      or clinic_id = public.current_user_clinic_id()
    ) with check (
      public.current_user_is_super_admin()
      or clinic_id = public.current_user_clinic_id()
    );
  end if;
end $$;

-- 4) clinic_task_configs için otomatik clinic_id tetikleyicisi
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_clinic_task_configs_clinic_id') then
    create trigger trg_clinic_task_configs_clinic_id
      before insert on public.clinic_task_configs
      for each row execute function public.auto_set_clinic_id();
  end if;
end $$;

-- 5) Önemli: clinics tablosundaki kritik alanların (credits, plan_id) 
-- sadece SUPER_ADMIN tarafından güncellenebilmesini sağlayan ekstra kontrol (isteğe bağlı ama önerilir)
-- Not: Mevcut clinics_update_super_admin politikası zaten tüm tabloyu kısıtlıyor olabilir.
-- schema.sql'e baktığımızda clinics_update_super_admin politikası var:
-- create policy "clinics_update_super_admin" on public.clinics for update using (public.current_user_is_super_admin())
-- Bu politika klinik sahiplerinin kendi kredilerini değiştirmesini engelliyor. Doğru.

-- 6) Denetim: RLS aktif olmayan tablo kalmadığını doğrula (bu bir SQL uyarısıdır)
do $$
declare
  r record;
begin
  for r in (
    select c.relname as tablename 
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' 
      and c.relkind = 'r' -- Sadece normal tablolar
      and c.relname not in ('schema_migrations', 'spatial_ref_sys') 
      and c.relrowsecurity = false
  ) loop
    raise notice 'UYARI: % tablosunda RLS aktif değil!', r.tablename;
  end loop;
end $$;
