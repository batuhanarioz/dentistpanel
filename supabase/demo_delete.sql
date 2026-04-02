-- ================================================================
-- 🦷 DİŞ KLİNİĞİ DEMO VERİ SİLME SCRİPTİ
-- ================================================================
-- Her gün seed'den önce çalıştır.
-- Hedef: "Örnek Diş Kliniği" (9a99818d-...)
-- ================================================================

DO $$
DECLARE
  v_cid UUID := '9a99818d-cd23-478f-ae14-90ec4450b2cb';
BEGIN
  DELETE FROM lab_jobs             WHERE clinic_id = v_cid;
  DELETE FROM patient_anamnesis    WHERE clinic_id = v_cid;
  DELETE FROM dental_charts        WHERE clinic_id = v_cid;
  DELETE FROM treatment_plan_items WHERE clinic_id = v_cid;
  DELETE FROM treatment_plans      WHERE clinic_id = v_cid;
  DELETE FROM payments             WHERE clinic_id = v_cid;
  DELETE FROM appointments         WHERE clinic_id = v_cid;
  DELETE FROM recall_queue         WHERE clinic_id = v_cid;
  DELETE FROM patients             WHERE clinic_id = v_cid;
  RAISE NOTICE '🗑️  Demo verileri silindi — Örnek Diş Kliniği temizlendi.';
END;
$$;
