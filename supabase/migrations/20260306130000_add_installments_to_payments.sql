-- =========================================================
-- Ödeme Tablosu Taksitlendirme Desteği
-- =========================================================

-- 1) Kolonları Ekle (Eğer yoksa)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE;

-- 2) İndeks Ekle (Taksitli işlemleri hızlı bulmak için)
CREATE INDEX IF NOT EXISTS idx_payments_parent ON public.payments (parent_payment_id);

-- Not: Mevcut triggerlar (trg_payments_clinic_id ve trg_sync_checklist_on_payment) 
-- zaten tanımlı olduğu için dokunmuyoruz. Her yeni taksit kaydı triggerları tetikleyecektir.
