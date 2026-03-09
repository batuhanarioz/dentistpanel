import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuditLog } from "@/types/database";
import { useClinic } from "../app/context/ClinicContext";

export type AuditFilter = {
    userId?: string | null;
    dateRange?: "today" | "7d" | "30d" | "all";
    entityType?: string | "all";
};

export function useAuditLogs() {
    const { clinicId, isAdmin } = useClinic();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<AuditFilter>({
        userId: null,
        dateRange: "7d",
        entityType: "all",
    });
    const PAGE_SIZE = 50;

    const fetchLogs = async () => {
        if (!clinicId || !isAdmin) return;

        try {
            setLoading(true);
            let query = supabase
                .from("audit_logs")
                .select(`
          id, clinic_id, user_id, action, entity_type, entity_id, ip_address, user_agent, created_at,
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

            if (page === 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLogs((data || []) as any);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setLogs((prev) => [...prev, ...(data || [])] as any);
            }
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
        loading,
        error,
        filters,
        updateFilters,
        loadMore,
        hasMore: logs.length >= (page * PAGE_SIZE) + (logs.length % PAGE_SIZE === 0 ? PAGE_SIZE : 0), // Simplified logic check
        refresh: () => {
            setPage(0);
            fetchLogs();
        },
    };
}
