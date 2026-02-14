-- =========================================================
-- Üyelik Paketleri ve Klinik Abonelik Altyapısı
-- =========================================================

-- 1) Paket tanımları (Starter, Pro, Enterprise)
create table if not exists public.subscription_plans (
  id text primary key, -- 'starter', 'pro', 'enterprise'
  name text not null,
  features jsonb not null default '{}'::jsonb,
  monthly_price numeric not null default 0,
  max_users int,
  max_patients int,
  has_ai_features boolean default false,
  created_at timestamptz not null default now()
);

-- 2) Varsayılan paketleri ekle
insert into public.subscription_plans (id, name, features, monthly_price, max_users, max_patients, has_ai_features)
values 
  ('starter', 'Starter', '{"whatsapp_reminders": false, "reports": "basic"}'::jsonb, 0, 2, 500, false),
  ('pro', 'Pro', '{"whatsapp_reminders": true, "reports": "advanced", "ai_assistant": true}'::jsonb, 500, 10, 5000, true),
  ('enterprise', 'Enterprise', '{"whatsapp_reminders": true, "reports": "full", "ai_assistant": true, "custom_features": true}'::jsonb, 1500, 999, 999999, true)
on conflict (id) do nothing;

-- 3) Klinikler tablosuna yeni alanlar ekle
alter table public.clinics 
add column if not exists plan_id text references public.subscription_plans(id) default 'starter',
add column if not exists credits int not null default 0,
add column if not exists trial_ends_at timestamptz;

-- 4) RLS (subscription_plans tablosu için)
alter table public.subscription_plans enable row level security;

create policy "subscription_plans_select_all"
on public.subscription_plans for select using (true);

create policy "subscription_plans_modify_super_admin"
on public.subscription_plans for all using (
  public.current_user_is_super_admin()
) with check (
  public.current_user_is_super_admin()
);
