-- NextGency Diş Kliniği için tek-klinik şema ve temel RLS iskeleti

-- Kullanıcı rolleri
create type public.user_role as enum (
  'ADMIN',
  'DOCTOR',
  'ASSISTANT',
  'RECEPTION',
  'FINANCE'
);

-- Uygulama kullanıcıları (Supabase auth.users ile eşleşecek)
create table if not exists public.users (
  id uuid primary key, -- auth.users.id
  full_name text,
  email text,
  role public.user_role not null default 'ASSISTANT',
  created_at timestamptz not null default now()
);

-- Hastalar
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- TC Kimlik No (opsiyonel)
alter table public.patients
  add column if not exists tc_identity_no text;

-- Randevular
create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'no_show',
  'completed'
);

create type public.appointment_channel as enum (
  'whatsapp',
  'web',
  'phone',
  'walk_in'
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid references public.users(id),
  channel public.appointment_channel not null default 'web',
  status public.appointment_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- Ek randevu alanları (zaman içinde genişletme)
alter table public.appointments
  add column if not exists treatment_type text,
  add column if not exists patient_note text,
  add column if not exists internal_note text,
  add column if not exists contact_preference text,
  add column if not exists reminder_minutes_before int,
  add column if not exists tags text[],
  add column if not exists source_conversation_id text,
  add column if not exists source_message_id text,
  add column if not exists estimated_amount numeric;

-- Çakışan randevuları engellemek için örnek constraint (doktor bazlı)
alter table public.appointments
  add constraint appointments_time_check
  check (starts_at < ends_at);

-- Basit indexler
create index if not exists idx_appointments_clinic_date
  on public.appointments (starts_at);

create index if not exists idx_patients_clinic_name
  on public.patients (full_name);

-- =========================================================
-- RLS ve güvenlik iskeleti
-- =========================================================

-- RLS aktif et (tek klinik; tüm authenticated kullanıcılar aynı kliniğin iç ekibi olarak düşünülür)
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

-- Ödemeler (randevu ile ilişkili ancak ayrı tabloda tutulur)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  amount numeric not null,
  method text,
  status text, -- örn. 'paid', 'partial', 'unpaid'
  note text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

-- Yardımcı fonksiyonlar
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'ADMIN'
  );
$$;

-- users: tüm authenticated kullanıcılar kullanıcı listesini görebilir
create policy "users_select_authenticated"
on public.users
for select
using (
  auth.role() = 'authenticated'
);

-- users: sadece admin yeni kullanıcı oluşturabilir
create policy "users_insert_admin"
on public.users
for insert
with check (
  public.current_user_is_admin()
);

-- users: sadece admin kullanıcı güncelleyebilir
create policy "users_update_admin"
on public.users
for update
using (
  public.current_user_is_admin()
)
with check (
  public.current_user_is_admin()
);

-- users: sadece admin kullanıcı silebilir, ADMIN hesaplar silinemez
create policy "users_delete_admin"
on public.users
for delete
using (
  public.current_user_is_admin() and role <> 'ADMIN'
);

-- patients: tüm authenticated kullanıcılar hastaları görebilir
create policy "patients_select_authenticated"
on public.patients
for select
using (
  auth.role() = 'authenticated'
);

-- patients: tüm authenticated kullanıcılar hasta oluşturup güncelleyebilir (isteğe göre daraltılabilir)
create policy "patients_write_authenticated"
on public.patients
for all
using (
  auth.role() = 'authenticated'
)
with check (
  auth.role() = 'authenticated'
);

-- appointments: tüm authenticated kullanıcılar randevuları görebilir
create policy "appointments_select_authenticated"
on public.appointments
for select
using (
  auth.role() = 'authenticated'
);

-- appointments: tüm authenticated kullanıcılar randevu oluşturup güncelleyebilir (isteğe göre doktor/resepsiyon ile sınırlandırılabilir)
create policy "appointments_write_authenticated"
on public.appointments
for all
using (
  auth.role() = 'authenticated'
)
with check (
  auth.role() = 'authenticated'
);

-- payments: tüm authenticated kullanıcılar ödemeleri görebilir ve yönetebilir
create policy "payments_select_authenticated"
on public.payments
for select
using (
  auth.role() = 'authenticated'
);

create policy "payments_write_authenticated"
on public.payments
for all
using (
  auth.role() = 'authenticated'
)
with check (
  auth.role() = 'authenticated'
);

