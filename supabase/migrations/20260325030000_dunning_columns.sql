-- ─── Dunning (Ödeme Yeniden Deneme) Altyapısı ───────────────────────────────

-- 1. clinics tablosuna dunning kolonları ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'dunning_started_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN dunning_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE clinics ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'last_retry_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN last_retry_at timestamptz;
  END IF;
END$$;

-- subscription_status'a yeni değerler:
--  'past_due'   → ödeme başarısız, grace period devam ediyor
--  'restricted' → kısıtlı erişim (gün 14+)
--  'canceled'   → tamamen iptal (gün 21+)
-- (Mevcut CHECK constraint varsa DROP/RE-CREATE gerekir — tablo yapısına göre uygula)

-- 2. dunning_events: Tüm dunning aksiyonlarının audit trail'i
--    Platform admin bu tablodan hangi klinikle ne olduğunu görebilir.
CREATE TABLE IF NOT EXISTS dunning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  -- 'payment_failed' | 'retry_attempted' | 'retry_succeeded' | 'retry_failed'
  -- | 'access_restricted' | 'subscription_canceled' | 'notification_sent'
  event_type text NOT NULL,
  days_overdue integer,
  retry_count integer,
  merchant_oid text,
  whatsapp_sent boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dunning_events ENABLE ROW LEVEL SECURITY;

-- Yalnızca SUPER_ADMIN okuyabilir / yazabilir (tüm işlemler service role ile)
DROP POLICY IF EXISTS "super_admin_dunning_events" ON dunning_events;
CREATE POLICY "super_admin_dunning_events" ON dunning_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );
