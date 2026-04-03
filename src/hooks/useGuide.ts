"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import type { TreatmentLibraryItem } from "@/types/database";

async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
}

/** Kliniğe özel protocol override'ları merge edilmiş tedavi listesini getirir. */
export function useGuide() {
    const { clinicId } = useClinic();
 
    return useQuery<TreatmentLibraryItem[]>({
        queryKey: ["guide", clinicId],
        enabled: !!clinicId,
        staleTime: 15 * 60_000, // 15 dakika — tedavi kütüphanesi nadiren değişir
        queryFn: async () => {
            const token = await getToken();
            const res = await fetch("/api/treatment-library", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json() as { items: TreatmentLibraryItem[] };
            return json.items;
        },
    });
}
 
/** Admin/Doktor: klinik bazlı protokol notu günceller (upsert). */
export function useUpdateProtocol() {
    const { clinicId } = useClinic();
    const queryClient = useQueryClient();
 
    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
            const token = await getToken();
            const res = await fetch(`/api/treatment-library/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ notes }),
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guide", clinicId] });
        },
    });
}
