-- =========================================================
-- Örnek veri kontrolü – seed_sample_data.sql çalıştırdıktan sonra
-- Supabase SQL Editor'de bu dosyayı çalıştırın.
-- =========================================================

-- 1) Sayılar (tek klinik için)
SELECT
  (SELECT count(*) FROM public.patients WHERE clinic_id = c.id) AS hasta_sayisi,
  (SELECT count(*) FROM public.appointments WHERE clinic_id = c.id) AS randevu_sayisi,
  (SELECT count(*) FROM public.payments WHERE clinic_id = c.id) AS odeme_sayisi
FROM public.clinics c
LIMIT 1;
-- Beklenen: 20, 12, 10

-- 2) Randevu tarih dağılımı (geçen hafta / bu hafta / gelecek hafta)
SELECT
  status,
  date_trunc('week', starts_at::date)::date AS hafta_baslangic,
  count(*) AS adet
FROM public.appointments
WHERE clinic_id = (SELECT id FROM public.clinics LIMIT 1)
GROUP BY status, date_trunc('week', starts_at::date)
ORDER BY hafta_baslangic, status;

-- 3) Ödeme durumları
SELECT status, count(*) AS adet, sum(amount) AS toplam_tutar
FROM public.payments
WHERE clinic_id = (SELECT id FROM public.clinics LIMIT 1)
GROUP BY status
ORDER BY status;

-- 4) Son 7 + gelecek 14 gün randevu listesi (kısa özet)
SELECT
  p.full_name,
  a.starts_at::date AS tarih,
  a.starts_at::time(0) AS saat,
  a.status,
  a.treatment_type
FROM public.appointments a
JOIN public.patients p ON p.id = a.patient_id
WHERE a.clinic_id = (SELECT id FROM public.clinics LIMIT 1)
  AND a.starts_at::date BETWEEN current_date - 7 AND current_date + 14
ORDER BY a.starts_at;
