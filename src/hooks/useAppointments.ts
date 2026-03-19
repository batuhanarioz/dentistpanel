"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import { format, addDays, subDays, getDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { ORDERED_DAYS } from "@/constants/days";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentView = "grid" | "week" | "list";
export type ZoomLevel = 15 | 30 | 60;

export type ExtendedStatus =
    | "confirmed"
    | "scheduled"
    | "arrived"
    | "in_treatment"
    | "completed"
    | "no_show"
    | "cancelled";

export interface AppEvent {
    id: string;
    date: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
    patientName: string;
    patientPhone: string;
    patientId: string;
    doctorId: string | null;
    doctorName: string;
    treatmentType: string;
    status: ExtendedStatus;
    channel?: string;
    patientNote?: string;
    treatmentNote?: string;
    estimatedAmount?: number;
    tags?: string[];
}

export interface DoctorOption {
    id: string;
    full_name: string;
    role?: string;
}

// ─── Status Display Helpers ───────────────────────────────────────────────────

export const STATUS_LABELS: Record<ExtendedStatus, string> = {
    confirmed: "Planlandı",
    scheduled: "Planlandı",
    arrived: "Geldi",
    in_treatment: "Tedavide",
    completed: "Tamamlandı",
    no_show: "Gelmedi",
    cancelled: "İptal",
};

export const STATUS_BADGE_COLORS: Record<ExtendedStatus, string> = {
    confirmed: "bg-blue-100 text-blue-800",
    scheduled: "bg-blue-100 text-blue-800",
    arrived: "bg-sky-100 text-sky-800",
    in_treatment: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
    no_show: "bg-rose-100 text-rose-800",
    cancelled: "bg-slate-100 text-slate-500",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppointments() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { clinicId, workingHours: clinicWorkingHours, workingHoursOverrides } = useClinic() as any;
    const queryClient = useQueryClient();

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
    const [zoom, setZoom] = useState<ZoomLevel>(30);
    const [view, setView] = useState<AppointmentView>("grid");
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

    const dateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

    // Week calculation
    const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
    const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
    const weekDays = useMemo(() => eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }), [currentWeekStart, currentWeekEnd]);

    const weekRangeStr = useMemo(() => {
        const start = format(currentWeekStart, "d MMM", { locale: tr });
        const end = format(currentWeekEnd, "d MMM yyyy", { locale: tr });
        return `${start} — ${end}`;
    }, [currentWeekStart, currentWeekEnd]);

    const goToPrev = useCallback(() => {
        if (view === "week") setSelectedDate(d => subDays(d, 7));
        else setSelectedDate(d => subDays(d, 1));
    }, [view]);

    const goToNext = useCallback(() => {
        if (view === "week") setSelectedDate(d => addDays(d, 7));
        else setSelectedDate(d => addDays(d, 1));
    }, [view]);

    const goToToday = useCallback(() => setSelectedDate(new Date()), []);

    // Doctors
    const { data: doctors = [] } = useQuery<DoctorOption[]>({
        queryKey: ["appointmentDoctors", clinicId],
        queryFn: async () => {
            if (!clinicId) return [];
            const { data } = await supabase
                .from("users")
                .select("id, full_name, role")
                .eq("clinic_id", clinicId)
                .neq("role", UserRole.SUPER_ADMIN);
            return (data || []) as DoctorOption[];
        },
        enabled: !!clinicId,
        staleTime: 10 * 60 * 1000, // Doktor listesi nadiren değişir — 10 dk cache
    });

    const fetchRange = useMemo(() => {
        if (view === "grid") return { start: dateStr, end: dateStr };
        return {
            start: format(currentWeekStart, "yyyy-MM-dd"),
            end: format(currentWeekEnd, "yyyy-MM-dd")
        };
    }, [view, dateStr, currentWeekStart, currentWeekEnd]);

    const { data: rawAppointments = [], isLoading: loading } = useQuery({
        queryKey: ["appointments", fetchRange.start, fetchRange.end, clinicId],
        staleTime: 60 * 1000, // Randevular sık değişir — 1 dk
        queryFn: async () => {
            if (!clinicId) return [];
            const { data, error } = await supabase
                .from("appointments")
                .select(`
                    id, starts_at, ends_at, status, treatment_type, patient_note, internal_note, clinic_id, doctor_id,
                    patients(id, full_name, phone, email, birth_date),
                    doctor:users!doctor_id(id, full_name)
                `)
                .eq("clinic_id", clinicId)
                .gte("starts_at", `${fetchRange.start}T00:00:00`)
                .lte("starts_at", `${fetchRange.end}T23:59:59`)
                .order("starts_at", { ascending: true });

            if (error) throw error;

            return (data || []).map(row => {
                const startDate = new Date(row.starts_at);
                const endDate = new Date(row.ends_at);
                const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

                return {
                    id: row.id,
                    date: format(startDate, "yyyy-MM-dd"),
                    startHour: startDate.getHours(),
                    startMinute: startDate.getMinutes(),
                    durationMinutes: duration,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    patientName: (row.patients as any)?.full_name || "İsimsiz",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    phone: (row.patients as any)?.phone || "",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    patientId: (row.patients as any)?.id,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    doctor: (row.doctor as any)?.full_name,
                    doctorId: row.doctor_id,
                    treatmentType: row.treatment_type || "",
                    status: row.status,
                    patientNote: row.patient_note,
                    treatmentNote: row.internal_note,
                };
            });
        },
        enabled: !!clinicId,
    });

    const allEvents = useMemo<AppEvent[]>(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rawAppointments.map((ca: any) => ({
            id: ca.id,
            date: ca.date,
            startHour: ca.startHour,
            startMinute: ca.startMinute,
            durationMinutes: ca.durationMinutes,
            patientName: ca.patientName,
            patientPhone: ca.phone || "",
            patientId: ca.patientId,
            doctorId: ca.doctorId,
            doctorName: ca.doctor || "Hekim atanmadı",
            treatmentType: ca.treatmentType || "",
            status: ca.status as ExtendedStatus,
            patientNote: ca.patientNote,
            treatmentNote: ca.treatmentNote,
        }));
    }, [rawAppointments]);

    const allSelectableDoctors = useMemo<DoctorOption[]>(() => {
        // Strict medical roles ONLY
        const medicalRoles = [UserRole.DOKTOR, UserRole.ADMIN_DOCTOR];

        const list: DoctorOption[] = doctors
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter(u => medicalRoles.includes(u.role as any))
            .map(d => ({ id: d.id, full_name: d.full_name }));

        // Discovery: We ONLY add a non-medical user if they have an appointment 
        // THAT IS CURRENTLY VISIBLE in allEvents (current scope).
        // If 'Batuhan' has 1 appointment in the list, he shows up. 
        // If he has 0 in THIS SCOPE, he should NOT show up even if he once had one.
        const map = new Map<string, string>();
        for (const e of allEvents) {
            if (e.doctorId && e.doctorName) {
                const isAlreadyInList = list.some(d => d.id === e.doctorId);
                if (!isAlreadyInList) {
                    map.set(e.doctorId, e.doctorName);
                }
            }
        }

        const discovered = Array.from(map.entries()).map(([id, full_name]) => ({ id, full_name }));
        const combined = [...list, ...discovered];

        // Always include unassigned at the bottom
        if (!combined.find(d => d.id === "unassigned")) {
            combined.push({ id: "unassigned", full_name: "Atanmamış" });
        }
        return combined;
    }, [doctors, allEvents]);

    // Use a flag to ensure initial selection only happens once
    const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

    useEffect(() => {
        if (!loading && allSelectableDoctors.length > 0 && !hasInitializedSelection) {
            setSelectedDoctorIds(allSelectableDoctors.map(d => d.id));
            setHasInitializedSelection(true);
        }
    }, [allSelectableDoctors, loading, hasInitializedSelection]);

    const eventCountsByDoctor = useMemo(() => {
        const counts: Record<string, number> = {};
        allEvents.forEach(e => {
            const id = e.doctorId || "unassigned";
            counts[id] = (counts[id] || 0) + 1;
        });
        return counts;
    }, [allEvents]);

    const filteredEvents = useMemo<AppEvent[]>(() => {
        if (selectedDoctorIds.length === 0) return [];
        if (selectedDoctorIds.length === allSelectableDoctors.length) return allEvents;
        return allEvents.filter((e) => {
            const id = e.doctorId || "unassigned";
            return selectedDoctorIds.includes(id);
        });
    }, [allEvents, selectedDoctorIds, allSelectableDoctors.length]);

    const workingHours = useMemo(() => {
        const dayIdx = getDay(selectedDate);
        const dayName = ORDERED_DAYS[dayIdx === 0 ? 6 : dayIdx - 1];
        const base = clinicWorkingHours?.[dayName] || { open: "08:00", close: "19:00" };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const override = workingHoursOverrides?.find((o: any) => o.date === dateStr);
        return override || base;
    }, [selectedDate, dateStr, clinicWorkingHours, workingHoursOverrides]);

    const startHour = useMemo(() => parseInt(workingHours.open?.split(":")[0]) || 8, [workingHours]);
    const endHour = useMemo(() => parseInt(workingHours.close?.split(":")[0]) || 19, [workingHours]);

    const visibleDoctors = useMemo<DoctorOption[]>(() => {
        if (selectedDoctorIds.length > 0) {
            return allSelectableDoctors.filter(d => selectedDoctorIds.includes(d.id));
        }
        return allSelectableDoctors;
    }, [allSelectableDoctors, selectedDoctorIds]);

    const handleEventDrop = useCallback(async (
        eventId: string,
        durationMinutes: number,
        newHour: number,
        newMinute: number,
        newDoctorId: string,
        newDateStr?: string
    ) => {
        if (!clinicId) return;
        const targetDate = newDateStr || dateStr;
        const base = new Date(`${targetDate}T00:00:00`);
        const newStart = new Date(base);
        newStart.setHours(newHour, newMinute, 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(["appointments", fetchRange.start, fetchRange.end, clinicId], (old: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Array.isArray(old) ? old : []).map((row: any) => {
                if (row.id !== eventId) return row;
                return {
                    ...row,
                    date: targetDate,
                    startHour: newHour,
                    startMinute: newMinute,
                    durationMinutes,
                    doctorId: newDoctorId === "unassigned" ? null : newDoctorId,
                };
            })
        );

        try {
            const { error } = await supabase
                .from("appointments")
                .update({
                    starts_at: newStart.toISOString(),
                    ends_at: newEnd.toISOString(),
                    doctor_id: newDoctorId === "unassigned" ? null : newDoctorId
                })
                .eq("id", eventId)
                .eq("clinic_id", clinicId);
            if (error) throw error;
        } catch {
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        }
    }, [clinicId, dateStr, queryClient, fetchRange]);

    const handleStatusChange = useCallback(async (eventId: string, newStatus: ExtendedStatus) => {
        if (!clinicId) return;
        await supabase
            .from("appointments")
            .update({ status: newStatus })
            .eq("id", eventId)
            .eq("clinic_id", clinicId);
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }, [clinicId, queryClient]);

    return {
        selectedDate, setSelectedDate,
        selectedDoctorIds, setSelectedDoctorIds,
        zoom, setZoom,
        view, setView,
        selectedAppointmentId, setSelectedAppointmentId,
        doctors: allSelectableDoctors,
        visibleDoctors,
        filteredEvents,
        totalCount: filteredEvents.length,
        eventCounts: eventCountsByDoctor,
        loading,
        dateStr, weekDays, weekRangeStr,
        startHour, endHour,
        goToPrev, goToNext, goToToday,
        handleEventDrop, handleStatusChange,
    };
}
