-- Anon kullanıcıların (public booking portal) klinik hekimlerini görebilmesi için
-- Yalnızca minimum alanlar: id, full_name, specialty_code, role, is_clinical_provider

-- Önce eski varsa kaldır
DROP POLICY IF EXISTS "anon_read_clinic_doctors" ON public.users;

-- Anon SELECT politikası: sadece role=DOKTOR veya is_clinical_provider=true olan satırlar
CREATE POLICY "anon_read_clinic_doctors"
  ON public.users
  FOR SELECT
  TO anon
  USING (
    role = 'DOKTOR' OR is_clinical_provider = true
  );
