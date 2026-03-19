-- Clinic Settings Table
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Mesaj Şablonları
    message_templates jsonb DEFAULT '{
        "REMINDER": "Sayın {patient_name}, bugün saat {appointment_time}''da randevunuz bulunmaktadır. Lütfen randevu saatinden 10 dakika önce kliniğimizde olunuz.",
        "SATISFACTION": "Sayın {patient_name}, bugün kliniğimizde gerçekleştirdiğiniz işlem sonrası memnuniyetinizi merak ediyoruz. Bize vakit ayırdığınız için teşekkür ederiz.",
        "PAYMENT": "Sayın {patient_name}, bugün vadesi gelen {amount} TL tutarındaki ödemenizi hatırlatmak isteriz."
    }'::jsonb,

    -- Bildirim Aktif/Pasif Ayarları
    notification_settings jsonb DEFAULT '{
        "is_reminder_enabled": true,
        "is_satisfaction_enabled": true,
        "is_payment_enabled": true
    }'::jsonb,

    -- Zamanlama Ayarları
    assistant_timings jsonb DEFAULT '{
        "REMINDER": { "value": 3, "unit": "hours", "reference": "before_start" },
        "SATISFACTION": { "value": 15, "unit": "minutes", "reference": "after_end" },
        "PAYMENT": { "value": 0, "unit": "days", "reference": "on_due_date" }
    }'::jsonb,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics can view their own settings"
    ON public.clinic_settings FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their own clinic settings"
    ON public.clinic_settings FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Admins can insert their own clinic settings"
    ON public.clinic_settings FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'SUPER_ADMIN')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_clinic_settings_updated_at
    BEFORE UPDATE ON public.clinic_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed existing clinics with default settings
INSERT INTO public.clinic_settings (clinic_id)
SELECT id FROM public.clinics
ON CONFLICT (clinic_id) DO NOTHING;

-- Trigger to create settings for new clinics automatically
CREATE OR REPLACE FUNCTION public.trig_create_clinic_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.clinic_settings (clinic_id)
    VALUES (NEW.id)
    ON CONFLICT (clinic_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_create_clinic_settings_on_insert
    AFTER INSERT ON public.clinics
    FOR EACH ROW EXECUTE FUNCTION public.trig_create_clinic_settings();
