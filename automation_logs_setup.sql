-- Otomasyon Logları Tablo Yapısı
-- Bu kodu Supabase SQL Editor'de çalıştırarak tabloyu oluşturabilirsiniz.

CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL,
    automation_id TEXT NOT NULL,
    patient_id UUID,
    appointment_id UUID,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    message_content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KENDİ KLİNİK ID'NİZ VE MOCK RANDVEULAR:
-- Panelde "de4fe7ed-ab8c-4360-97a3-06fbb93593e7" klinik id'sine uygun örnekler.
-- Gerçek bir kullanım için sisteminizden 1-2 gerçek id eklendi.

INSERT INTO public.automation_logs (clinic_id, automation_id, patient_id, appointment_id, patient_name, patient_phone, message_content, sent_at)
VALUES 
    (
        'de4fe7ed-ab8c-4360-97a3-06fbb93593e7', 
        'wa_appointment_reminder', 
        'fa55e882-3bc2-4dde-b3ec-b63bf65a123f', -- Örnek / Yaklaşık ID
        '0f8164ee-42c0-475b-8d87-b9f3743e1bcd', 
        'Ahmet Yılmaz', 
        '+905551234567', 
        'Sayın Ahmet Yılmaz, yarın saat 15:00 tarihindeki diş hekimi randevunuzu hatırlatır, sağlıklı günler dileriz.', 
        NOW() - INTERVAL '1 day'
    ),
    (
        'de4fe7ed-ab8c-4360-97a3-06fbb93593e7', 
        'wa_appointment_reminder', 
        '8f5c1a28-9ea2-4b69-b6bc-dde0064a34b2', 
        '35bbe4a0-91c7-4e5a-b3f4-6455e2caad1a', 
        'Ayşe Demir', 
        '+905559876543', 
        'Sayın Ayşe Demir, yarın saat 10:00 tarihindeki randevunuzu hatırlatırız. Lütfen 15 dakika erken geliniz.', 
        NOW()
    ),
    (
        'de4fe7ed-ab8c-4360-97a3-06fbb93593e7', 
        'wa_payment_reminder', 
        'b8b64fba-0b49-4495-acfa-5121021bc088', 
        '42301865-bcdd-462f-8066-3373e0d92ab0', 
        'Can Kılıç', 
        '+905551112233', 
        'Sayın Can Kılıç, kliniğimize ait ödenmemiş bakiyeniz bulunmaktadır. Detaylar için iletişime geçebilirsiniz.', 
        NOW() - INTERVAL '3 days'
    ),
    (
        'de4fe7ed-ab8c-4360-97a3-06fbb93593e7', 
        'wa_post_appointment', 
        NULL, 
        NULL, 
        'Fatma Kaya', 
        '+905552223344', 
        'Sayın Fatma Kaya, tedavinizi tamamladığınız için teşekkür ederiz. Nasıl hissettiğinizi bize bildirebilirsiniz.', 
        NOW() - INTERVAL '5 days'
    );

-- Row Level Security (RLS) politikalarını aktif ediyoruz
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Okuma ve Yazma yetkilerini basitçe açıyoruz (Projenize özel RLS kurallarınız varsa buna göre güncelleyebilirsiniz)
CREATE POLICY "Enable read access for authenticated users" ON public.automation_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.automation_logs FOR INSERT WITH CHECK (true);
