-- Referral system
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES clinics(id);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS referral_reward_given boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  referred_clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE UNIQUE,
  status text DEFAULT 'pending', -- pending | converted | rewarded
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz
);

CREATE INDEX IF NOT EXISTS referral_conversions_referrer ON referral_conversions(referrer_clinic_id);
