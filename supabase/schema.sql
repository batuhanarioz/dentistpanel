-- =========================================================
-- Multi-Tenant Diş Kliniği Paneli – Sıfırdan Şema
-- Supabase SQL Editor'de çalıştırılacak
-- =========================================================

-- 1) Kullanıcı rolleri (SUPER_ADMIN dahil)
create type public.user_role as enum (
  'SUPER_ADMIN',
  'ADMIN',
  'ADMIN_DOCTOR',
  'DOCTOR',
  'ASSISTANT',
  'RECEPTION',
  'FINANCE'
);

-- 2) Randevu durumları
create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'no_show',
  'completed'
);

-- 3) Randevu kanalları
create type public.appointment_channel as enum (
  'whatsapp',
  'web',
  'phone',
  'walk_in'
);

-- =========================================================
-- TABLOLAR
-- =========================================================

-- 4) Klinikler (ana tablo)
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text,
  email text,
  address text,
  logo_url text,
  is_active boolean not null default true,
  -- Çalışma günleri ve saatleri (JSONB)
  -- Örnek: {"monday":{"open":"09:00","close":"19:00","enabled":true}, ...}
  working_hours jsonb not null default '{
    "monday":    {"open":"09:00","close":"19:00","enabled":true},
    "tuesday":   {"open":"09:00","close":"19:00","enabled":true},
    "wednesday": {"open":"09:00","close":"19:00","enabled":true},
    "thursday":  {"open":"09:00","close":"19:00","enabled":true},
    "friday":    {"open":"09:00","close":"19:00","enabled":true},
    "saturday":  {"open":"09:00","close":"14:00","enabled":false},
    "sunday":    {"open":"09:00","close":"14:00","enabled":false}
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- 5) Uygulama kullanıcıları
create table if not exists public.users (
  id uuid primary key, -- auth.users.id ile eşleşir
  clinic_id uuid references public.clinics(id) on delete set null, -- SUPER_ADMIN için NULL
  full_name text,
  email text,
  role public.user_role not null default 'ASSISTANT',
  created_at timestamptz not null default now()
);

-- 6) Hastalar
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birth_date date,
  tc_identity_no text,
  allergies text,
  medical_alerts text,
  notes text,
  created_at timestamptz not null default now()
);

-- 7) Randevular
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid references public.users(id),
  channel public.appointment_channel not null default 'web',
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  treatment_type text,
  patient_note text,
  internal_note text,
  treatment_note text,
  contact_preference text,
  reminder_minutes_before int,
  tags text[],
  source_conversation_id text,
  source_message_id text,
  estimated_amount numeric,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint appointments_time_check check (starts_at < ends_at)
);

-- 8) Ödemeler
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  amount numeric not null,
  method text,
  status text, -- 'paid', 'partial', 'planned', 'cancelled'
  note text,
  due_date date,
  created_at timestamptz not null default now()
);

-- =========================================================
-- İNDEXLER
-- =========================================================

create index if not exists idx_users_clinic on public.users (clinic_id);
create index if not exists idx_patients_clinic on public.patients (clinic_id);
create index if not exists idx_patients_clinic_name on public.patients (clinic_id, full_name);
create index if not exists idx_appointments_clinic on public.appointments (clinic_id);
create index if not exists idx_appointments_clinic_date on public.appointments (clinic_id, starts_at);
create index if not exists idx_payments_clinic on public.payments (clinic_id);
create index if not exists idx_payments_clinic_due on public.payments (clinic_id, due_date);

-- =========================================================
-- RLS AKTİF ET
-- =========================================================

alter table public.clinics enable row level security;
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;

-- =========================================================
-- YARDIMCI FONKSİYONLAR
-- =========================================================

-- Mevcut kullanıcının id'si
create or replace function public.current_user_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- Mevcut kullanıcının clinic_id'si
-- SECURITY DEFINER: users tablosundaki RLS döngüsünü önler
create or replace function public.current_user_clinic_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select clinic_id from public.users where id = auth.uid();
$$;

-- Mevcut kullanıcı SUPER_ADMIN mi?
-- SECURITY DEFINER: users tablosundaki RLS döngüsünü önler
create or replace function public.current_user_is_super_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'SUPER_ADMIN'
  );
$$;

-- Mevcut kullanıcı ADMIN, ADMIN_DOCTOR veya SUPER_ADMIN mi?
-- SECURITY DEFINER: users tablosundaki RLS döngüsünü önler
create or replace function public.current_user_is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
  );
$$;

-- =========================================================
-- RLS POLİTİKALARI
-- =========================================================

-- ─── clinics ───
create policy "clinics_select"
on public.clinics for select using (
  public.current_user_is_super_admin()
  or id = public.current_user_clinic_id()
);

create policy "clinics_insert_super_admin"
on public.clinics for insert with check (
  public.current_user_is_super_admin()
);

create policy "clinics_update_super_admin"
on public.clinics for update using (
  public.current_user_is_super_admin()
) with check (
  public.current_user_is_super_admin()
);

create policy "clinics_delete_super_admin"
on public.clinics for delete using (
  public.current_user_is_super_admin()
);

-- ─── users ───
-- Kendi klinik kullanıcılarını görebilir, SUPER_ADMIN hepsini görebilir
create policy "users_select"
on public.users for select using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
  or id = auth.uid()
);

-- Sadece ADMIN veya SUPER_ADMIN yeni kullanıcı oluşturabilir
create policy "users_insert_admin"
on public.users for insert with check (
  public.current_user_is_admin()
);

-- Sadece ADMIN veya SUPER_ADMIN kullanıcı güncelleyebilir (veya kullanıcı kendini)
create policy "users_update"
on public.users for update using (
  public.current_user_is_admin() or id = auth.uid()
) with check (
  public.current_user_is_admin() or id = auth.uid()
);

-- Sadece ADMIN veya SUPER_ADMIN kullanıcı silebilir
create policy "users_delete_admin"
on public.users for delete using (
  public.current_user_is_admin() and role not in ('ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN')
);

-- ─── patients ───
create policy "patients_select"
on public.patients for select using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

create policy "patients_write"
on public.patients for all using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
) with check (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

-- ─── appointments ───
create policy "appointments_select"
on public.appointments for select using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

create policy "appointments_write"
on public.appointments for all using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
) with check (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

-- ─── payments ───
create policy "payments_select"
on public.payments for select using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

create policy "payments_write"
on public.payments for all using (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
) with check (
  public.current_user_is_super_admin()
  or clinic_id = public.current_user_clinic_id()
);

-- =========================================================
-- OTOMATİK clinic_id TRIGGER'I
-- Client-side INSERT'lerde clinic_id NULL gönderilirse
-- oturumdaki kullanıcının clinic_id'si atanır.
-- =========================================================

create or replace function public.auto_set_clinic_id()
returns trigger
language plpgsql
as $$
begin
  if new.clinic_id is null then
    new.clinic_id := public.current_user_clinic_id();
  end if;
  return new;
end;
$$;

create trigger trg_patients_clinic_id
  before insert on public.patients
  for each row execute function public.auto_set_clinic_id();

create trigger trg_appointments_clinic_id
  before insert on public.appointments
  for each row execute function public.auto_set_clinic_id();

create trigger trg_payments_clinic_id
  before insert on public.payments
  for each row execute function public.auto_set_clinic_id();
