-- ============================================================
-- Online Booking Requests — Ayrı tablo (appointments'tan bağımsız)
-- Tüm online talepler önce burada "pending" olarak birikir,
-- klinik onaylamadan appointments tablosuna geçmez.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.online_booking_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

    -- Hasta bilgileri (hasta kaydı olmayabilir, direkt giriş)
    full_name       TEXT NOT NULL,
    phone           TEXT NOT NULL,
    complaint       TEXT NOT NULL,           -- Şikayet / İşlem (zorunlu)

    -- Randevu bilgileri
    requested_at    TIMESTAMPTZ NOT NULL,    -- İstenen randevu zamanı
    duration_minutes INT NOT NULL DEFAULT 30,
    doctor_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    treatment_id    UUID REFERENCES public.treatment_definitions(id) ON DELETE SET NULL,
    treatment_name  TEXT,                    -- Snapshot (treatment silinse bile kalır)

    -- Bağlantılı kayıtlar (onay sonrası dolar)
    patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,

    -- Durum akışı
    -- pending → approved / rejected / expired / cancelled
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','expired','cancelled')),

    -- 12 saatlik onay penceresi
    expires_at      TIMESTAMPTZ NOT NULL,   -- created_at + 12 saat

    -- Audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,            -- Onay/ret zamanı
    reviewed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    review_note     TEXT                    -- Ret notu vb.
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_obr_clinic      ON public.online_booking_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_obr_status      ON public.online_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_obr_expires_at  ON public.online_booking_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_obr_requested   ON public.online_booking_requests(requested_at);

-- updated_at otomatik güncelleme trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obr_updated_at ON public.online_booking_requests;
CREATE TRIGGER trg_obr_updated_at
    BEFORE UPDATE ON public.online_booking_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS: Anonim kullanıcılar INSERT yapabilir (randevu talebi)
--       Klinik personeli kendi kliniğinin kayıtlarını okuyabilir/güncelleyebilir
-- ============================================================
ALTER TABLE public.online_booking_requests ENABLE ROW LEVEL SECURITY;

-- Anonim INSERT (public booking portal)
DROP POLICY IF EXISTS "anon_insert_booking_request" ON public.online_booking_requests;
CREATE POLICY "anon_insert_booking_request"
    ON public.online_booking_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Klinik personeli SELECT
DROP POLICY IF EXISTS "clinic_select_booking_requests" ON public.online_booking_requests;
CREATE POLICY "clinic_select_booking_requests"
    ON public.online_booking_requests FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Klinik personeli UPDATE (onay/ret/iptal)
DROP POLICY IF EXISTS "clinic_update_booking_requests" ON public.online_booking_requests;
CREATE POLICY "clinic_update_booking_requests"
    ON public.online_booking_requests FOR UPDATE
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ============================================================
-- Otomatik süresi dolmuş kayıtları iptal eden fonksiyon
-- Supabase cron veya sayfa açılışında çağrılabilir
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_online_booking_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.online_booking_requests
    SET status     = 'expired',
        updated_at = now()
    WHERE status   = 'pending'
      AND (
          expires_at < now()                    -- 12 saatlik pencere doldu
          OR requested_at < now()               -- İstenen slot geçti
      );
END;
$$;

-- ============================================================
-- clinic_settings'ten is_auto_approve kaldır (artık kullanılmıyor)
-- online_booking_config'i sadeleştir
-- ============================================================
UPDATE public.clinic_settings
SET online_booking_config = online_booking_config - 'is_auto_approve'
WHERE online_booking_config ? 'is_auto_approve';
