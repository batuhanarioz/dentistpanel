-- =========================================================
-- Hasta Detaylarını Zenginleştirme (Ek Alanlar)
-- =========================================================

-- 1) Kolonları Ekle (Eğer yoksa)
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS blood_group text,
ADD COLUMN IF NOT EXISTS occupation text;

-- 2) Açıklama Ekle (İsteğe bağlı, dökümantasyon amaçlı)
COMMENT ON COLUMN public.patients.gender IS 'Hastanın cinsiyeti';
COMMENT ON COLUMN public.patients.address IS 'Hastanın açık adresi';
COMMENT ON COLUMN public.patients.blood_group IS 'Hastanın kan grubu';
COMMENT ON COLUMN public.patients.occupation IS 'Hastanın mesleği';
