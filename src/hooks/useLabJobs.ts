import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { LabJob, LabJobStatus, LAB_JOB_STATUSES } from "@/types/database";

// Re-export for convenience — tüketici dosyalar @/types/database veya hook'tan import edebilir
export type { LabJob, LabJobStatus };
export { LAB_JOB_STATUSES };

export const JOB_TYPES = [
    "Zirkonyum", "Metal-Seramik Köprü", "Tam Seramik", "Kuron",
    "Kısmi Protez", "Tam Protez", "İskelet Protez", "İmplant Üst Yapı",
    "Gece Plağı", "Bleaching Plağı", "Retainer", "Diğer",
];

export const SHADES = [
    "A1", "A2", "A3", "A3.5", "A4",
    "B1", "B2", "B3", "B4",
    "C1", "C2", "C3", "C4",
    "D2", "D3", "D4",
    "Bleach BL1", "Bleach BL2",
];

// ─── Helper ───────────────────────────────────────────────────────────────────

async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = await authHeader();
    const res = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", ...headers, ...options?.headers },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Hata oluştu");
    return json;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Tüm lab işlerini listele */
export function useLabJobs(statusFilter: string = "all", patientId?: string, enabledOverride?: boolean) {
    const { clinicId } = useClinic();
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (patientId) params.set("patient_id", patientId);

    return useQuery({
        queryKey: ["labJobs", clinicId, statusFilter, patientId],
        queryFn: () => apiFetch<{ jobs: LabJob[] }>(`/api/lab-jobs?${params.toString()}`),
        enabled: (enabledOverride !== undefined ? enabledOverride : true) && !!clinicId,
        staleTime: 30_000,
        select: d => d.jobs,
    });
}

/** Yeni lab işi oluştur */
export function useCreateLabJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: {
            patient_id: string;
            appointment_id?: string | null;
            lab_name: string;
            job_type: string;
            shade?: string | null;
            tooth_numbers?: string | null;
            notes?: string | null;
            sent_at?: string;
            expected_at: string;
        }) => apiFetch<{ job: LabJob }>("/api/lab-jobs", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["labJobs"] }),
    });
}

/** Lab işi statüsünü güncelle */
export function useUpdateLabJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: { id: string } & Partial<Pick<LabJob,
            "status" | "lab_name" | "job_type" | "shade" | "tooth_numbers" |
            "notes" | "expected_at" | "received_at"
        >>) => apiFetch<{ job: LabJob }>(`/api/lab-jobs/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["labJobs"] }),
    });
}

/** Yarın randevusu olup lab işi bekleyen hasta/iş çiftlerini döner */
export function useLabAlerts() {
    const { clinicId } = useClinic();

    // Yarınki tarih (Istanbul)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

    return useQuery({
        queryKey: ["labAlerts", clinicId, tomorrowStr],
        queryFn: async () => {
            const headers = await authHeader();
            // Aktif (teslim alınmamış) ve expected_at <= yarın olan işler
            const res = await fetch(`/api/lab-jobs?status=active`, { headers });
            const { jobs }: { jobs: LabJob[] } = await res.json();

            // Yarın randevusu olan hasta ID'leri
            const apptRes = await fetch(
                `/api/lab-jobs/alarm-check?date=${tomorrowStr}`,
                { headers }
            );
            const { patientIds }: { patientIds: string[] } = await apptRes.json();
            const patientSet = new Set(patientIds);

            // Kesişim: aktif lab işi olan ve yarın randevusu olan
            return jobs.filter(j =>
                patientSet.has(j.patient_id) &&
                j.status !== "cancelled" &&
                j.expected_at <= tomorrowStr
            );
        },
        enabled: !!clinicId,
        staleTime: 60_000,
    });
}
