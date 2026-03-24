-- ============================================================
-- addon_products: Tüm eklenti ürünlerinin master katalogu
-- SUPER_ADMIN tarafından yönetilir, klinikler okuyabilir
-- ============================================================
create table if not exists addon_products (
    id            uuid        primary key default gen_random_uuid(),
    slug          text        unique not null,
    name          text        not null,
    description   text        not null,
    features      jsonb       not null default '[]',
    price_monthly integer     default null,   -- null = iletişime geç, 0 = pakete dahil
    is_active     boolean     not null default true,
    sort_order    integer     not null default 0,
    gradient      text        not null default 'from-indigo-600 to-violet-700',
    icon          text        not null default 'Zap',
    created_at    timestamptz not null default now()
);

-- ============================================================
-- clinic_addons: Klinik başına görünürlük + aktiflik kontrolü
-- ============================================================
create table if not exists clinic_addons (
    id           uuid        primary key default gen_random_uuid(),
    clinic_id    uuid        not null references clinics(id) on delete cascade,
    addon_id     uuid        not null references addon_products(id) on delete cascade,
    is_visible   boolean     not null default true,
    is_enabled   boolean     not null default false,
    activated_at timestamptz default null,
    created_at   timestamptz not null default now(),
    unique(clinic_id, addon_id)
);

-- ============================================================
-- RLS Politikaları
-- ============================================================
alter table addon_products enable row level security;
alter table clinic_addons   enable row level security;

-- addon_products: aktif olanları herkes okuyabilir
create policy "addon_products_read_active"
    on addon_products for select
    using (is_active = true);

-- addon_products: SUPER_ADMIN tam yetki
create policy "addon_products_super_admin_all"
    on addon_products for all
    using (
        exists (
            select 1 from users
            where id = auth.uid() and role = 'SUPER_ADMIN'
        )
    );

-- clinic_addons: klinik üyesi kendi kayıtlarını okur
create policy "clinic_addons_read_own"
    on clinic_addons for select
    using (
        clinic_id in (
            select clinic_id from users where id = auth.uid()
        )
        or exists (
            select 1 from users where id = auth.uid() and role = 'SUPER_ADMIN'
        )
    );

-- clinic_addons: SUPER_ADMIN tam yetki
create policy "clinic_addons_super_admin_all"
    on clinic_addons for all
    using (
        exists (
            select 1 from users
            where id = auth.uid() and role = 'SUPER_ADMIN'
        )
    );

-- ============================================================
-- Seed: İlk ürün — Akıllı Otomasyon
-- ============================================================
insert into addon_products (slug, name, description, features, price_monthly, sort_order, gradient, icon)
values (
    'smart_automation',
    'Akıllı Otomasyon',
    'Randevu hatırlatmalarını ve ödeme bildirimlerini otomatize ederek zaman kazanın.',
    '["Randevu hatırlatma SMS/WhatsApp", "Hasta memnuniyet anketi", "Ödeme hatırlatma bildirimi"]'::jsonb,
    0,
    1,
    'from-indigo-600 to-violet-700',
    'Zap'
)
on conflict (slug) do nothing;
