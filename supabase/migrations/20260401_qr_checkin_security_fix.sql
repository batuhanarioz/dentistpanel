-- =============================================================================
-- QR Check-in Güvenlik Düzeltmeleri
-- =============================================================================
-- 1. checkin_codes: Anonim doğrudan tablo erişimi kaldırıldı → API route üzerinden
-- 2. checkin_codes: Staff politikası sadece kendi kliniğiyle kısıtlandı
-- 3. checkin_codes: used_at kolonu eklendi (kod kullanıldıktan sonra geçersiz)
-- 4. patient_anamnesis: Anonim write erişimi kaldırıldı → API route üzerinden
-- 5. patient_anamnesis: UNIQUE constraint güvenli şekilde (dedup sonrası) eklendi
-- =============================================================================

-- ── checkin_codes: used_at kolonu ────────────────────────────────────────────
ALTER TABLE public.checkin_codes
    ADD COLUMN IF NOT EXISTS used_at timestamptz DEFAULT NULL;

-- ── checkin_codes: Mevcut hatalı politikaları kaldır ─────────────────────────
DROP POLICY IF EXISTS "Checkin codes are viewable by clinic staff" ON public.checkin_codes;
DROP POLICY IF EXISTS "Checkin codes are manageable by clinic staff" ON public.checkin_codes;
DROP POLICY IF EXISTS "Public can lookup checkin codes" ON public.checkin_codes;

-- ── checkin_codes: Yeni doğru politikalar ────────────────────────────────────
-- Authenticated kullanıcı sadece KENDİ kliniğinin kodlarını görebilir
CREATE POLICY "checkin_codes_staff_select" ON public.checkin_codes
    FOR SELECT TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
        )
    );

-- Authenticated kullanıcı sadece KENDİ kliniği için kod üretebilir / silebilir
CREATE POLICY "checkin_codes_staff_all" ON public.checkin_codes
    FOR ALL TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
        )
    );

-- Anonim kullanıcı artık doğrudan tabloya ERIŞEMEZ.
-- Tüm public check-in işlemleri /api/checkin/* route'ları üzerinden
-- supabaseAdmin (service role) ile yapılır.

-- ── patient_anamnesis: Anonim write politikasını kaldır ──────────────────────
-- (Eğer daha önce eklenmişse)
DROP POLICY IF EXISTS "Public can insert anamnesis" ON public.patient_anamnesis;
DROP POLICY IF EXISTS "Public can update anamnesis" ON public.patient_anamnesis;
DROP POLICY IF EXISTS "Anon can write anamnesis" ON public.patient_anamnesis;

-- ── patient_anamnesis: UNIQUE constraint güvenli ekleme ──────────────────────
-- Önce mevcut tekrarları temizle (varsa en son güncellenen kaydı tut)
DELETE FROM public.patient_anamnesis
WHERE id NOT IN (
    SELECT DISTINCT ON (patient_id) id
    FROM public.patient_anamnesis
    ORDER BY patient_id, updated_at DESC NULLS LAST
);

-- Constraint yoksa ekle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'patient_anamnesis_patient_id_key'
    ) THEN
        ALTER TABLE public.patient_anamnesis
            ADD CONSTRAINT patient_anamnesis_patient_id_key UNIQUE (patient_id);
    END IF;
END $$;

-- ── checkin_codes: Süresi dolan kodları temizle ──────────────────────────────
-- (Mevcut birikmiş eski kayıtlar)
DELETE FROM public.checkin_codes
WHERE expires_at < now() - interval '7 days';
