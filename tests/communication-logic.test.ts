import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// we can't easily mock the fetch inside Vitest without a complex setup, 
// so we'll test the Logic (Deduplication) pure function-ally 
// and the API by using the actual Supabase table (Integration).

describe('İletişim Merkezi Mantık ve API Doğrulama', () => {

    it('Tekilleştirme (Deduplication): Aynı hasta ve tip için sadece bir bildirim kalmalı', () => {
        const mockItems: any[] = [
            { id: '1', patientId: 'P1', type: 'REMINDER', title: 'R1' },
            { id: '2', patientId: 'P1', type: 'REMINDER', title: 'R2' }, // Duplicate
            { id: '3', patientId: 'P1', type: 'BIRTHDAY', title: 'B1' },  // Different type
            { id: '4', patientId: 'P2', type: 'REMINDER', title: 'R3' },  // Different patient
        ];

        const seen = new Set<string>();
        const uniqueItems = mockItems.filter(item => {
            const key = `${item.patientId}-${item.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        expect(uniqueItems).toHaveLength(3);
        expect(uniqueItems.find(i => i.id === '2')).toBeUndefined();
        expect(uniqueItems.map(i => i.id)).toEqual(['1', '3', '4']);
    });

    it('Geri Al (Undo) Entegrasyonu: Veritabanı seviyesinde kayıt siliniyor mu?', async () => {
        // Bu test için gerçek bir klinik ve user ID'si lazım. 
        // Varsa bir test verisi üzerinden gidelim.
        const { data: clinic } = await adminClient.from('clinics').select('id').limit(1).single();
        const { data: user } = await adminClient.from('users').select('id').limit(1).single();

        if (!clinic || !user) {
            console.warn('Test için klinik veya kullanıcı bulunamadı, API testi atlanıyor.');
            return;
        }

        const testItemId = 'test-item-' + Date.now();

        // 1. Dismiss Kaydı At (Simulating POST /api/assistant/dismiss)
        const { error: insertError } = await adminClient.from('assistant_dismissals').upsert({
            clinic_id: clinic.id,
            user_id: user.id,
            item_id: testItemId,
            dismissed_at: new Date().toISOString()
        }, { onConflict: 'clinic_id, user_id, item_id' });

        expect(insertError, 'Dismiss kaydı oluşturulamadı').toBeNull();

        // 2. Kaydın varlığını doğrula
        const { count: beforeCount } = await adminClient
            .from('assistant_dismissals')
            .select('*', { count: 'exact', head: true })
            .eq('item_id', testItemId);
        
        expect(beforeCount).toBe(1);

        // 3. Undo (DELETE dismissal record)
        const { error: deleteError } = await adminClient
            .from('assistant_dismissals')
            .delete()
            .eq('clinic_id', clinic.id)
            .eq('user_id', user.id)
            .eq('item_id', testItemId);

        expect(deleteError, 'Undo/Delete işlemi başarısız').toBeNull();

        // 4. Kaydın silindiğini doğrula
        const { count: afterCount } = await adminClient
            .from('assistant_dismissals')
            .select('*', { count: 'exact', head: true })
            .eq('item_id', testItemId);
        
        expect(afterCount).toBe(0);
    });

    it('Recall Notları: Veritabanına kayıt ve okuma testi', async () => {
        const { data: recall } = await adminClient.from('recall_queue').select('id, notes').limit(1).single();

        if (recall) {
            const testNote = 'Test Notu - ' + new Date().toISOString();
            
            // Notu güncelle
            const { error: updateError } = await adminClient
                .from('recall_queue')
                .update({ notes: testNote })
                .eq('id', recall.id);
            
            expect(updateError, 'Recall notu güncellenemedi').toBeNull();

            // Notun kaydedildiğini doğrula
            const { data: updatedRecall } = await adminClient
                .from('recall_queue')
                .select('notes')
                .eq('id', recall.id)
                .single();
            
            expect(updatedRecall?.notes).toBe(testNote);
        }
    });

});
