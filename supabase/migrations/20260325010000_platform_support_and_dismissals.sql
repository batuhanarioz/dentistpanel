-- Platform Support Requests
CREATE TABLE IF NOT EXISTS platform_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  is_archived boolean NOT NULL DEFAULT false,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_support_requests ENABLE ROW LEVEL SECURITY;

-- Clinics can insert their own support requests
DROP POLICY IF EXISTS "clinics_insert_support" ON platform_support_requests;
CREATE POLICY "clinics_insert_support" ON platform_support_requests
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Super admins can do everything; clinics can read their own
DROP POLICY IF EXISTS "super_admin_all_support" ON platform_support_requests;
CREATE POLICY "super_admin_all_support" ON platform_support_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    OR clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Add admin_note if not exists (safe for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='platform_support_requests' AND column_name='admin_note'
  ) THEN
    ALTER TABLE platform_support_requests ADD COLUMN admin_note text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='platform_support_requests' AND column_name='is_archived'
  ) THEN
    ALTER TABLE platform_support_requests ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
  END IF;
END$$;

-- Platform Activity Dismissals: Track which activities admins have dismissed
CREATE TABLE IF NOT EXISTS platform_activity_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, activity_id)
);

ALTER TABLE platform_activity_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_dismissals" ON platform_activity_dismissals;
CREATE POLICY "admins_manage_dismissals" ON platform_activity_dismissals
  FOR ALL USING (admin_id = auth.uid());
