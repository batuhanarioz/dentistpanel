"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import {
    getTreatmentPlans,
    createTreatmentPlanWithAppointment,
    updateTreatmentPlan,
    deleteTreatmentPlan,
    deleteTreatmentPlanItem,
    upsertTreatmentPlanItem,
    TreatmentPlanWithItems,
} from "@/lib/api";
import { TreatmentPlanItem, AppointmentChannel } from "@/types/database";

export type { TreatmentPlanWithItems };

// ─── Hook: klinik geneli veya hasta bazlı planlar ────────────────────────────

export function useTreatmentPlans(patientId?: string) {
    const { clinicId } = useClinic();

    return useQuery({
        queryKey: ["treatmentPlans", clinicId, patientId ?? "all"],
        queryFn: () => getTreatmentPlans(clinicId || "", patientId),
        enabled: !!clinicId,
        staleTime: 2 * 60 * 1000,
    });
}

// ─── Hook: plan oluşturma + isteğe bağlı randevu ─────────────────────────────

export interface CreatePlanInput {
    patient_id: string;
    appointment_id?: string | null;
    doctor_id?: string | null;
    title?: string | null;
    note?: string | null;
    items: Array<{
        procedure_name: string;
        tooth_no?: string | null;
        description?: string | null;
        quantity: number;
        unit_price: number;
        assigned_doctor_id?: string | null;
        sort_order?: number;
    }>;
    nextAppointment?: {
        starts_at: string;
        ends_at: string;
        treatment_type?: string | null;
        doctor_id?: string | null;
        channel?: AppointmentChannel;
    } | null;
}

export function useTreatmentPlanMutations(patientId?: string) {
    const { clinicId, userId } = useClinic();
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["treatmentPlans", clinicId] });
        // randevu sorguları da güncellenmeli (yeni randevu oluşturulabilir)
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
    };

    const createPlan = useMutation({
        mutationFn: (input: CreatePlanInput) => {
            const total = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
            return createTreatmentPlanWithAppointment(
                clinicId || "",
                {
                    patient_id: input.patient_id,
                    appointment_id: input.appointment_id ?? null,
                    doctor_id: input.doctor_id ?? null,
                    created_by: userId ?? null,
                    title: input.title ?? null,
                    note: input.note ?? null,
                    total_estimated_amount: total > 0 ? total : null,
                    items: input.items,
                },
                input.nextAppointment ?? null
            );
        },
        onSuccess: invalidate,
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TreatmentPlanWithItems["status"] }) =>
            updateTreatmentPlan(id, clinicId || "", { status }),
        onSuccess: invalidate,
    });

    const removePlan = useMutation({
        mutationFn: (id: string) => deleteTreatmentPlan(id, clinicId || ""),
        onSuccess: invalidate,
    });

    const upsertItem = useMutation({
        mutationFn: (item: Parameters<typeof upsertTreatmentPlanItem>[1]) =>
            upsertTreatmentPlanItem(clinicId || "", item),
        onSuccess: invalidate,
    });

    const removeItem = useMutation({
        mutationFn: (id: string) => deleteTreatmentPlanItem(id, clinicId || ""),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["treatmentPlans", clinicId, patientId ?? "all"] }),
    });

    return { createPlan, updateStatus, removePlan, upsertItem, removeItem };
}

// ─── Yardımcı: plan durumu etiket + renk ─────────────────────────────────────

export const PLAN_STATUS_CONFIG: Record<
    TreatmentPlanWithItems["status"],
    { label: string; bg: string; text: string; dot: string }
> = {
    draft:       { label: "Taslak",       bg: "bg-slate-100",   text: "text-slate-600",  dot: "bg-slate-400" },
    planned:     { label: "Planlandı",    bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
    approved:    { label: "Onaylandı",    bg: "bg-indigo-50",   text: "text-indigo-700", dot: "bg-indigo-500" },
    in_progress: { label: "Devam Ediyor", bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-500" },
    completed:   { label: "Tamamlandı",   bg: "bg-emerald-50",  text: "text-emerald-700",dot: "bg-emerald-500" },
    cancelled:   { label: "İptal",        bg: "bg-rose-50",     text: "text-rose-700",   dot: "bg-rose-400" },
};

export const ITEM_STATUS_CONFIG: Record<
    TreatmentPlanItem["status"],
    { label: string; bg: string; text: string }
> = {
    planned:     { label: "Planlandı",    bg: "bg-blue-50",    text: "text-blue-700" },
    approved:    { label: "Onaylandı",    bg: "bg-indigo-50",  text: "text-indigo-700" },
    in_progress: { label: "Devam Ediyor", bg: "bg-amber-50",   text: "text-amber-700" },
    completed:   { label: "Tamamlandı",   bg: "bg-emerald-50", text: "text-emerald-700" },
    cancelled:   { label: "İptal",        bg: "bg-rose-50",    text: "text-rose-700" },
};
