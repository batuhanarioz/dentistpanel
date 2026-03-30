import { useState, useMemo, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppointmentsForDate } from "@/lib/api";
import { useChecklist, ControlItem } from "./useChecklist";
import { isPaid, isPending } from "@/constants/payments";

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

type CalendarAppointmentRaw = {
    id: string;
    date: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
    patientName: string;
    phone: string | null;
    doctor: string | null;
    doctorId: string | null;
    channel: string;
    dbStatus: string; // AppointmentStatus'ten geniş; map sırasında cast edilir
    treatmentType: string | null;
    estimatedAmount?: string | null;
    treatmentNote?: string;
};


export function useDashboard() {
    const queryClient = useQueryClient();
    const clinic = useClinic();
    const baseToday = useMemo(() => localDateStr(), []);
    const [viewOffsetAppointments, setViewOffsetAppointments] = useState<0 | 1>(0);

    const viewDateAppointments = useMemo(() => {
        const d = new Date(baseToday + "T00:00:00");
        d.setDate(d.getDate() + viewOffsetAppointments);
        return localDateStr(d);
    }, [baseToday, viewOffsetAppointments]);

    // Fetch Appointments for List
    const { data: rawCalendarAppointments = [], isLoading: loading } = useQuery({
        queryKey: ["appointments", viewDateAppointments, clinic.clinicId],
        queryFn: async () => {
            if (!clinic.clinicId) return [];
            const data = await getAppointmentsForDate(viewDateAppointments, clinic.clinicId);
            return data;
        },
        enabled: !!clinic.clinicId,
        staleTime: 60 * 1000, // Randevular sık değişir — 1 dk
    });

    const mapCalendarToDashboard = useCallback((ca: CalendarAppointmentRaw): DashboardAppointment => {
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
            status: ca.dbStatus as DashboardAppointment["status"],
            treatmentType: ca.treatmentType,
            estimatedAmount: ca.estimatedAmount ? parseFloat(ca.estimatedAmount) : null,
            treatmentNote: ca.treatmentNote,
        };
    }, []);

    const rawAppointments = useMemo(() => {
        return rawCalendarAppointments.map(mapCalendarToDashboard);
    }, [rawCalendarAppointments, mapCalendarToDashboard]);

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
        // Remove filtering by doctor ID, let all clinic members view all appointments
        const base = rawAppointments;

        const sorted = [...base].sort((a, b) => {
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
    }, [rawAppointments, viewOffsetAppointments, clinic.userRole, clinic.userId]);


    // Derived counts from appointments
    const noShowCount = useMemo(() => appointments.filter(a => a.status === "no_show").length, [appointments]);
    const completedCount = useMemo(() => appointments.filter(a => a.status === "completed").length, [appointments]);

    // Today's payment totals (paid vs pending) for today's appointments
    const appointmentIds = useMemo(() => rawAppointments.map(a => a.id), [rawAppointments]);

    const { data: revenueData } = useQuery({
        queryKey: ["todayRevenue", viewDateAppointments, clinic.clinicId],
        queryFn: async () => {
            if (!clinic.clinicId || !appointmentIds.length) return { paidTotal: 0, pendingTotal: 0 };
            const { data } = await supabase
                .from("payments")
                .select("amount, status")
                .in("appointment_id", appointmentIds);
            let paidCents = 0;
            let pendingCents = 0;
            for (const p of (data ?? [])) {
                const cents = Math.round(Number(p.amount) * 100);
                if (isPaid(p.status)) paidCents += cents;
                else if (isPending(p.status)) pendingCents += cents;
            }
            return { paidTotal: paidCents / 100, pendingTotal: pendingCents / 100 };
        },
        enabled: !!clinic.clinicId && appointmentIds.length > 0,
        staleTime: 60 * 1000, // 30s → 60s; invalidate on payment changes
    });

    const todayRevenue = revenueData ?? { paidTotal: 0, pendingTotal: 0 };

    // Checklist Items logic (New Persistent System)
    const { controlItems, checklistLoading } = useChecklist(0);

    // Debounce: dropdown'da hızlı hekim değiştirme için her randevu başına ayrı timeout
    const assignDoctorTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const handleAssignDoctor = useCallback((appointmentId: string, doctorId: string) => {
        if (!doctorId || !clinic.clinicId) return;
        if (assignDoctorTimeouts.current[appointmentId]) {
            clearTimeout(assignDoctorTimeouts.current[appointmentId]);
        }
        assignDoctorTimeouts.current[appointmentId] = setTimeout(async () => {
            delete assignDoctorTimeouts.current[appointmentId];
            try {
                const { error } = await supabase.from("appointments").update({ doctor_id: doctorId }).eq("id", appointmentId).eq("clinic_id", clinic.clinicId!);
                if (error) throw error;
                toast.success("Hekim başarıyla atandı");
                queryClient.invalidateQueries({ queryKey: ["appointments"] });
                queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
            } catch {
                toast.error("Hekim ataması başarısız, tekrar deneyin");
            }
        }, 800);
    }, [clinic.clinicId, queryClient]);

    // In-flight koruma: aynı randevu için eş zamanlı duplicate güncelleme engellenir
    const inFlightStatusIds = useRef<Set<string>>(new Set());

    const statusLabels: Record<DashboardAppointment["status"], string> = {
        completed: "Tamamlandı olarak işaretlendi",
        cancelled: "Randevu iptal edildi",
        no_show: "Gelmedi olarak işaretlendi",
        confirmed: "Randevu onaylandı",
    };

    const handleStatusChange = async (appointmentId: string, newStatus: DashboardAppointment["status"]) => {
        if (!clinic.clinicId) return;
        if (inFlightStatusIds.current.has(appointmentId)) return;

        const prevStatus = rawAppointments.find(a => a.id === appointmentId)?.status;

        inFlightStatusIds.current.add(appointmentId);
        try {
            const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", appointmentId).eq("clinic_id", clinic.clinicId);
            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ["appointments"] });
            queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
            queryClient.invalidateQueries({ queryKey: ["paymentsForAppointments"] });

            // Geri Al butonu olan toast (5 sn pencere)
            if (prevStatus && prevStatus !== newStatus) {
                const clinicId = clinic.clinicId;
                toast((t) => (
                    <span className="flex items-center gap-3">
                        <span>{statusLabels[newStatus]}</span>
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                const { error: revertErr } = await supabase.from("appointments").update({ status: prevStatus }).eq("id", appointmentId).eq("clinic_id", clinicId);
                                if (!revertErr) {
                                    queryClient.invalidateQueries({ queryKey: ["appointments"] });
                                    queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
                                    toast.success("Geri alındı");
                                } else {
                                    toast.error("Geri alınamadı");
                                }
                            }}
                            className="ml-1 text-indigo-600 font-black text-[11px] underline hover:text-indigo-800 shrink-0"
                        >
                            Geri Al
                        </button>
                    </span>
                ), {
                    duration: 5000,
                    style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
                    icon: "✓",
                });
            } else {
                toast.success(statusLabels[newStatus] ?? "Durum güncellendi");
            }
        } catch {
            toast.error("Durum güncellenemedi, tekrar deneyin");
        } finally {
            inFlightStatusIds.current.delete(appointmentId);
        }
    };

    return {
        appointments,
        loading,
        checklistLoading,
        doctors,
        controlItems,
        viewOffsetAppointments,
        setViewOffsetAppointments,
        handleAssignDoctor,
        handleStatusChange,
        noShowCount,
        completedCount,
        todayRevenue,
    };
}
