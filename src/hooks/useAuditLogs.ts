import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuditLog } from "@/types/database";
import { useClinic } from "../app/context/ClinicContext";

export type PatientMap = Record<string, string>; // patient_id → full_name
export type DoctorMap = Record<string, string>;  // doctor_id (user_id) → full_name

export type AuditFilter = {
    userId?: string | null;
    dateRange?: "today" | "7d" | "30d" | "all";
    entityType?: string | "all";
    action?: "all" | "INSERT" | "UPDATE" | "DELETE" | "ACCESS";
};

export function useAuditLogs() {
    const { clinicId, isAdmin } = useClinic();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [patientMap, setPatientMap] = useState<PatientMap>({});
    const [doctorMap, setDoctorMap] = useState<DoctorMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<AuditFilter>({
        userId: null,
        dateRange: "7d",
        entityType: "all",
        action: "all",
    });
    const PAGE_SIZE = 25;

    const fetchLogs = async () => {
        if (!clinicId || !isAdmin) return;

        try {
            setLoading(true);
            let query = supabase
                .from("audit_logs")
                .select(`
          id, clinic_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, created_at,
          user:users(full_name, email)
        `)
                .eq("clinic_id", clinicId)
                .order("created_at", { ascending: false });

            // Filters
            if (filters.userId === "system") {
                query = query.is("user_id", null);
            } else if (filters.userId) {
                query = query.eq("user_id", filters.userId);
            }

            if (filters.entityType && filters.entityType !== "all") {
                query = query.eq("entity_type", filters.entityType);
            }

            // INSERT / DELETE DB-level filter
            if (filters.action === "INSERT" || filters.action === "DELETE") {
                query = query.eq("action", filters.action);
            } else if (filters.action === "ACCESS" || filters.action === "UPDATE") {
                // Her ikisi de UPDATE — client-side ayrım yapılacak
                query = query.eq("action", "UPDATE");
            }

            const now = new Date();
            if (filters.dateRange === "today") {
                const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                query = query.gte("created_at", start);
            } else if (filters.dateRange === "7d") {
                const start = new Date(now.setDate(now.getDate() - 7)).toISOString();
                query = query.gte("created_at", start);
            } else if (filters.dateRange === "30d") {
                const start = new Date(now.setDate(now.getDate() - 30)).toISOString();
                query = query.gte("created_at", start);
            }

            const { data, error: supabaseError } = await query.range(
                page * PAGE_SIZE,
                (page + 1) * PAGE_SIZE - 1
            );

            if (supabaseError) throw supabaseError;

            // Client-side: ACCESS vs UPDATE ayrımı
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let filtered: any[] = data || [];
            if (filters.action === "ACCESS") {
                filtered = filtered.filter(l =>
                    JSON.stringify(l.old_data) === JSON.stringify(l.new_data)
                );
            } else if (filters.action === "UPDATE") {
                filtered = filtered.filter(l =>
                    JSON.stringify(l.old_data) !== JSON.stringify(l.new_data)
                );
            }

            if (page === 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLogs(filtered as any);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLogs((prev) => [...prev, ...filtered] as any);
            }

            // Tüm loglardan patient_id ve doctor_id topla
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const patientIds = new Set<string>(filtered.flatMap((l: any) => {
                const ids: string[] = [];
                const d = l.new_data || l.old_data;
                if (d?.patient_id) ids.push(d.patient_id);
                return ids;
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const doctorIds = new Set<string>(filtered.flatMap((l: any) => {
                const ids: string[] = [];
                if (l.new_data?.doctor_id) ids.push(l.new_data.doctor_id);
                if (l.old_data?.doctor_id) ids.push(l.old_data.doctor_id);
                return ids;
            }));

            await Promise.all([
                patientIds.size > 0
                    ? supabase.from("patients").select("id, full_name").in("id", Array.from(patientIds))
                        .then(({ data }) => {
                            if (data) setPatientMap(prev => ({
                                ...prev,
                                ...Object.fromEntries(data.map(p => [p.id, p.full_name]))
                            }));
                        })
                    : Promise.resolve(),
                doctorIds.size > 0
                    ? supabase.from("users").select("id, full_name").in("id", Array.from(doctorIds))
                        .then(({ data }) => {
                            if (data) setDoctorMap(prev => ({
                                ...prev,
                                ...Object.fromEntries(data.map(u => [u.id, u.full_name || u.id]))
                            }));
                        })
                    : Promise.resolve(),
            ]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
            console.error("Audit log loading error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [clinicId, isAdmin, page, filters]);

    const loadMore = () => setPage((p) => p + 1);

    const updateFilters = (newFilters: Partial<AuditFilter>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    return {
        logs,
        patientMap,
        doctorMap,
        loading,
        error,
        filters,
        updateFilters,
        loadMore,
        hasMore: logs.length >= (page * PAGE_SIZE) + (logs.length % PAGE_SIZE === 0 ? PAGE_SIZE : 0),
        refresh: () => {
            setPage(0);
            fetchLogs();
        },
    };
}
