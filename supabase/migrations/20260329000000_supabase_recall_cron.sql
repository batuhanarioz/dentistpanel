-- =========================================================
-- Supabase Doğrudan Recall (Geri Çağırma) Cron Migration
-- =========================================================

-- 1) Güvenlik için pg_cron eklentisini açıyoruz
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Günlük Geri Çağırma (Recall) Kuyruğunu dolduracak fonksiyonu tanımlıyoruz
CREATE OR REPLACE FUNCTION public.generate_daily_recalls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vercel üzerinde döngüyle yapılan işlemi tek bir INSERT INTO ... SELECT sorgusuna indirgiyoruz.
  -- Bu sorgu, veritabanı motoru seviyesinde çalıştığı için milyonlarca veride bile anında (milisaniyeler içinde) biter!
  
  INSERT INTO public.recall_queue (
    clinic_id,
    patient_id,
    appointment_id,
    treatment_type,
    last_treatment_date,
    recall_due_at
  )
  SELECT 
    a.clinic_id,
    a.patient_id,
    a.id AS appointment_id,
    a.treatment_type,
    a.starts_at::date AS last_treatment_date,
    (a.starts_at::date + (t.recall_interval_days * interval '1 day'))::date AS recall_due_at
  FROM public.appointments a
  JOIN public.clinics c ON a.clinic_id = c.id
  JOIN public.treatment_definitions t 
    ON a.clinic_id = t.clinic_id AND LOWER(TRIM(a.treatment_type)) = LOWER(TRIM(t.name))
  WHERE c.subscription_status IN ('active', 'trial') 
    AND a.status = 'completed'
    AND a.patient_id IS NOT NULL 
    AND a.treatment_type IS NOT NULL 
    AND a.treatment_type <> ''
    AND a.starts_at >= NOW() - INTERVAL '2 years'
    AND t.recall_interval_days IS NOT NULL
    AND (a.starts_at::date + (t.recall_interval_days * interval '1 day'))::date <= current_date
  ON CONFLICT (clinic_id, appointment_id) DO NOTHING;

END;
$$;

-- 3) Fonksiyonu her gün UTC ile 07:00'da (Türkiye saati ile 10:00'da) çalışacak şekilde tarifelendiriyoruz
SELECT cron.schedule(
    'generate_daily_recalls_cron',
    '0 7 * * *',
    'SELECT public.generate_daily_recalls()'
);
