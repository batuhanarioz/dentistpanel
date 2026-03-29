"use client";

import { useQuery } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";

export interface FinanceKPI {
    revenue: number;
    materialCost: number;
    doctorPrim: number;
    netProfit: number;
    openReceivables: number;
    unmatchedCount: number;
}

export interface MethodRow {
    label: string;
    revenue: number;
    count: number;
}

export interface DoctorRow {
    doctorId: string;
    name: string;
    revenue: number;
    materialCost: number;
    doctorPrim: number;
    netProfit: number;
}

export interface TreatmentRow {
    name: string;
    count: number;
    revenue: number;
    materialCost: number;
    doctorPrim: number;
    netProfit: number;
}

export interface FinanceDashboardData {
    period: { from: string; to: string };
    kpi: FinanceKPI;
    byDoctor: DoctorRow[];
    byTreatment: TreatmentRow[];
    byMethod: MethodRow[];
}

export function useFinanceDashboard(from: string, to: string) {
    const { clinicId } = useClinic();

    return useQuery<FinanceDashboardData>({
        queryKey: ["finance-dashboard", clinicId, from, to],
        enabled: !!clinicId,
        staleTime: 60_000,
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token ?? "";

            const res = await fetch(
                `/api/finance/dashboard?from=${from}&to=${to}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
    });
}
