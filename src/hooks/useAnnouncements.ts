import { useAnnouncementsData } from '@/app/context/AnnouncementContext';

export function useAnnouncements() {
    return useAnnouncementsData();
}
