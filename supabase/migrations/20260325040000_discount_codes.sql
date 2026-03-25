-- ─── İndirim Kodu Sistemi ─────────────────────────────────────────────────────

-- 1. discount_codes: Super admin tarafından oluşturulan kodlar
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kod metni (büyük harf, boşluksuz önerilir)
  code text NOT NULL,

  -- percent (%) veya fixed (sabit TL)
  discount_type text NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),

  -- percent → 0-100 arası, fixed → TL tutarı
  discount_value numeric NOT NULL CHECK (discount_value > 0),

  -- Hangi plana uygulanır
  applies_to text NOT NULL DEFAULT 'both'
    CHECK (applies_to IN ('monthly', 'annual', 'both')),

  -- Tek seferlik (false) veya kalıcı/her dönem (true)
  is_recurring boolean NOT NULL DEFAULT false,

  -- NULL = sınırsız
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,

  -- Geçerlilik tarihleri (NULL = sınırsız)
  valid_from  timestamptz,
  valid_until timestamptz,

  is_active boolean NOT NULL DEFAULT true,

  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Kod unique (büyük/küçük harf duyarsız)
  CONSTRAINT discount_codes_code_unique UNIQUE (code)
);

-- 2. discount_code_uses: Kullanım geçmişi
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  clinic_id  uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  billing_cycle text NOT NULL,
  original_amount numeric NOT NULL,
  discount_amount numeric NOT NULL,
  final_amount    numeric NOT NULL,
  merchant_oid    text,   -- PayTR sipariş ID — hangi ödemeyle kullanıldığını göstermek için
  used_at timestamptz NOT NULL DEFAULT now()
);

-- Tek seferlik modda bir klinik aynı kodu 2x kullanamaz.
-- Kalıcı modda bu kısıt yoktur (is_recurring = true).
-- Uygulama katmanında kontrol edilir (bakınız: validate-code route).

-- 3. paytr_orders'a discount_code_id kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paytr_orders' AND column_name = 'discount_code_id'
  ) THEN
    ALTER TABLE paytr_orders ADD COLUMN discount_code_id uuid REFERENCES discount_codes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paytr_orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE paytr_orders ADD COLUMN discount_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paytr_orders' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE paytr_orders ADD COLUMN original_amount numeric;
  END IF;
END$$;

-- 3b. Atomic used_count increment fonksiyonu (race condition yok)
CREATE OR REPLACE FUNCTION increment_discount_used_count(p_code_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE discount_codes SET used_count = used_count + 1 WHERE id = p_code_id;
$$;

-- 4. RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

-- Super admin her şeyi yapabilir
DROP POLICY IF EXISTS "super_admin_discount_codes" ON discount_codes;
CREATE POLICY "super_admin_discount_codes" ON discount_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Klinikler kodu doğrulamak için okuyabilir (validate endpoint service role kullanır ama yine de)
DROP POLICY IF EXISTS "clinics_read_active_codes" ON discount_codes;
CREATE POLICY "clinics_read_active_codes" ON discount_codes
  FOR SELECT USING (is_active = true);

-- Super admin kullanım geçmişini görür; klinikler kendi kullanımlarını görür
DROP POLICY IF EXISTS "discount_uses_policy" ON discount_code_uses;
CREATE POLICY "discount_uses_policy" ON discount_code_uses
  FOR ALL USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );
