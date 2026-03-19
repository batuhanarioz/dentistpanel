import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppointmentsForDate } from "@/lib/api";
import { useChecklist, ControlItem } from "./useChecklist";

export type { ControlItem };

export type DashboardAppointment = {
    id: string;
    startsAt: string;
    endsAt: string;
    patientName: string;
    patientPhone: string | null;
    doctorName: string;
    doctorId: string | null;
    channel: string;
    status: "confirmed" | "cancelled" | "no_show" | "completed";
    treatmentType: string | null;
    estimatedAmount: number | null;
    treatmentNote?: string;
};

export type DoctorOption = {
    id: string;
    full_name: string;
};

// Types moved to useChecklist.ts


function formatTime(dateString: string) {
    const d = new Date(dateString);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
}

export function useDashboard() {
    const queryClient = useQueryClient();
    const clinic = useClinic();
    const baseToday = useMemo(() => localDateStr(), []);
    const [viewOffsetAppointments, setViewOffsetAppointments] = useState<0 | 1>(0);
    const [viewOffsetControls, setViewOffsetControls] = useState<0 | 1>(0);

    const viewDateAppointments = useMemo(() => {
        const d = new Date(baseToday + "T00:00:00");
        d.setDate(d.getDate() + viewOffsetAppointments);
        return localDateStr(d);
    }, [baseToday, viewOffsetAppointments]);

    const viewDateControls = useMemo(() => {
        const d = new Date(baseToday + "T00:00:00");
        d.setDate(d.getDate() + viewOffsetControls);
        return localDateStr(d);
    }, [baseToday, viewOffsetControls]);

    // Fetch Appointments for List
    const { data: rawCalendarAppointments = [], isLoading: loading } = useQuery({
        queryKey: ["dashboardAppointments", viewDateAppointments, clinic.clinicId],
        queryFn: async () => {
            if (!clinic.clinicId) return [];
            const data = await getAppointmentsForDate(viewDateAppointments, clinic.clinicId);
            return data;
        },
        enabled: !!clinic.clinicId,
        staleTime: 60 * 1000, // Randevular sık değişir — 1 dk
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapCalendarToDashboard = (ca: any): DashboardAppointment => {
        const start = new Date(`${ca.date}T${ca.startHour.toString().padStart(2, "0")}:${ca.startMinute.toString().padStart(2, "0")}:00`);
        const end = new Date(start.getTime() + ca.durationMinutes * 60000);

        return {
            id: ca.id,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            patientName: ca.patientName,
            patientPhone: ca.phone,
            doctorName: ca.doctor || "Hekim atanmadı",
            doctorId: ca.doctorId,
            channel: ca.channel,
            status: ca.dbStatus,
            treatmentType: ca.treatmentType,
            estimatedAmount: ca.estimatedAmount ? parseFloat(ca.estimatedAmount) : null,
            treatmentNote: ca.treatmentNote,
        };
    };

    const rawAppointments = useMemo(() => {
        return rawCalendarAppointments.map(mapCalendarToDashboard);
    }, [rawCalendarAppointments]);

    // Fetch Doctors
    const { data: doctorsData = [] } = useQuery({
        queryKey: ["doctors", clinic.clinicId],
        queryFn: async () => {
            if (!clinic.clinicId) return [];
            const { data } = await supabase.from("users")
                .select("id, full_name")
                .eq("clinic_id", clinic.clinicId)
                .eq("role", UserRole.DOKTOR);
            return (data || []) as DoctorOption[];
        },
        enabled: !!clinic.clinicId,
        staleTime: 10 * 60 * 1000, // Doktorlar nadiren değişir — 10 dk
    });

    const doctors = doctorsData;

    // Filter and sort appointments for the list
    const appointments = useMemo(() => {
        const sorted = [...rawAppointments].sort((a, b) => {
            const dateA = new Date(a.startsAt).getTime();
            const dateB = new Date(b.startsAt).getTime();
            const now = new Date().getTime();

            // Completed appointments always go to the bottom
            if (a.status === "completed" && b.status !== "completed") return 1;
            if (a.status !== "completed" && b.status === "completed") return -1;

            // Prioritize upcoming confirmed appointments if it's today
            if (viewOffsetAppointments === 0) {
                const isUpcomingA = a.status === "confirmed" && dateA > now;
                const isUpcomingB = b.status === "confirmed" && dateB > now;

                if (isUpcomingA && !isUpcomingB) return -1;
                if (!isUpcomingA && isUpcomingB) return 1;
            }

            return dateA - dateB;
        });

        // Return all appointments including completed ones
        return sorted;
    }, [rawAppointments, viewOffsetAppointments]);


    // Checklist Items logic (New Persistent System)
    const { controlItems, checklistLoading } = useChecklist(viewOffsetControls);

    const handleAssignDoctor = async (appointmentId: string, doctorId: string) => {
        if (!doctorId || !clinic.clinicId) return;
        await supabase.from("appointments").update({ doctor_id: doctorId }).eq("id", appointmentId).eq("clinic_id", clinic.clinicId);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointments"] });
        queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
    };

    const handleStatusChange = async (appointmentId: string, newStatus: DashboardAppointment["status"]) => {
        if (!clinic.clinicId) return;
        await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId).eq("clinic_id", clinic.clinicId);
        // Invalidate both appointments and control queries to refresh the lists
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointments"] });
        queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
        queryClient.invalidateQueries({ queryKey: ["paymentsForAppointments"] });
    };

    return {
        appointments,
        loading,
        checklistLoading,
        doctors,
        controlItems,
        viewOffsetAppointments,
        setViewOffsetAppointments,
        viewOffsetControls,
        setViewOffsetControls,
        handleAssignDoctor,
        handleStatusChange,
    };
}
