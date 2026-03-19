-- =========================================================
-- Örnek Hasta, Randevu ve Ödeme Verileri
-- Supabase SQL Editor'de çalıştırın. En az 1 klinik olmalı (doktor opsiyonel).
-- Tarihler CURRENT_DATE'e göre: geçen hafta → gelecek hafta
-- =========================================================

DO $$
DECLARE
  v_clinic_id uuid;
  v_doctor_id uuid;
  v_pat_ids uuid[];
  i int;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  SELECT id INTO v_clinic_id FROM public.clinics LIMIT 1;
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'En az bir klinik kaydı olmalı. Önce clinics tablosuna kayıt ekleyin.';
  END IF;

  SELECT id INTO v_doctor_id FROM public.users
  WHERE clinic_id = v_clinic_id AND role IN ('DOCTOR', 'ADMIN_DOCTOR') LIMIT 1;

  -- -----------------------------------------
  -- 1) Örnek hastalar (20 kişi)
  -- -----------------------------------------
  -- Telefonlar panelde +90 ile arandığı için aynı formatta (örn. +905551112233)
  INSERT INTO public.patients (clinic_id, full_name, phone, email, birth_date, tc_identity_no, allergies, medical_alerts, notes)
  VALUES
    (v_clinic_id, 'Ayşe Demir', '+905551112233', 'ayse.demir@test.com', '1985-03-15', '12345678901', 'Penisilin', NULL, NULL),
    (v_clinic_id, 'Mehmet Kaya', '+905552223344', 'mehmet.kaya@test.com', '1990-07-22', '23456789012', NULL, 'Kan sulandırıcı kullanıyor', NULL),
    (v_clinic_id, 'Fatma Yıldız', '+905553334455', 'fatma.yildiz@test.com', '1978-11-08', '34567890123', NULL, NULL, NULL),
    (v_clinic_id, 'Ali Öztürk', '+905554445566', 'ali.ozturk@test.com', '1992-01-30', '45678901234', 'Lateks', NULL, NULL),
    (v_clinic_id, 'Zeynep Arslan', '+905555556677', 'zeynep.arslan@test.com', '1988-05-12', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Mustafa Çelik', '+905556667788', 'mustafa.celik@test.com', '1975-09-25', '56789012345', NULL, 'Kalp kapakçığı', NULL),
    (v_clinic_id, 'Elif Şahin', '+905557778899', 'elif.sahin@test.com', '1995-02-14', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Hüseyin Aydın', '+905558889900', 'huseyin.aydin@test.com', '1982-12-03', '67890123456', NULL, NULL, NULL),
    (v_clinic_id, 'Merve Koç', '+905559990011', 'merve.koc@test.com', '2000-04-20', NULL, 'Aspirin', NULL, NULL),
    (v_clinic_id, 'Emre Polat', '+905501001122', 'emre.polat@test.com', '1987-08-17', '78901234567', NULL, NULL, NULL),
    (v_clinic_id, 'Selin Acar', '+905512112233', 'selin.acar@test.com', '1993-06-09', NULL, NULL, 'Hamile (2. trimester)', NULL),
    (v_clinic_id, 'Burak Yılmaz', '+905523223344', 'burak.yilmaz@test.com', '1970-10-28', '89012345678', NULL, NULL, NULL),
    (v_clinic_id, 'Deniz Korkmaz', '+905534334455', 'deniz.korkmaz@test.com', '1998-01-05', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Ceren Özdemir', '+905545445566', 'ceren.ozdemir@test.com', '1984-07-31', '90123456789', 'Novocaine', NULL, NULL),
    (v_clinic_id, 'Kaan Güneş', '+905556556677', 'kaan.gunes@test.com', '1991-11-22', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Ece Bulut', '+905567667788', 'ece.bulut@test.com', '1979-03-18', NULL, NULL, 'Diyabet', NULL),
    (v_clinic_id, 'Onur Erdoğan', '+905578778899', 'onur.erdogan@test.com', '1986-12-07', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'İrem Aksoy', '+905589889900', 'irem.aksoy@test.com', '1996-09-11', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Barış Demirci', '+905590990011', 'baris.demirci@test.com', '1981-04-25', NULL, NULL, NULL, NULL),
    (v_clinic_id, 'Sude Özkan', '+905501002233', 'sude.ozkan@test.com', '1994-08-14', NULL, NULL, NULL, NULL);

  -- Hasta id'leri (ekleme sırası: en son eklenen = 1. indeks)
  SELECT array_agg(id ORDER BY created_at DESC) INTO v_pat_ids
  FROM (SELECT id, created_at FROM public.patients WHERE clinic_id = v_clinic_id ORDER BY created_at DESC LIMIT 20) x;

  -- -----------------------------------------
  -- 2) Randevular
  -- -----------------------------------------
  -- Geçen hafta: 5 tamamlanmış
  FOR i IN 1..5 LOOP
    v_starts := (CURRENT_DATE - 7 + (i * 2)::int)::date + time '09:00';
    v_ends   := v_starts + interval '30 minutes';
    INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note, treatment_note)
    VALUES (v_clinic_id, v_pat_ids[1 + (i % 5)], v_doctor_id, 'web', 'completed', v_starts, v_ends, 'MUAYENE', 'Kontrol randevusu', 'Muayene yapıldı.');
  END LOOP;

  -- Geçen hafta: 1 iptal
  v_starts := (CURRENT_DATE - 5)::date + time '11:00';
  v_ends   := v_starts + interval '45 minutes';
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note)
  VALUES (v_clinic_id, v_pat_ids[6], v_doctor_id, 'whatsapp', 'cancelled', v_starts, v_ends, 'DOLGU', 'Hasta iptal etti');

  -- Bu hafta: bugün 2 randevu
  v_starts := CURRENT_DATE + time '10:00';
  v_ends   := v_starts + interval '30 minutes';
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note)
  VALUES (v_clinic_id, v_pat_ids[7], v_doctor_id, 'web', 'confirmed', v_starts, v_ends, 'MUAYENE', 'Diş ağrısı');

  v_starts := CURRENT_DATE + time '14:00';
  v_ends   := v_starts + interval '45 minutes';
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type)
  VALUES (v_clinic_id, v_pat_ids[8], v_doctor_id, 'phone', 'pending', v_starts, v_ends, 'DOLGU');

  -- Yarın: 2 randevu
  v_starts := (CURRENT_DATE + 1)::date + time '09:00';
  v_ends   := v_starts + interval '60 minutes';
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note)
  VALUES (v_clinic_id, v_pat_ids[9], v_doctor_id, 'web', 'confirmed', v_starts, v_ends, 'KANAL', 'Kanal tedavisi devam');

  v_starts := (CURRENT_DATE + 1)::date + time '11:30';
  v_ends   := v_starts + interval '40 minutes';
  INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note)
  VALUES (v_clinic_id, v_pat_ids[10], v_doctor_id, 'walk_in', 'confirmed', v_starts, v_ends, 'TEMIZLIK', 'Diş taşı temizliği');

  -- Gelecek hafta: 4 randevu
  FOR i IN 1..4 LOOP
    v_starts := (CURRENT_DATE + 7 + i)::date + time '09:00' + (i || ' hours')::interval;
    v_ends   := v_starts + interval '30 minutes';
    INSERT INTO public.appointments (clinic_id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type)
    VALUES (v_clinic_id, v_pat_ids[10 + i], v_doctor_id, 'web', (CASE WHEN i <= 2 THEN 'confirmed' ELSE 'pending' END)::public.appointment_status, v_starts, v_ends, 'MUAYENE');
  END LOOP;

  -- -----------------------------------------
  -- 3) Ödemeler: tamamlanmış randevulara paid, geleceğe planned/partial
  -- -----------------------------------------
  -- Tamamlanmış her randevuya 1 ödenmiş kayıt (muayene 350 TL)
  INSERT INTO public.payments (clinic_id, appointment_id, patient_id, amount, method, status, note, due_date)
  SELECT a.clinic_id, a.id, a.patient_id, 350, 'nakit', 'paid', 'Muayene ücreti', (a.starts_at)::date
  FROM public.appointments a
  WHERE a.clinic_id = v_clinic_id AND a.status = 'completed';

  -- Ek: bir tamamlanmış randevuya ikinci kalem (dolgu)
  INSERT INTO public.payments (clinic_id, appointment_id, patient_id, amount, method, status, note, due_date)
  SELECT a.clinic_id, a.id, a.patient_id, 1200, 'kredi_karti', 'paid', 'Dolgu', (a.starts_at)::date
  FROM public.appointments a
  WHERE a.clinic_id = v_clinic_id AND a.status = 'completed'
  LIMIT 1;

  -- Onaylı/bekleyen randevulara planlı ödemeler
  INSERT INTO public.payments (clinic_id, appointment_id, patient_id, amount, method, status, note, due_date)
  SELECT a.clinic_id, a.id, a.patient_id, 500, NULL, 'planned', 'Tahmini muayene', (a.starts_at)::date
  FROM public.appointments a
  WHERE a.clinic_id = v_clinic_id AND a.status IN ('confirmed', 'pending')
  LIMIT 3;

  -- Bir onaylı randevuya kısmi ödeme (kapora)
  INSERT INTO public.payments (clinic_id, appointment_id, patient_id, amount, method, status, note, due_date)
  SELECT a.clinic_id, a.id, a.patient_id, 1500, NULL, 'partial', 'Kapora', (a.starts_at)::date + 7
  FROM public.appointments a
  WHERE a.clinic_id = v_clinic_id AND a.status = 'confirmed'
  LIMIT 1;

  RAISE NOTICE 'Örnek veriler eklendi. Klinik ID: %', v_clinic_id;
END $$;

-- =========================================================
-- KONTROL: seed_sample_data_verify.sql dosyasındaki sorguları
-- çalıştırarak sayıları ve tarih aralığını doğrulayın.
-- Beklenen: 20 hasta, 12 randevu, 10 ödeme (5 paid muayene + 1 paid dolgu + 3 planned + 1 partial)
-- =========================================================
