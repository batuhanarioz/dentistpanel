
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local dosyasında tanımlı olmalıdır.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('QR Check-in System Scenarios', () => {
    let testClinicId: string;
    let testPatientId: string;
    let testApptIds: string[] = [];

    beforeAll(async () => {
        // Test kliniği bul
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id')
            .eq('slug', 'izmir-dis-klinigi')
            .single();

        if (clinicError || !clinic) {
            throw new Error('Test klinik (izmir-dis-klinigi) bulunamadı. Testleri çalıştırmak için bu klinigi oluşturunuz.');
        }
        testClinicId = clinic.id;

        // Benzersiz test hastası oluştur (her test run'da farklı UUID prefix)
        const testTag = `TEST_QR_${Date.now()}`;
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert({
                clinic_id: testClinicId,
                full_name: testTag,
                phone: '5550009999',
            })
            .select('id')
            .single();

        if (patientError || !patient) {
            throw new Error(`Test hastası oluşturulamadı: ${patientError?.message}`);
        }
        testPatientId = patient.id;
    });

    afterAll(async () => {
        // Temizlik — test verilerini sil (sıralama önemli: FK kısıtları nedeniyle)
        if (testApptIds.length > 0) {
            await supabase.from('checkin_codes').delete().in('appointment_id', testApptIds);
            await supabase.from('appointments').delete().in('id', testApptIds);
        }
        if (testPatientId) {
            await supabase.from('patient_anamnesis').delete().eq('patient_id', testPatientId);
            await supabase.from('patients').delete().eq('id', testPatientId);
        }
    });

    it('Scenario 1: Multiple appointments for same patient in one day', async () => {
        const today = new Date().toISOString().split('T')[0];

        const { data: appts, error } = await supabase.from('appointments').insert([
            {
                clinic_id: testClinicId,
                patient_id: testPatientId,
                starts_at: `${today}T10:00:00+03:00`,
                ends_at: `${today}T10:30:00+03:00`,
                status: 'confirmed',
            },
            {
                clinic_id: testClinicId,
                patient_id: testPatientId,
                starts_at: `${today}T15:00:00+03:00`,
                ends_at: `${today}T15:30:00+03:00`,
                status: 'confirmed',
            },
        ]).select('id');

        expect(error).toBeNull();
        testApptIds = appts?.map(a => a.id) || [];

        const { data: found } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', testPatientId)
            .gte('starts_at', `${today}T00:00:00+03:00`)
            .lte('starts_at', `${today}T23:59:59+03:00`);

        expect(found?.length).toBeGreaterThanOrEqual(2);
    });

    it('Scenario 2: Expired code should not be returned', async () => {
        if (testApptIds.length === 0) return;

        const expiredTime = new Date(Date.now() - 3600000).toISOString();

        await supabase.from('checkin_codes').upsert({
            clinic_id: testClinicId,
            appointment_id: testApptIds[0],
            code: '9999',
            expires_at: expiredTime,
            used_at: null,
        }, { onConflict: 'appointment_id' });

        const { data, error } = await supabase
            .from('checkin_codes')
            .select('id')
            .eq('code', '9999')
            .gt('expires_at', new Date().toISOString())
            .is('used_at', null)
            .single();

        expect(data).toBeNull();
        expect(error).toBeDefined();
    });

    it('Scenario 3: Used code (used_at set) should not pass verification', async () => {
        if (testApptIds.length === 0) return;

        const futureExpiry = new Date(Date.now() + 3600000).toISOString();

        await supabase.from('checkin_codes').upsert({
            clinic_id: testClinicId,
            appointment_id: testApptIds[0],
            code: '8888',
            expires_at: futureExpiry,
            used_at: new Date().toISOString(), // zaten kullanılmış
        }, { onConflict: 'appointment_id' });

        const { data } = await supabase
            .from('checkin_codes')
            .select('id')
            .eq('code', '8888')
            .gt('expires_at', new Date().toISOString())
            .is('used_at', null) // kullanılmamış olmalı
            .single();

        expect(data).toBeNull();
    });

    it('Scenario 4: Anamnesis upsert — no duplicates', async () => {
        const payload = {
            clinic_id: testClinicId,
            patient_id: testPatientId,
            systemic_conditions: ['diabetes'],
            filled_by: 'PATIENT',
            allergies_list: [],
            filled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await supabase.from('patient_anamnesis').upsert(payload, { onConflict: 'patient_id' });
        await supabase.from('patient_anamnesis').upsert({
            ...payload,
            systemic_conditions: ['diabetes', 'hypertension'],
        }, { onConflict: 'patient_id' });

        const { data: results } = await supabase
            .from('patient_anamnesis')
            .select('*')
            .eq('patient_id', testPatientId);

        expect(results?.length).toBe(1);
        expect(results?.[0].systemic_conditions).toContain('hypertension');
    });

    it('Scenario 5: Clinic isolation — code not accessible from wrong clinic', async () => {
        if (testApptIds.length === 0) return;

        const { data: otherClinic } = await supabase
            .from('clinics')
            .select('id')
            .neq('id', testClinicId)
            .limit(1)
            .single();

        if (!otherClinic) {
            console.warn('Başka klinik bulunamadı, Scenario 5 atlandı.');
            return;
        }

        await supabase.from('checkin_codes').upsert({
            clinic_id: testClinicId,
            appointment_id: testApptIds[0],
            code: '1234',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            used_at: null,
        }, { onConflict: 'appointment_id' });

        const { data } = await supabase
            .from('checkin_codes')
            .select('id')
            .eq('code', '1234')
            .eq('clinic_id', otherClinic.id) // YANLIŞ KLİNİK
            .single();

        expect(data).toBeNull();
    });
});
