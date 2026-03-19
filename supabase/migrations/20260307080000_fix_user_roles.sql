-- Veritabanı Enum ve Yetki Fonksiyonu Düzeltmesi

-- 1) user_role enum tipine eksik olabilecek değerleri ekleyelim
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'ADMIN_DOCTOR') THEN
        ALTER TYPE public.user_role ADD VALUE 'ADMIN_DOCTOR';
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2) current_user_is_admin fonksiyonunu güncelle (Eski sürümlerde hata verebilir diye garantiye alıyoruz)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() 
      AND (role = 'ADMIN' OR role = 'SUPER_ADMIN' OR role::text = 'ADMIN_DOCTOR')
  );
$$;
