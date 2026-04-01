"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import type { RecallQueueItem, RecallStatus } from "@/types/database";

async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
}

/** Kliniğin tüm recall kayıtlarını (tüm statusler) tek seferde çeker. */
export function useRecallQueue() {
    const { clinicId } = useClinic();

    return useQuery<RecallQueueItem[]>({
        queryKey: ["recall-queue", clinicId],
        enabled: !!clinicId,
        staleTime: 30_000,
        refetchInterval: 60000, // 1 minute auto-sync
        queryFn: async () => {
            const token = await getToken();
            const res = await fetch("/api/recall?all=1", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json() as { items: RecallQueueItem[] };
            return json.items;
        },
    });
}

/** Belirli bir hastanın tüm recall geçmişini çeker (PatientDetailModal için). */
export function usePatientRecallHistory(patientId: string | undefined) {
    const { clinicId } = useClinic();

    return useQuery<RecallQueueItem[]>({
        queryKey: ["recall-patient", clinicId, patientId],
        enabled: !!clinicId && !!patientId,
        staleTime: 60_000,
        queryFn: async () => {
            const token = await getToken();
            const res = await fetch(`/api/recall?patient_id=${patientId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json() as { items: RecallQueueItem[] };
            return json.items;
        },
    });
}

export function useUpdateRecallStatus() {
    const qc = useQueryClient();
    const { clinicId } = useClinic();

    return useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: RecallStatus; notes?: string }) => {
            const token = await getToken();
            const res = await fetch(`/api/recall/${id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ status, notes }),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        // Optimistic update
        onMutate: async (newItem) => {
            await qc.cancelQueries({ queryKey: ["recall-queue", clinicId] });
            const previousItems = qc.getQueryData<RecallQueueItem[]>(["recall-queue", clinicId]);

            if (previousItems) {
                qc.setQueryData<RecallQueueItem[]>(["recall-queue", clinicId], (old) => 
                    old?.map(item => item.id === newItem.id ? { ...item, status: newItem.status } : item)
                );
            }

            return { previousItems };
        },
        onError: (err, newItem, context) => {
            if (context?.previousItems) {
                qc.setQueryData(["recall-queue", clinicId], context.previousItems);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ["recall-queue", clinicId] });
        },
    });
}
