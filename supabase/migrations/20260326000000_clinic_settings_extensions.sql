-- ============================================================
-- clinic_settings: booking_rules + billing_settings JSONB kolonları
-- ============================================================

-- booking_rules: randevu rezervasyon kuralları
ALTER TABLE public.clinic_settings
    ADD COLUMN IF NOT EXISTS booking_rules JSONB NOT NULL DEFAULT '{
        "min_advance_hours": 0,
        "max_advance_days": 90,
        "slot_duration_minutes": 30,
        "max_concurrent": 1,
        "require_approval": false
    }'::jsonb;

-- billing_settings: ödeme ve faturalama ayarları
ALTER TABLE public.clinic_settings
    ADD COLUMN IF NOT EXISTS billing_settings JSONB NOT NULL DEFAULT '{
        "default_vat_rate": 8,
        "accepted_payment_methods": ["Nakit", "Kredi Kartı", "Havale / EFT"],
        "payment_due_days": 30,
        "invoice_footer": ""
    }'::jsonb;
