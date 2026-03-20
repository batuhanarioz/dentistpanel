import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole, Appointment, Payment } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { isPaid, isPending } from "@/constants/payments";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";

export type AppointmentRow = Appointment;

export type DatePreset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

export function useReports() {
    const { clinicId } = useClinic();
    const [preset, setPreset] = useState<DatePreset>("30d");
    const todayStr = useMemo(() => localDateStr(), []);
    const [customStart, setCustomStart] = useState(todayStr);
    const [customEnd, setCustomEnd] = useState(todayStr);

    // Filters
    const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
    const [treatmentFilter, setTreatmentFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");

    // Raw Data
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [patients, setPatients] = useState<{ id: string }[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; full_name: string }[]>([]);
    const [treatmentTypes, setTreatmentTypes] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date = endOfDay(now);

        switch (preset) {
            case "today":
                start = startOfDay(now);
                break;
            case "7d":
                start = startOfDay(subDays(now, 6));
                break;
            case "30d":
                start = startOfDay(subDays(now, 29));
                break;
            case "thisMonth":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "lastMonth":
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case "thisYear":
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case "custom":
                start = startOfDay(new Date(customStart));
                end = endOfDay(new Date(customEnd));
                break;
            default:
                start = startOfDay(subDays(now, 29));
        }

        const labels: Record<DatePreset, string> = {
            today: "Bugün",
            "7d": "Son 7 Gün",
            "30d": "Son 30 Gün",
            "thisMonth": "Bu Ay",
            "lastMonth": "Geçen Ay",
            "thisYear": "Bu Yıl",
            custom: `${start.toLocaleDateString("tr-TR")} – ${end.toLocaleDateString("tr-TR")}`
        };

        return {
            rangeStart: start.toISOString(),
            rangeEnd: end.toISOString(),
            rangeLabel: labels[preset]
        };
    }, [preset, customStart, customEnd]);

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);

        try {
            // Fetch appointments with patient info and doctor info
            const { data: appts, error: apptsError } = await supabase
                .from("appointments")
                .select(`
                    *,
                    patient:patient_id(full_name, created_at, birth_date, gender),
                    doctor:doctor_id(full_name)
                `)
                .eq("clinic_id", clinicId)
                .gte("starts_at", rangeStart)
                .lte("starts_at", rangeEnd);

            if (apptsError) {
                console.error("useReports: Error fetching appointments:", apptsError);
            }

            // Fetch all payments for the period or associated with these appointments
            const { data: pmnts, error: pmntsError } = await supabase
                .from("payments")
                .select("*")
                .eq("clinic_id", clinicId)
                .gte("created_at", rangeStart)
                .lte("created_at", rangeEnd);

            if (pmntsError) {
                console.error("useReports: Error fetching payments:", pmntsError);
            }

            // Fetch doctors
            const { data: docs } = await supabase
                .from("users")
                .select("id, full_name")
                .eq("clinic_id", clinicId)
                .in("role", [UserRole.DOKTOR]);

            // Fetch treatment types
            const { data: treatments } = await supabase
                .from("treatment_definitions")
                .select("id, name")
                .eq("clinic_id", clinicId);

            // Fetch new patients created in this period (count only)
            const { data: newPatients } = await supabase
                .from("patients")
                .select("id")
                .eq("clinic_id", clinicId)
                .gte("created_at", rangeStart)
                .lte("created_at", rangeEnd);

            setAppointments(appts || []);
            setPayments(pmnts || []);
            setDoctors(docs || []);
            setTreatmentTypes(treatments || []);
            setPatients(newPatients || []);

        } catch (error) {
            console.error("Error loading report data:", error);
        } finally {
            setLoading(false);
        }
    }, [rangeStart, rangeEnd, clinicId]);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredData = useMemo(() => {
        let filtered = appointments;
        if (doctorFilter !== "ALL") filtered = filtered.filter(a => a.doctor_id === doctorFilter);
        if (treatmentFilter !== "ALL") filtered = filtered.filter(a => a.treatment_type === treatmentFilter);
        if (statusFilter !== "ALL") filtered = filtered.filter(a => a.status === statusFilter);

        return filtered;
    }, [appointments, doctorFilter, treatmentFilter, statusFilter]);

    // Analytics computation
    const analytics = useMemo(() => {
        if (loading) return null;

        const totalRevenue = payments
            .filter(p => isPaid(p.status))
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingPayments = payments
            .filter(p => isPending(p.status))
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalAppointments = filteredData.length;
        const noShowCount = filteredData.filter(a => a.status === 'no_show').length;
        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

        // appointment_id → doctor_id lookup: O(n) Map, döngü içinde find() yok
        const apptDoctorMap = new Map<string, string | null>(
            appointments.map(a => [a.id, a.doctor_id ?? null])
        );

        // Günlük revenue: payments'ı bir kez dolaşıp Map'e topla — O(n) vs O(days×n)
        const revenueByDay = new Map<string, number>();
        for (const p of payments) {
            if (!isPaid(p.status)) continue;
            const dayStr = format(new Date(p.created_at), 'yyyy-MM-dd');
            revenueByDay.set(dayStr, (revenueByDay.get(dayStr) ?? 0) + Number(p.amount));
        }

        // Doktor başına ödeme toplamı: O(n) Map — her doktor için ayrı filter yok
        const revenueByDoctor = new Map<string, number>();
        for (const p of payments) {
            if (!isPaid(p.status) || !p.appointment_id) continue;
            const doctorId = apptDoctorMap.get(p.appointment_id);
            if (!doctorId) continue;
            revenueByDoctor.set(doctorId, (revenueByDoctor.get(doctorId) ?? 0) + Number(p.amount));
        }

        // Günlük randevu sayısı: O(n) Map — her gün için filteredData'yı taramak yerine
        const apptsByDay = new Map<string, number>();
        for (const a of filteredData) {
            const dayStr = format(new Date(a.starts_at), 'yyyy-MM-dd');
            apptsByDay.set(dayStr, (apptsByDay.get(dayStr) ?? 0) + 1);
        }

        const days = eachDayOfInterval({ start: new Date(rangeStart), end: new Date(rangeEnd) });

        return {
            kpis: {
                totalRevenue,
                collectedPayments: totalRevenue,
                pendingPayments,
                totalAppointments,
                newPatients: patients.length,
                noShowRate,
                capacityUtilization: 75, // Placeholder
                avgRevenuePerAppt: totalAppointments > 0 ? totalRevenue / totalAppointments : 0
            },
            trends: {
                revenueTrend: days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    return { date: dayStr, revenue: revenueByDay.get(dayStr) ?? 0 };
                }),
                appointmentTrend: days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    return { date: dayStr, count: apptsByDay.get(dayStr) ?? 0 };
                })
            },
            doctorPerformance: doctors.map(d => {
                const docAppts = filteredData.filter(a => a.doctor_id === d.id);
                return {
                    id: d.id,
                    name: d.full_name,
                    appointments: docAppts.length,
                    revenue: revenueByDoctor.get(d.id) ?? 0,
                    noShowRate: docAppts.length > 0
                        ? (docAppts.filter(a => a.status === 'no_show').length / docAppts.length) * 100
                        : 0
                };
            }),
            treatmentStats: treatmentTypes.map(t => {
                const count = filteredData.filter(a => a.treatment_type === t.name).length;
                return { name: t.name, count };
            }).sort((a, b) => b.count - a.count)
        };
    }, [loading, filteredData, payments, patients, doctors, treatmentTypes, rangeStart, rangeEnd, appointments]);

    return {
        preset, setPreset,
        customStart, setCustomStart,
        customEnd, setCustomEnd,
        doctorFilter, setDoctorFilter,
        treatmentFilter, setTreatmentFilter,
        statusFilter, setStatusFilter,
        paymentStatusFilter, setPaymentStatusFilter,
        doctors,
        treatmentTypes,
        loading,
        rangeLabel,
        analytics
    };
}
