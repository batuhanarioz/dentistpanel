-- =========================================================
-- Active Sessions Tablosu ve RLS Politikaları
-- =========================================================

-- Tablo oluşturma (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT active_sessions_user_id_session_id_key UNIQUE (user_id, session_id)
);

-- Index oluşturma (performans için)
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON public.active_sessions(session_id);

-- RLS Aktivasyonu
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Politika Güncelleme (Tüm işlemler için izin)
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.active_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.active_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
