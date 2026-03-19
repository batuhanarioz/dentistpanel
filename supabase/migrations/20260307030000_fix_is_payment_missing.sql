-- Update is_payment_missing function to exclude cancelled payments from totals and counts
-- This ensures that if a payment is cancelled, the system correctly identifies the balance as missing.

CREATE OR REPLACE FUNCTION public.is_payment_missing(p_app_id uuid)
RETURNS boolean AS $$
DECLARE
    v_agreed_total numeric;
    v_total_paid numeric;
    v_payment_count integer;
BEGIN
    -- Bu randevuya ait ödemelerden 'agreed_total' değeri en yüksek çıkanı bul
    -- İptal edilmiş ödemelerin hedeflerini de baz alabiliriz (agreed_total genellikle değişmez)
    -- ama paid/beklemede olanlardan almak daha sağlıklı olabilir.
    SELECT COALESCE(MAX(agreed_total), 0) INTO v_agreed_total
    FROM public.payments 
    WHERE appointment_id = p_app_id 
      AND status NOT IN ('İptal', 'cancelled');
    
    -- Toplam ödenen miktar (Sadece 'Ödendi' veya 'paid' olanlar)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.payments 
    WHERE appointment_id = p_app_id 
      AND status IN ('Ödendi', 'paid');

    -- Aktif (iptal edilmemiş) ödeme kaydı sayısı
    SELECT COUNT(id) INTO v_payment_count
    FROM public.payments 
    WHERE appointment_id = p_app_id 
      AND status NOT IN ('İptal', 'cancelled');

    -- Eğer içeride hiç aktif ödeme yoksa EKSİK'tir
    IF v_payment_count = 0 THEN
        RETURN true;
    END IF;

    -- Eğer herhangi bir 'agreed_total' varsa, toplam ödenen tutar bu hedefin altında kalmamalı
    IF v_agreed_total > 0 THEN
        IF v_agreed_total - v_total_paid > 0.01 THEN
            RETURN true; -- Eksik
        ELSE
            RETURN false; -- Tamam
        END IF;
    ELSE
        -- Hiç 'agreed_total' girilmemişse ama aktif ödeme kaydı varsa, 
        -- en azından bir kayıt girildiği için 'tamam' kabul ediyoruz (eski mantık)
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
