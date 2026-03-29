-- =========================================================
-- Treatment Library için RLS ve Güvenlik Sıkılaştırma
-- =========================================================

-- 1) RLS'i aktif et
ALTER TABLE IF EXISTS public.treatment_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinic_treatment_protocols ENABLE ROW LEVEL SECURITY;

-- 2) treatment_library (Genel Kitaplık) için politikalar
DO $$ 
BEGIN
  -- Read access for all authenticated users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_library' AND policyname = 'treatment_library_select_all') THEN
    CREATE POLICY "treatment_library_select_all"
    ON public.treatment_library FOR SELECT TO authenticated USING (true);
  END IF;

  -- Full access for super admins (to manage the library)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_library' AND policyname = 'treatment_library_all_super_admin') THEN
    CREATE POLICY "treatment_library_all_super_admin"
    ON public.treatment_library FOR ALL TO authenticated USING (
      public.current_user_is_super_admin()
    ) WITH CHECK (
      public.current_user_is_super_admin()
    );
  END IF;
END $$;

-- 3) clinic_treatment_protocols (Klinik Bazlı Notlar) için politikalar
DO $$ 
BEGIN
  -- Clinics can select/manage their own protocol overrides
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinic_treatment_protocols' AND policyname = 'clinic_treatment_protocols_owner_access') THEN
    CREATE POLICY "clinic_treatment_protocols_owner_access"
    ON public.clinic_treatment_protocols FOR ALL TO authenticated USING (
      public.current_user_is_super_admin()
      OR clinic_id = public.current_user_clinic_id()
    ) WITH CHECK (
      public.current_user_is_super_admin()
      OR clinic_id = public.current_user_clinic_id()
    );
  END IF;
END $$;

-- 4) clinic_treatment_protocols için otomatik clinic_id tetikleyicisi (Eğer henüz yoksa)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clinic_treatment_protocols_clinic_id') THEN
    CREATE TRIGGER trg_clinic_treatment_protocols_clinic_id
      BEFORE INSERT ON public.clinic_treatment_protocols
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_clinic_id();
  END IF;
END $$;
