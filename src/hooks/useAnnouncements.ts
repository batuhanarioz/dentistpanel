
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Announcement } from '@/types/database';

export function useAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get user's clinic_id
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            const clinicId = userData?.clinic_id;

            // 2. Fetch announcements (Global OR for this clinic)
            // Filter by time: started and not expired
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_reads!left(user_id)
                `)
                .or(`target_clinic_id.is.null,target_clinic_id.eq.${clinicId}`)
                .is('announcement_reads.user_id', null)
                .lte('starts_at', now) // Already started
                // .or(`expires_at.is.null,expires_at.gte.${now}`) // Expire check - .or is complex for gte
                .order('created_at', { ascending: false });

            if (!error) {
                // Client-side final filter for expiration to keep the query simpler for Supabase .or/LTE logic
                const filtered = (data || []).filter(a => !a.expires_at || new Date(a.expires_at) >= new Date());
                setAnnouncements(filtered);
            }
        } catch (err) {
            console.error('Announcements load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = async (announcementId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('announcement_reads')
            .insert({
                announcement_id: announcementId,
                user_id: user.id
            });

        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    return { announcements, loading, markAsRead, refresh: loadAnnouncements };
}
