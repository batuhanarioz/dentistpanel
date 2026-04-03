"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Announcement } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";

interface AnnouncementContextValue {
    announcements: Announcement[];
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null);

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
    const { clinicId, userId } = useClinic();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAnnouncements = useCallback(async () => {
        if (!userId || !clinicId) {
            setLoading(false);
            return;
        }

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

    // Initial load
    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    // Real-time subscription - ONLY ONE FOR THE WHOLE APP
    useEffect(() => {
        if (!clinicId || !userId) return;

        const uniqueId = Math.random().toString(36).substring(7);
        const channelName = `announcements_shared_${clinicId}_${uniqueId}`;
        
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "announcements" },
                () => { loadAnnouncements(); }
            )
            .on(
                "postgres_changes",
                { 
                    event: "*", 
                    schema: "public", 
                    table: "announcement_reads", 
                    filter: `user_id=eq.${userId}` 
                },
                () => { loadAnnouncements(); }
            );

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinicId, userId, loadAnnouncements]);

    const markAsRead = async (announcementId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('announcement_reads')
            .insert({ announcement_id: announcementId, user_id: userId });

        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        }
    };

    return (
        <AnnouncementContext.Provider value={{ announcements, loading, markAsRead, refresh: loadAnnouncements }}>
            {children}
        </AnnouncementContext.Provider>
    );
}

export function useAnnouncementsData() {
    const context = useContext(AnnouncementContext);
    if (!context) {
        throw new Error("useAnnouncementsData must be used within an AnnouncementProvider");
    }
    return context;
}
