-- Raporlama Optimizasyonu: View ve RPC Tanımları

-- 1. Randevu İstatistikleri View'u (Hızlı özet için)
CREATE OR REPLACE VIEW public.view_appointment_stats AS
SELECT 
    clinic_id,
    starts_at::date as report_date,
    status,
    channel,
    doctor_id,
    count(*) as appt_count
FROM public.appointments
GROUP BY clinic_id, starts_at::date, status, channel, doctor_id;

-- 2. Finansal Özet RPC (Belirli tarih aralığı için)
CREATE OR REPLACE FUNCTION public.rpc_get_financial_stats(
    p_clinic_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    total_revenue numeric,
    paid_amount numeric,
    pending_amount numeric,
    cancelled_revenue numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'Ödendi') THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('planned', 'partial', 'Beklemede', 'Kısmi') THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status IN ('cancelled', 'İptal') THEN amount ELSE 0 END), 0) as cancelled_revenue
    FROM public.payments
    WHERE clinic_id = p_clinic_id
      AND due_date BETWEEN p_start_date AND p_end_date;
END;
$$;
