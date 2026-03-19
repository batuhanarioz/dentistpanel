-- =========================================================
-- Abonelik Paket Kısıtlamaları ve Revize Mesaj Limitleri
-- =========================================================

-- 1) subscription_plans tablosunu yeni kısıtlamalarla güncelle
alter table public.subscription_plans 
add column if not exists max_doctors int default 1,
add column if not exists max_staff int default 3,
add column if not exists monthly_credits int default 0;

-- 2) Paketleri yeniden tanımla (3 Modül zorunluluğu düşünülerek artırılmış krediler)
truncate table public.subscription_plans cascade;

insert into public.subscription_plans (id, name, monthly_price, max_doctors, max_staff, monthly_credits, has_ai_features, features)
values 
  ('trial', 'Free Trial', 0, 1, 3, 100, false, '{"duration_days": 7, "description": "1 Hafta Tüm Özellikler Başlangıç"}'::jsonb),
  ('starter', 'Starter', 1500, 1, 5, 1000, false, '{"description": "Tek Doktorlu Klinikler İçin Tam Paket"}'::jsonb),
  ('pro', 'Professional', 3500, 3, 10, 3000, true, '{"description": "Genişleyen Ekipler İçin Gelişmiş Paket"}'::jsonb),
  ('enterprise', 'Enterprise', 7500, 99, 99, 10000, true, '{"description": "Büyük Kurumsal Klinikler İçin Sınırsız Destek"}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  max_doctors = excluded.max_doctors,
  max_staff = excluded.max_staff,
  monthly_credits = excluded.monthly_credits,
  has_ai_features = excluded.has_ai_features,
  features = excluded.features;

-- 3) Klinikler için varsayılan planı 'trial' yapalım
alter table public.clinics alter column plan_id set default 'trial';
