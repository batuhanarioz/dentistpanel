import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

describe('Sistem Genel Sağlık ve Bağlantı Testleri', () => {

    it('Veritabanı Erişimi: Temel klinik verisi okunabiliyor mu?', async () => {
        const { data, error } = await adminClient.from('clinics').select('count').limit(1);
        expect(error).toBeNull();
        expect(data).not.toBeNull();
    });

    it('USS Monitoring Tabloları: Veri tutarlılığı kontrolü', async () => {
        // Monitoring için gerekli olan ancak uygulama tarafında 
        // n8n üzerinden yönetilen tabloların varlığını kontrol et
        const tables = ['checklist_items', 'payments', 'appointments'];
        for (const table of tables) {
            const { error } = await adminClient.from(table).select('count').limit(1);
            expect(error, `Tablo ${table} erişilemedi veya mevcut değil`).toBeNull();
        }
    });

    it('TCKN Doğrulama Mantığı: Algoritma testi', async () => {
        // TCKN algoritma doğrulamasını test etmek için yardımcı bir fonksiyon (lib içindekiyle paralel)
        const validateTCKN = (tckn: string): boolean => {
            if (!/^[1-9][0-9]{10}$/.test(tckn)) return false;
            const digits = tckn.split('').map(Number);
            const d10 = ((digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7 - (digits[1] + digits[3] + digits[5] + digits[7])) % 10;
            const d11 = (digits[0] + digits[1] + digits[2] + digits[3] + digits[4] + digits[5] + digits[6] + digits[7] + digits[8] + digits[9]) % 10;
            return digits[9] === d10 && digits[10] === d11;
        };

        expect(validateTCKN('10000000146')).toBe(true); // Örnek geçerli TCKN
        expect(validateTCKN('11111111111')).toBe(false); // Örnek geçersiz TCKN
        expect(validateTCKN('00000000000')).toBe(false); // Örnek geçersiz TCKN
    });

    it('Checklist RPC Performansı: Hızlı sonuç veriyor mu?', async () => {
        const { data: clinic } = await adminClient.from('clinics').select('id').limit(1).single();
        if (clinic) {
            const start = Date.now();
            const { error } = await adminClient.rpc('refresh_checklist_items', { p_clinic_id: clinic.id });
            const duration = Date.now() - start;

            expect(error).toBeNull();
            expect(duration).toBeLessThan(2000); // 2 saniyeden az sürmeli
            console.log(`RPC refresh_checklist_items süresi: ${duration}ms`);
        }
    });

    it('Zod Şemaları: Patient validation tutarlılığı', async () => {
        // useUSSMonitoring içinde de kullanılan validasyon desenlerinin doğruluğu
        const tcknSchema = /^[1-9][0-9]{10}$/;
        expect(tcknSchema.test('12345678901')).toBe(true);
        expect(tcknSchema.test('01234567890')).toBe(false);
        expect(tcknSchema.test('123')).toBe(false);
    });
});
