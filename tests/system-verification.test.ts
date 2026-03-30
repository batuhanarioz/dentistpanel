import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client bypasses RLS - used for setup/cleanup
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

describe('Sistem İş Akışı Testleri', () => {
    let testClinicId: string;
    let testPatientId: string;
    let testAppointmentId: string;
    let testDoctorId: string;

    beforeAll(async () => {
        // Test Verisi Hazırlığı
        const { data: clinic } = await adminClient.from('clinics').select('id').limit(1).single();
        testClinicId = clinic!.id;

        const { data: doctor } = await adminClient.from('users').select('id').eq('role', 'DOKTOR').limit(1).single();
        testDoctorId = doctor!.id;

        const { data: patient } = await adminClient.from('patients').insert({
            clinic_id: testClinicId,
            full_name: 'Test Testoğlu',
            phone: '5551112233'
        }).select().single();
        testPatientId = patient!.id;
    });

    it('Randevu döngüsü ve Checklist senkronizasyonu', async () => {
        // 1. Randevu oluştur (Doktor atanmamış)
        const now = new Date();
        const { data: app, error: appErr } = await adminClient.from('appointments').insert({
            clinic_id: testClinicId,
            patient_id: testPatientId,
            starts_at: new Date(now.getTime() + 3600000).toISOString(),
            ends_at: new Date(now.getTime() + 7200000).toISOString(),
            status: 'confirmed'
        }).select().single();

        expect(appErr).toBeNull();
        testAppointmentId = app!.id;

        // RPC ile checklist yenile
        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        // 2. MISSING_DOCTOR kontrolü
        const { data: items } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId);

        const hasDoctorTask = items?.some(i => (i.checklist_definitions as { code: string }).code === 'MISSING_DOCTOR');
        console.log('Randevu oluştu, Hekim görevi:', hasDoctorTask ? 'VAR ✅' : 'YOK ❌');

        // 3. Doktor ata
        await adminClient.from('appointments').update({ doctor_id: testDoctorId }).eq('id', testAppointmentId);
        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        const { data: itemsAfterDoctor } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId)
            .eq('status', 'pending');

        const doctorTaskGone = !itemsAfterDoctor?.some(i => (i.checklist_definitions as { code: string }).code === 'MISSING_DOCTOR');
        console.log('Hekim atandı, Hekim görevi kapandı mı:', doctorTaskGone ? 'EVET ✅' : 'HAYIR ❌');
        expect(doctorTaskGone).toBe(true);
    });

    it('Ödeme takip ve Hızlı Aksiyonlar (Ertele/İptal)', async () => {
        // 1. Randevuyu tamamla
        await adminClient.from('appointments').update({ status: 'completed' }).eq('id', testAppointmentId);
        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        // 2. MISSING_PAYMENT kontrolü
        const { data: items } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId)
            .eq('status', 'pending');

        const hasPaymentTask = items?.some(i => (i.checklist_definitions as { code: string }).code === 'MISSING_PAYMENT');
        console.log('Randevu tamamlandı, Ödeme görevi:', hasPaymentTask ? 'VAR ✅' : 'YOK ❌');
        expect(hasPaymentTask).toBe(true);

        // 3. Bugün vadesi gelen taksit oluştur
        const { data: payment } = await adminClient.from('payments').insert({
            clinic_id: testClinicId,
            appointment_id: testAppointmentId,
            patient_id: testPatientId,
            amount: 1500,
            status: 'pending',
            due_date: new Date().toISOString().split('T')[0],
            agreed_total: 5000
        }).select().single();

        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        const { data: itemsWithFollowup } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId)
            .eq('status', 'pending');

        const hasFollowupTask = itemsWithFollowup?.some(i => (i.checklist_definitions as { code: string }).code === 'DUE_PAYMENT_FOLLOWUP');
        console.log('Taksit eklendi, Takip görevi:', hasFollowupTask ? 'VAR ✅' : 'YOK ❌');

        // 4. Test: Erteleme ( due_date +1 day )
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await adminClient.from('payments').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', payment!.id);
        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        const { data: itemsAfterPostpone } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId)
            .eq('status', 'pending');

        const followupGone = !itemsAfterPostpone?.some(i => (i.checklist_definitions as { code: string }).code === 'DUE_PAYMENT_FOLLOWUP');
        console.log('Ödeme ertelendi, Takip görevi kalktı mı:', followupGone ? 'EVET ✅' : 'HAYIR ❌');
        expect(followupGone).toBe(true);

        // 5. Test: İptal ( status = 'cancelled' )
        await adminClient.from('payments').update({ status: 'cancelled', due_date: new Date().toISOString().split('T')[0] }).eq('id', payment!.id);
        await adminClient.rpc('refresh_checklist_items', { p_clinic_id: testClinicId });

        const { data: itemsAfterCancel } = await adminClient.from('checklist_items')
            .select('*, checklist_definitions(code)')
            .eq('appointment_id', testAppointmentId)
            .eq('status', 'pending');

        const cancelCheck = !itemsAfterCancel?.some(i => (i.checklist_definitions as { code: string }).code === 'DUE_PAYMENT_FOLLOWUP');
        console.log('Ödeme iptal edildi, Takip görevi kapandı mı:', cancelCheck ? 'EVET ✅' : 'HAYIR ❌');
        expect(cancelCheck).toBe(true);
    });
});
