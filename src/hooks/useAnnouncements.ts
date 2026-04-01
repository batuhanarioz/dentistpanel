
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Announcement } from '@/types/database';
import { useClinic } from '@/app/context/ClinicContext';

export function useAnnouncements() {
    const { clinicId, userId } = useClinic();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAnnouncements = useCallback(async () => {
        // ClinicContext'ten gelen bilgileri kullan — tekrar auth/users sorgusu atmıyoruz
        if (!userId || !clinicId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_reads!left(user_id)
                `)
                .or(`target_clinic_id.is.null,target_clinic_id.eq.${clinicId}`)
                .is('announcement_reads.user_id', null)
                .lte('starts_at', now)
                .order('created_at', { ascending: false });

            if (!error) {
                const filtered = (data || []).filter(a => !a.expires_at || new Date(a.expires_at) >= new Date());
                setAnnouncements(filtered);
            }
        } catch (err) {
            console.error('Announcements load error:', err);
        } finally {
            setLoading(false);
        }
    }, [clinicId, userId]);

    const markAsRead = async (announcementId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('announcement_reads')
            .insert({ announcement_id: announcementId, user_id: userId });

        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    return { announcements, loading, markAsRead, refresh: loadAnnouncements };
}
