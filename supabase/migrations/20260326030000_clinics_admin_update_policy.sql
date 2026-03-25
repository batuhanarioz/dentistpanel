-- ============================================================
-- clinics tablosu: ADMIN kullanıcılar kendi kliniklerini güncelleyebilsin
-- Mevcut clinics_update_super_admin politikası sadece SUPER_ADMIN'e izin veriyor.
-- Bu politika ADMIN kullanıcıların kendi klinik satırını güncellemesine izin verir.
-- ============================================================

DROP POLICY IF EXISTS "clinics_update_admin" ON public.clinics;

CREATE POLICY "clinics_update_admin"
ON public.clinics FOR UPDATE
USING (
    public.current_user_is_admin()
    AND id = public.current_user_clinic_id()
)
WITH CHECK (
    public.current_user_is_admin()
    AND id = public.current_user_clinic_id()
);
