-- Platform Settings: Global platform configuration (pricing, trial days, etc.)
CREATE TABLE IF NOT EXISTS platform_settings (
  id text PRIMARY KEY DEFAULT 'global',
  monthly_price numeric NOT NULL DEFAULT 1499,
  annual_price numeric NOT NULL DEFAULT 14990,
  trial_days integer NOT NULL DEFAULT 7,
  sms_addon_price numeric NOT NULL DEFAULT 399,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default row
INSERT INTO platform_settings (id, monthly_price, annual_price, trial_days, sms_addon_price)
VALUES ('global', 1499, 14990, 7, 399)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only super admins can read/write
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_full" ON platform_settings;
CREATE POLICY "super_admin_full" ON platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Announcements: Platform-wide or clinic-specific notices
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'success')),
  target_clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Clinics can read announcements targeted to them or all
DROP POLICY IF EXISTS "read_own_announcements" ON announcements;
CREATE POLICY "read_own_announcements" ON announcements
  FOR SELECT USING (
    target_clinic_id IS NULL
    OR target_clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Only super admins can insert/update/delete
DROP POLICY IF EXISTS "super_admin_manage_announcements" ON announcements;
CREATE POLICY "super_admin_manage_announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Announcement Reads: Track which users read which announcements
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reads
DROP POLICY IF EXISTS "users_insert_own_reads" ON announcement_reads;
CREATE POLICY "users_insert_own_reads" ON announcement_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can read their own, super admins can read all
DROP POLICY IF EXISTS "users_read_reads" ON announcement_reads;
CREATE POLICY "users_read_reads" ON announcement_reads
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );
