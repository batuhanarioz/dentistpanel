-- ==============================================================================
-- 🔗 1) Eksik Yabancı Anahtar İndekslerini Ekle
-- İlişkili tablolarda (JOIN veya WHERE app_id =) sorgu performansını artırır.
-- ==============================================================================

-- Ödemeler tablosunda randevu ve hasta filtreleri için
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Randevular tablosunda doktor ve hasta filtreleri için
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);

-- Checklist items tablosunda randevu üzerinden toplu işlem yapıldığı için
CREATE INDEX IF NOT EXISTS idx_checklist_items_appointment_id ON public.checklist_items(appointment_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status_definition ON public.checklist_items(status, definition_id);

-- ==============================================================================
-- 🔍 2) Akıllı Arama Optimizasyonu (pg_trgm)
-- ilike %term% aramalarını hızlandırmak için Trigram GIN indeksi.
-- ==============================================================================

-- Gerekli eklentiyi aktifleştir (Supabase'de genellikle açıktır ama garantiye alalım)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Hasta adı ve telefonuna göre hızlı arama için (ilike %..% desteği)
CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm ON public.patients USING gin (phone gin_trgm_ops);

-- ==============================================================================
-- 🛡️ 3) Güvenlik & Veri Tutarlılığı
-- patients tablosunda clinic_id + phone benzersizliği (opsiyonel ama önerilir)
-- Tekrar eden hasta kaydını (duplicate) veritabanı seviyesinde önler.
-- ==============================================================================

-- Not: Mevcut verilerde mükerrerlik varsa bu hata verebilir, o yüzden sadece indeks olarak bırakıyoruz.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_unique_clinic_phone ON public.patients(clinic_id, phone);
