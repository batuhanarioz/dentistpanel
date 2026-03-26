-- Email log tracking (trial sequence emails)
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_clinic_type ON email_logs(clinic_id, email_type);
