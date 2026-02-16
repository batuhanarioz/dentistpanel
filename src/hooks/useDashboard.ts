import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTaskConfigs, getPaymentsForAppointments, getAppointmentsForDate } from "@/lib/api";

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

export type ControlItemType = "status" | "approval" | "doctor" | "payment";
export type ControlItemTone = "critical" | "high" | "medium" | "low";

export type ControlItem = {
    id: string;
    type: ControlItemType;
    tone: ControlItemTone;
    toneLabel: string;
    appointmentId: string;
    patientName: string;
    timeLabel: string;
    treatmentLabel: string;
    actionLabel: string;
    sortTime: number;
};

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

    // Fetch Task Configs
    const { data: taskAssignments = {} } = useQuery({
        queryKey: ["taskConfigs", clinic.clinicId],
        queryFn: () => getTaskConfigs(clinic.clinicId!),
        enabled: !!clinic.clinicId,
    });

    // Fetch Appointments for List
    const { data: rawCalendarAppointments = [], isLoading: loading } = useQuery({
        queryKey: ["dashboardAppointments", viewDateAppointments, clinic.clinicId],
        queryFn: async () => {
            if (!clinic.clinicId) return [];
            const data = await getAppointmentsForDate(viewDateAppointments, clinic.clinicId);
            return data;
        },
        enabled: !!clinic.clinicId,
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
            doctorName: ca.doctor || "Doktor atanmadı",
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
        queryKey: ["doctors"],
        queryFn: async () => {
            const { data } = await supabase.from("users").select("id, full_name").eq("role", UserRole.DOKTOR);
            return (data || []) as DoctorOption[];
        },
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

    // Control Items logic
    const { data: controlCalendarAppointments = [] } = useQuery({
        queryKey: ["dashboardAppointmentsControl", viewDateControls, clinic.clinicId], // usage distinct key
        queryFn: () => getAppointmentsForDate(viewDateControls, clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
    });

    const controlAppointments = useMemo(() => {
        return controlCalendarAppointments.map(mapCalendarToDashboard);
    }, [controlCalendarAppointments]);

    const { data: paymentsMap = {} } = useQuery({
        queryKey: ["paymentsForAppointments", viewDateControls],
        queryFn: () => getPaymentsForAppointments(controlAppointments.map((a: DashboardAppointment) => a.id)),
        enabled: controlAppointments.length > 0,
    });

    const controlItems = useMemo(() => {
        const now = new Date();
        const controls: ControlItem[] = [];
        const userRole = clinic.userRole || UserRole.SEKRETER;
        const userId = clinic.userId;

        const canShowTask = (code: string, apptDoctorId?: string | null) => {
            const config = taskAssignments[code];
            if (!config || !config.enabled) return false;
            if (clinic.isAdmin) return true;
            if (config.role === UserRole.DOKTOR && apptDoctorId === userId) return true;
            return config.role === userRole;
        };

        controlAppointments.forEach((appt: DashboardAppointment) => {
            const startDate = new Date(appt.startsAt);
            const endDate = new Date(appt.endsAt);
            const timeLabel = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
            const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";

            if (endDate < now && appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "no_show") {
                if (canShowTask("STATUS_UPDATE", appt.doctorId)) {
                    controls.push({
                        id: `${appt.id}-status`,
                        type: "status",
                        tone: "critical",
                        toneLabel: "Acil",
                        appointmentId: appt.id,
                        patientName: appt.patientName,
                        timeLabel,
                        treatmentLabel,
                        actionLabel: "Durum güncellemesi bekliyor.",
                        sortTime: endDate.getTime(),
                    });
                }
            }



            if (!appt.doctorId) {
                if (canShowTask("MISSING_DOCTOR", appt.doctorId)) {
                    controls.push({
                        id: `${appt.id}-doctor`,
                        type: "doctor",
                        tone: "low",
                        toneLabel: "Doktor",
                        appointmentId: appt.id,
                        patientName: appt.patientName,
                        timeLabel,
                        treatmentLabel,
                        actionLabel: "Doktor ataması bekliyor.",
                        sortTime: startDate.getTime(),
                    });
                }
            }

            if (appt.status === "completed" && !paymentsMap[appt.id]) {
                if (canShowTask("MISSING_PAYMENT", appt.doctorId)) {
                    controls.push({
                        id: `${appt.id}-payment`,
                        type: "payment",
                        tone: "high",
                        toneLabel: "Ödeme",
                        appointmentId: appt.id,
                        patientName: appt.patientName,
                        timeLabel,
                        treatmentLabel,
                        actionLabel: "Ödeme eklemesi bekliyor.",
                        sortTime: endDate.getTime(),
                    });
                }
            }

            // New Rule: Missing Treatment Note
            if (appt.status === "completed" && !appt.treatmentNote) {
                // Assuming "MISSING_TREATMENT_NOTE" task code exists or use "STATUS_UPDATE" role logic
                if (canShowTask("MISSING_TREATMENT_NOTE", appt.doctorId)) {
                    controls.push({
                        id: `${appt.id}-note`,
                        type: "status",
                        tone: "medium",
                        toneLabel: "Not",
                        appointmentId: appt.id,
                        patientName: appt.patientName,
                        timeLabel,
                        treatmentLabel,
                        actionLabel: "Tedavi notu eksik.",
                        sortTime: endDate.getTime(),
                    });
                }
            }
        });

        controls.sort((a, b) => b.sortTime - a.sortTime);
        return controls;
    }, [controlAppointments, taskAssignments, clinic.isAdmin, clinic.userId, clinic.userRole, paymentsMap]);

    const handleAssignDoctor = async (appointmentId: string, doctorId: string) => {
        if (!doctorId) return;
        await supabase.from("appointments").update({ doctor_id: doctorId }).eq("id", appointmentId);
        // Invalidate both appointments and control queries to refresh the lists
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointments"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointmentsControl"] });
    };

    const handleStatusChange = async (appointmentId: string, newStatus: DashboardAppointment["status"]) => {
        await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId);
        // Invalidate both appointments and control queries to refresh the lists
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointments"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointmentsControl"] });
        queryClient.invalidateQueries({ queryKey: ["paymentsForAppointments"] });
    };

    return {
        appointments,
        loading,
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
