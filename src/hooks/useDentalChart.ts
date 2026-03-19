"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { getDentalChart, saveDentalChart } from "@/lib/api";
import type { TeethData } from "@/types/database";
import * as Sentry from "@sentry/nextjs";

export function useDentalChart(patientId?: string) {
    const { clinicId } = useClinic();

    return useQuery({
        queryKey: ["dentalChart", clinicId, patientId],
        queryFn: () => getDentalChart(patientId!, clinicId!),
        enabled: !!clinicId && !!patientId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useDentalChartMutation(patientId?: string) {
    const { clinicId, userId } = useClinic();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (teethData: TeethData) =>
            saveDentalChart(patientId!, clinicId!, userId!, teethData),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["dentalChart", clinicId, patientId],
            });
        },
        onError: (err) => {
            Sentry.captureException(err, {
                tags: { section: "dentalChart", action: "save" },
            });
        },
    });
}
