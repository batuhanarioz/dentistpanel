ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color_from TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color_to TEXT;

-- RLS: Kullanıcılar kendi tema ayarlarını güncelleyebilir
CREATE POLICY "Users can update their own theme colors"
    ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
