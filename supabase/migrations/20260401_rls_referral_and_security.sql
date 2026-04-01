-- ============================================================
-- Migration: RLS Policies — referral_conversions + security
-- Tarih: 2026-04-01
-- ============================================================

-- ── 1. referral_conversions tablosu ────────────────────────────────────────
-- Bu tablo henüz RLS aktif değilse etkinleştir
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri temizle (idempotent)
DROP POLICY IF EXISTS "referral_conversions_select_own"  ON public.referral_conversions;
DROP POLICY IF EXISTS "referral_conversions_insert_self" ON public.referral_conversions;
DROP POLICY IF EXISTS "referral_conversions_update_self" ON public.referral_conversions;

-- SELECT: Klinik kendi gönderdiği veya aldığı conversion'ları görebilir
CREATE POLICY "referral_conversions_select_own"
ON public.referral_conversions
FOR SELECT
USING (
    referrer_clinic_id = (
        SELECT clinic_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
    OR
    referred_clinic_id = (
        SELECT clinic_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
);

-- INSERT: Sadece service_role (API routes) ekleyebilir — anon/authenticated edemez
-- Bu policy yoksa service_role zaten RLS bypass eder; authenticated kullanıcılar yapamaz.
-- Ek güvenlik: authenticated kullanıcı direkt insert yapamaz (sadece register/webhook üzerinden)
CREATE POLICY "referral_conversions_insert_service_only"
ON public.referral_conversions
FOR INSERT
WITH CHECK (false); -- authenticated kullanıcılar doğrudan insert yapamaz; service_role bypass eder

-- UPDATE: Aynı şekilde sadece service_role (webhook) güncelleyebilir
CREATE POLICY "referral_conversions_update_service_only"
ON public.referral_conversions
FOR UPDATE
USING (false); -- service_role bypass eder, authenticated edemez

-- ── 2. appointments.patient_mood — tablo-düzeyinde RLS zaten var ────────────
-- Yeni kolona özel policy gerekmez (satır-düzeyinde izolasyon yapılmış).
-- Doğrulama: appointments tablosunun RLS durumu
-- SELECT'i görmek için Supabase Dashboard -> Table Editor -> appointments -> RLS

-- ── 3. treatment_plans.milestones — aynı şekilde tablo RLS kapsamında ───────
-- treatment_plans tablosunun clinic_id bazlı RLS policy'si varsa milestones korunur.

-- ── 4. platform_settings — sadece SUPER_ADMIN okuyabilmeli ─────────────────
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_super_admin_only" ON public.platform_settings;

-- SUPER_ADMIN'in rol kontrolü app_metadata üzerinden yapılır.
-- Authenticated kullanıcılar platform_settings'i okuyabilir (fiyat bilgisi herkese açık).
-- Ancak UPDATE/DELETE sadece service_role.
CREATE POLICY "platform_settings_read_authenticated"
ON public.platform_settings
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "platform_settings_write_service_only"
ON public.platform_settings
FOR ALL
USING (false)
WITH CHECK (false); -- Tüm yazma işlemleri service_role üzerinden

-- ── 5. paytr_orders — sadece kendi kliniğinin siparişlerini görebilir ───────
ALTER TABLE public.paytr_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paytr_orders_select_own" ON public.paytr_orders;

CREATE POLICY "paytr_orders_select_own"
ON public.paytr_orders
FOR SELECT
USING (
    clinic_id = (
        SELECT clinic_id FROM public.users WHERE id = auth.uid() LIMIT 1
    )
);

CREATE POLICY "paytr_orders_write_service_only"
ON public.paytr_orders
FOR ALL
USING (false)
WITH CHECK (false);

-- ── NOT ──────────────────────────────────────────────────────────────────────
-- Bu migration'ı çalıştırmak için:
-- Supabase Dashboard → SQL Editor → Bu dosyanın içeriğini yapıştır → Run
-- VEYA: supabase db push (CLI kullanıyorsanız)
