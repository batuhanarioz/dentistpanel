-- =========================================================
-- Otomasyon Kontrol Alanları
-- =========================================================

-- 1) Klinikler tablosuna otomasyon kontrolü için alan ekle
alter table public.clinics 
add column if not exists automations_enabled boolean not null default false,
add column if not exists n8n_workflow_id text; -- Eğer her kliniğin ayrı workflowu varsa veya API üzerinden kontrol edilecekse

-- 2) Mevcut klinikler için varsayılan olarak kapalı (güvenlik için)
update public.clinics set automations_enabled = false where automations_enabled is null;
