import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

export type DashboardAppointment = {
    id: string;
    startsAt: string;
    endsAt: string;
    patientName: string;
    patientPhone: string | null;
    doctorName: string;
    doctorId: string | null;
    channel: string;
    status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
    treatmentType: string | null;
    estimatedAmount: number | null;
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

    const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [controlItems, setControlItems] = useState<ControlItem[]>([]);
    const clinic = useClinic();
    const [taskAssignments, setTaskAssignments] = useState<Record<string, { role: string; enabled: boolean }>>({});

    useEffect(() => {
        const fetchTaskLogic = async () => {
            if (!clinic.clinicId) return;

            const { data: defs } = await supabase.from("dashboard_task_definitions").select("*");
            const { data: configs } = await supabase.from("clinic_task_configs").select("*").eq("clinic_id", clinic.clinicId);

            const mapping: Record<string, { role: string; enabled: boolean }> = {};
            defs?.forEach(d => {
                const config = configs?.find(c => c.task_definition_id === d.id);
                mapping[d.code] = {
                    role: config ? config.assigned_role : d.default_role,
                    enabled: config ? config.is_enabled : true
                };
            });
            setTaskAssignments(mapping);
        };
        fetchTaskLogic();
    }, [clinic.clinicId]);

    useEffect(() => {
        const loadTodayAppointments = async () => {
            setLoading(true);

            const start = new Date(`${viewDateAppointments}T00:00:00`);
            const end = new Date(`${viewDateAppointments}T23:59:59`);

            const { data, error } = await supabase
                .from("appointments")
                .select(
                    "id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, estimated_amount"
                )
                .gte("starts_at", start.toISOString())
                .lt("starts_at", end.toISOString())
                .order("starts_at", { ascending: true });

            if (error || !data) {
                setAppointments([]);
                setLoading(false);
                return;
            }

            const patientIds = Array.from(
                new Set(data.map((a) => a.patient_id).filter(Boolean))
            ) as string[];

            const [patientsRes, doctorsRes] = await Promise.all([
                patientIds.length
                    ? supabase
                        .from("patients")
                        .select("id, full_name, phone")
                        .in("id", patientIds)
                    : Promise.resolve({ data: [], error: null }),
                supabase
                    .from("users")
                    .select("id, full_name")
                    .in("role", [UserRole.DOKTOR]),
            ]);

            const patientsMap = Object.fromEntries(
                (patientsRes.data || []).map((p: any) => [p.id, { full_name: p.full_name, phone: p.phone }])
            );
            const doctorsMap = Object.fromEntries(
                (doctorsRes.data || []).map((d: any) => [d.id, d.full_name])
            );

            setDoctors((doctorsRes.data || []) as DoctorOption[]);

            const now = new Date();

            const mapped: DashboardAppointment[] = (data || []).map((row: any) => {
                return {
                    id: row.id,
                    startsAt: row.starts_at,
                    endsAt: row.ends_at,
                    patientName: patientsMap[row.patient_id]?.full_name ?? "Hasta",
                    patientPhone: patientsMap[row.patient_id]?.phone ?? null,
                    doctorName: doctorsMap[row.doctor_id] ?? "Doktor atanmadı",
                    doctorId: row.doctor_id ?? null,
                    channel: row.channel,
                    status: row.status,
                    treatmentType: row.treatment_type ?? null,
                    estimatedAmount: row.estimated_amount !== null ? Number(row.estimated_amount) : null,
                };
            });

            const upcomingNotCompleted = mapped.filter((a) => {
                if (a.status === "completed") return false;
                const startDate = new Date(a.startsAt);
                if (viewOffsetAppointments === 0) {
                    return startDate > now;
                }
                return true;
            });

            setAppointments(upcomingNotCompleted);
            setLoading(false);
        };

        loadTodayAppointments();
    }, [viewDateAppointments, viewOffsetAppointments]);

    useEffect(() => {
        const loadControlItems = async () => {
            const start = new Date(`${viewDateControls}T00:00:00`);
            const end = new Date(`${viewDateControls}T23:59:59`);

            const { data, error } = await supabase
                .from("appointments")
                .select(
                    "id, patient_id, doctor_id, status, starts_at, ends_at, treatment_type"
                )
                .gte("starts_at", start.toISOString())
                .lt("starts_at", end.toISOString())
                .order("starts_at", { ascending: true });

            if (error || !data) {
                setControlItems([]);
                return;
            }

            const patientIds = Array.from(
                new Set(data.map((a) => a.patient_id).filter(Boolean))
            ) as string[];

            const { data: patientsData } = await supabase
                .from("patients")
                .select("id, full_name, phone")
                .in("id", patientIds);

            const patientsMap = Object.fromEntries(
                (patientsData || []).map((p: any) => [p.id, { full_name: p.full_name, phone: p.phone }])
            );

            const now = new Date();

            const mapped: DashboardAppointment[] = (data || []).map((row: any) => {
                return {
                    id: row.id,
                    startsAt: row.starts_at,
                    endsAt: row.ends_at,
                    patientName: patientsMap[row.patient_id]?.full_name ?? "Hasta",
                    patientPhone: patientsMap[row.patient_id]?.phone ?? null,
                    doctorName: "",
                    doctorId: row.doctor_id ?? null,
                    channel: row.channel,
                    status: row.status,
                    treatmentType: row.treatment_type ?? null,
                    estimatedAmount: null,
                };
            });

            const appointmentIds = mapped.map((a) => a.id);
            let paymentsMap: Record<string, boolean> = {};

            if (appointmentIds.length) {
                const { data: paymentsData } = await supabase
                    .from("payments")
                    .select("id, appointment_id")
                    .in("appointment_id", appointmentIds);

                paymentsMap = Object.fromEntries(
                    (paymentsData || []).map((p: any) => [p.appointment_id, true])
                );
            }

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

            mapped.forEach((appt) => {
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

                if (appt.status === "pending") {
                    if (canShowTask("PENDING_APPROVAL", appt.doctorId)) {
                        controls.push({
                            id: `${appt.id}-approval`,
                            type: "approval",
                            tone: "medium",
                            toneLabel: "Onay",
                            appointmentId: appt.id,
                            patientName: appt.patientName,
                            timeLabel,
                            treatmentLabel,
                            actionLabel: "Onay güncellemesi bekliyor.",
                            sortTime: startDate.getTime(),
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
            });

            controls.sort((a, b) => b.sortTime - a.sortTime);
            setControlItems(controls);
        };

        loadControlItems();
    }, [viewDateControls, viewOffsetControls, clinic.isAdmin, clinic.userId, clinic.userRole, taskAssignments]);

    const handleAssignDoctor = async (appointmentId: string, doctorId: string) => {
        if (!doctorId) return;

        await supabase
            .from("appointments")
            .update({ doctor_id: doctorId })
            .eq("id", appointmentId);

        const selectedDoctor = doctors.find((d) => d.id === doctorId);

        setAppointments((prev) =>
            prev.map((appt) =>
                appt.id === appointmentId
                    ? {
                        ...appt,
                        doctorId,
                        doctorName: selectedDoctor?.full_name ?? appt.doctorName,
                    }
                    : appt
            )
        );

        // Remove doctor assignment control item from the list
        setControlItems((prev) =>
            prev.filter((item) => !(item.appointmentId === appointmentId && item.type === "doctor"))
        );
    };

    const handleStatusChange = async (
        appointmentId: string,
        newStatus: DashboardAppointment["status"]
    ) => {
        await supabase
            .from("appointments")
            .update({ status: newStatus })
            .eq("id", appointmentId);

        setAppointments((prev) =>
            prev
                .map((appt) =>
                    appt.id === appointmentId ? { ...appt, status: newStatus } : appt
                )
                .filter((appt) => appt.status !== "completed")
        );

        // Remove related control items based on status change
        setControlItems((prev) =>
            prev.filter((item) => {
                if (item.appointmentId !== appointmentId) return true;

                // Remove status update task if status changed
                if (item.type === "status") return false;

                // Remove approval task if status is no longer pending
                if (item.type === "approval" && newStatus !== "pending") return false;

                return true;
            })
        );
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
        handleStatusChange
    };
}
