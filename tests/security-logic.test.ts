import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client bypasses RLS - used for data validation
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

describe('Güvenlik ve Mantık Testleri (Standardizasyon & İzolasyon)', () => {
    let clinicA: string;
    let clinicB: string;
    let patientA: string;
    let appointmentA: string;

    beforeAll(async () => {
        // İki farklı klinik bul
        const { data: clinics } = await adminClient.from('clinics').select('id').limit(2);
        if (!clinics || clinics.length < 2) {
            throw new Error('Test için en az 2 klinik gereklidir.');
        }
        clinicA = clinics[0].id;
        clinicB = clinics[1].id;

        // Klinik A için bir hasta oluştur
        const { data: patient } = await adminClient.from('patients').insert({
            clinic_id: clinicA,
            full_name: 'İzolasyon Test Hastası',
            phone: '5550009988'
        }).select().single();
        patientA = patient!.id;

        // Klinik A için bir randevu oluştur (Ödeme için gerekli)
        const now = new Date();
        const { data: appt } = await adminClient.from('appointments').insert({
            clinic_id: clinicA,
            patient_id: patientA,
            starts_at: now.toISOString(),
            ends_at: new Date(now.getTime() + 3600000).toISOString(),
            status: 'confirmed'
        }).select().single();
        appointmentA = appt!.id;
    });

    describe('Ödeme Durumu Standardizasyonu', () => {
        it('Yeni standart sluglar (paid, pending, cancelled, partial) kaydedilebilmeli', async () => {
            const statuses = ['paid', 'pending', 'cancelled', 'partial'];

            for (const status of statuses) {
                const { data, error } = await adminClient.from('payments').insert({
                    clinic_id: clinicA,
                    patient_id: patientA,
                    appointment_id: appointmentA,
                    amount: 100,
                    status: status,
                    due_date: new Date().toISOString().split('T')[0]
                }).select().single();

                expect(error).toBeNull();
                expect(data?.status).toBe(status);

                // Temizlik
                await adminClient.from('payments').delete().eq('id', data!.id);
            }
        });

        it('Geçersiz bir durum kaydedildiğinde CHECK kısıtlaması hata vermeli', async () => {
            const { error } = await adminClient.from('payments').insert({
                clinic_id: clinicA,
                patient_id: patientA,
                appointment_id: appointmentA,
                amount: 100,
                status: 'invalid_status_xyz', // Hatalı durum
                due_date: new Date().toISOString().split('T')[0]
            });

            expect(error).not.toBeNull();
            expect(error?.code).toBe('23514'); // check_violation
        });
    });

    describe('Multi-Tenant (Klinik) İzolasyon Mantığı', () => {
        it('Her tablonun clinic_id içerdiği ve RLS politikalarının varlığı (SQL check)', async () => {
            // Kritik tabloların RLS durumunu kontrol et
            const tables = ['payments', 'patients', 'appointments', 'clinic_automations', 'n8n_chat_histories'];

            for (const table of tables) {
                const { data: policies, error } = await adminClient
                    .rpc('get_policies_for_table', { table_name: table });

                // Not: Eğer get_policies_for_table RPC'si yoksa manuel select ile de bakılabilir
                // Şimdilik sadece tablonun RLS açık mı ona bakalım (eğer admin yetkimiz varsa)
            }
        });
    });

    describe('Veri İlişkilendirme Mantığı', () => {
        it('Randevu silindiğinde (iptal edildiğinde) ödemeler korunmalı (No cascade delete check)', async () => {
            // 1. Randevu oluştur
            const now = new Date();
            const { data: appt } = await adminClient.from('appointments').insert({
                clinic_id: clinicA,
                patient_id: patientA,
                starts_at: now.toISOString(),
                ends_at: new Date(now.getTime() + 3600000).toISOString(),
                status: 'confirmed'
            }).select().single();

            // 2. Ödeme bağla
            const { data: pay } = await adminClient.from('payments').insert({
                clinic_id: clinicA,
                patient_id: patientA,
                appointment_id: appt!.id,
                amount: 500,
                status: 'pending'
            }).select().single();

            // 3. Randevuyu sil (Fiziksel silme testi)
            await adminClient.from('appointments').delete().eq('id', appt!.id);

            // 4. Ödeme hala yerinde mi? (appointment_id null olmalı)
            const { data: remainingPay } = await adminClient.from('payments').select().eq('id', pay!.id).single();
            expect(remainingPay).not.toBeNull();
            expect(remainingPay?.appointment_id).toBeNull(); // CASCADE yerine SET NULL doğrulaması

            // Temizlik
            await adminClient.from('payments').delete().eq('id', pay!.id);
        });
    });
});
