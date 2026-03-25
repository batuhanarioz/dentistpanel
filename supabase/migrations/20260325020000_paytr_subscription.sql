-- ─── PayTR Abonelik Altyapısı ────────────────────────────────────────────────
--
-- Bu migrasyon PayTR entegrasyonu için gereken kolonları ve tabloyu ekler.
-- Güvenli (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — tekrar çalıştırılabilir.
--

-- 1. paytr_orders: PayTR sipariş takibi
--    - merchant_oid ile webhook eşleştirmesi yapılır
--    - Her ödeme girişimi (ilk + otomatik yenileme) buraya kaydedilir
CREATE TABLE IF NOT EXISTS paytr_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_oid text NOT NULL UNIQUE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_tl numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  failed_reason text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paytr_orders ENABLE ROW LEVEL SECURITY;

-- Klinikler kendi siparişlerini okuyabilir; yazma yalnızca service role (API)
DROP POLICY IF EXISTS "clinics_read_own_orders" ON paytr_orders;
CREATE POLICY "clinics_read_own_orders" ON paytr_orders
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- 2. payment_history tablosuna PayTR sipariş ID kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_history' AND column_name = 'paytr_order_id'
  ) THEN
    ALTER TABLE payment_history ADD COLUMN paytr_order_id text;
  END IF;
END$$;

-- 3. clinics tablosuna subscription_status kontrolü için gerekli kolon
--    (zaten varsa atla — mevcut veri korunur)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE clinics ADD COLUMN last_payment_date timestamptz;
  END IF;
END$$;
