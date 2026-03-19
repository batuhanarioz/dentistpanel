-- Mevcut veritabanına alerji / tıbbi uyarı ve tedavi sonrası not alanlarını ekler.
-- Sadece kolonlar yoksa eklenir (idempotent).

alter table public.patients
  add column if not exists allergies text,
  add column if not exists medical_alerts text;

alter table public.appointments
  add column if not exists treatment_note text;
