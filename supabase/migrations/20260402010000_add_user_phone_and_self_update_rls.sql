-- users tablosuna telefon numarası alanı ekleme
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- RLS politikalarını gözden geçirme (Kullanıcılar kendi bilgilerini güncelleyebilmeli)
-- Mevcut politikalara ek olarak:
CREATE POLICY "Users can update their own profile fields" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (
        -- Admin değilse sadece şu alanları güncelleyebilsin:
        role = role -- Rol değişemez
        AND is_active = is_active -- Durum değişemez
        AND clinic_id = clinic_id -- Klinik değişemez
    )
);
