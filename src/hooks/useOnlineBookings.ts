import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPendingOnlineBookingsCount } from "@/lib/api";
import { useClinic } from "@/app/context/ClinicContext";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useOnlineBookings() {
    const { clinicId } = useClinic();
    const queryClient = useQueryClient();

    const { data: pendingCount = 0, isLoading } = useQuery({
        queryKey: ["onlineBookingsCount", clinicId],
        queryFn: () => getPendingOnlineBookingsCount(clinicId || ""),
        enabled: !!clinicId,
        staleTime: 5 * 60 * 1000, // 5 dakika normalde cache'ten okur
    });

    // Real-time dinleme: Yeni bir randevu düştüğünde veya statüsü değiştiğinde sayıyı tazele
    useEffect(() => {
        if (!clinicId) return;

        // Benzersiz bir kanal ismi oluşturarak "after subscribe" hatasını önlüyoruz
        const channelName = `online_bookings_count_${clinicId}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "online_booking_requests",
                    filter: `clinic_id=eq.${clinicId}`,
                },
                () => {
                    // Veritabanında bir değişiklik olduğunda React Query cache'ini invalid et
                    queryClient.invalidateQueries({ queryKey: ["onlineBookingsCount", clinicId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinicId, queryClient]);

    return { pendingCount, isLoading };
}
