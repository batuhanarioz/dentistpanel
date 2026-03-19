import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { getAnamnesis, saveAnamnesis } from "@/lib/api";
import type { PatientAnamnesis } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

export function useAnamnesis(patientId?: string) {
    const clinic = useClinic();
    const clinicId = clinic.clinicId ?? "";

    return useQuery({
        queryKey: ["anamnesis", patientId, clinicId],
        queryFn: () => getAnamnesis(patientId!, clinicId),
        enabled: !!patientId && !!clinicId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useAnamnesisMutation(patientId?: string) {
    const clinic = useClinic();
    const clinicId = clinic.clinicId ?? "";
    const userId = clinic.userId ?? "";
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            anamnesis: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">
        ) => saveAnamnesis(patientId!, clinicId, userId, anamnesis),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["anamnesis", patientId, clinicId] });
            // Hasta listesini de invalide et (allergies/medical_alerts senkronizasyonu)
            queryClient.invalidateQueries({ queryKey: ["patients"] });
        },
        onError: (err) => {
            Sentry.captureException(err);
        },
    });
}
