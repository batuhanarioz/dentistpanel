-- Create treatment_definitions table
CREATE TABLE IF NOT EXISTS treatment_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_duration INTEGER NOT NULL DEFAULT 30,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, name)
);

-- Enable RLS
ALTER TABLE treatment_definitions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view treatment definitions for their clinic"
ON treatment_definitions FOR SELECT
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage treatment definitions for their clinic"
ON treatment_definitions FOR ALL
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Seed existing clinics with default treatments
DO $$
DECLARE
    clinic_record RECORD;
BEGIN
    FOR clinic_record IN SELECT id FROM clinics LOOP
        INSERT INTO treatment_definitions (clinic_id, name, default_duration)
        VALUES 
            (clinic_record.id, 'Muayene', 30),
            (clinic_record.id, 'Dolgu', 60),
            (clinic_record.id, 'Kanal Tedavisi', 90),
            (clinic_record.id, 'Diş Temizliği', 45),
            (clinic_record.id, 'Diş Çekimi', 45),
            (clinic_record.id, 'İmplant', 120),
            (clinic_record.id, 'Diş Beyazlatma', 60),
            (clinic_record.id, 'Protez', 90),
            (clinic_record.id, 'Ortodonti Muayene', 30)
        ON CONFLICT (clinic_id, name) DO NOTHING;
    END LOOP;
END $$;
