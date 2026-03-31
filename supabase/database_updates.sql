-- Dentist Panel - Yeni Özellikler İçin Veritabanı Güncellemeleri

-- 1. Randevu Modu (Vibe Check)
-- Randevunun hangi ruh haliyle (emoji) geçeceğini/geçtiğini tutmak için
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS patient_mood text;

-- 2. Tedavi Planları Veya İlgili Tablo (Gerekliyse)
-- Tedavi planının alt adımlarını (Cerrahi, Ölçü, Teslimat vb.) tutmak için
-- Eğer treatment_plans tablosu mevcutsa bu kolonu ekler
ALTER TABLE public.treatment_plans 
ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]'::jsonb;

-- NOT: Bu SQL komutlarını Supabase Dashboard -> SQL Editor kısmında çalıştırabilirsiniz.
