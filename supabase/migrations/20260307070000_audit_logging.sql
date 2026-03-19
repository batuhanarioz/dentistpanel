-- ==============================================================================
-- 📋 AUDIT LOGS (İŞLEM GÜNLÜĞÜ) ALTYAPISI
-- ==============================================================================

-- 1) Audit Logs Tablosu
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    entity_type text NOT NULL, -- 'appointments', 'payments', 'patients'
    entity_id uuid NOT NULL,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Aktif Et
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2) Tetikleyici Fonksiyonu (Generic Audit Function)
CREATE OR REPLACE FUNCTION public.proc_audit_log()
RETURNS trigger AS $$
DECLARE
    v_clinic_id uuid;
    v_user_id uuid;
    v_ip text;
    v_ua text;
BEGIN
    -- Mevcut kullanıcıyı ve kliniği bul
    v_user_id := auth.uid();
    v_clinic_id := public.current_user_clinic_id();
    
    -- IP ve User Agent bilgilerini Supabase session meta verilerinden almayı dene
    -- (Sadece API üzerinden yapılan işlemlerde dolu gelir)
    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-real-ip';
        v_ua := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_ua := NULL;
    END;

    -- Eğer klinik ID'si bulunamadıysa (doğrudan DB işlemi olabilir), verinin içinden çekmeyi dene
    IF v_clinic_id IS NULL THEN
        IF (TG_OP = 'DELETE') THEN
            v_clinic_id := OLD.clinic_id;
        ELSE
            v_clinic_id := NEW.clinic_id;
        END IF;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (clinic_id, user_id, action, entity_type, entity_id, new_data, ip_address, user_agent)
        VALUES (v_clinic_id, v_user_id, 'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb, v_ip, v_ua);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (clinic_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
        VALUES (v_clinic_id, v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, v_ip, v_ua);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (clinic_id, user_id, action, entity_type, entity_id, old_data, ip_address, user_agent)
        VALUES (v_clinic_id, v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb, v_ip, v_ua);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Tetikleyicileri Tablolara Bağla

-- Appointments
DROP TRIGGER IF EXISTS trg_audit_appointments ON public.appointments;
CREATE TRIGGER trg_audit_appointments
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- Payments
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- Patients
DROP TRIGGER IF EXISTS trg_audit_patients ON public.patients;
CREATE TRIGGER trg_audit_patients
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.proc_audit_log();

-- 4) RLS Politikaları
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
ON public.audit_logs FOR SELECT USING (
    (public.current_user_is_admin() AND clinic_id = public.current_user_clinic_id())
    OR public.current_user_is_super_admin()
);

-- Indexler (Performans için)
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_created ON public.audit_logs (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
