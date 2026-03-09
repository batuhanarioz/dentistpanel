import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole, Appointment, Payment, Patient, TreatmentDefinition } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

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
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; full_name: string }[]>([]);
    const [treatmentTypes, setTreatmentTypes] = useState<TreatmentDefinition[]>([]);
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
                .in("role", [UserRole.DOKTOR, UserRole.ADMIN_DOCTOR]);

            // Fetch treatment types
            const { data: treatments } = await supabase
                .from("treatment_definitions")
                .select("*")
                .eq("clinic_id", clinicId);

            // Fetch new patients created in this period
            const { data: newPatients } = await supabase
                .from("patients")
                .select("*")
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
            .filter(p => p.status === 'paid' || p.status === 'Ödendi')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingPayments = payments
            .filter(p => p.status === 'pending' || p.status === 'Beklemede' || p.status === 'planned')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalAppointments = filteredData.length;
        const recurringPatients = new Set(filteredData.map(a => a.patient_id)).size;

        const noShowCount = filteredData.filter(a => a.status === 'no_show').length;
        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

        // Revenue over time
        const days = eachDayOfInterval({ start: new Date(rangeStart), end: new Date(rangeEnd) });
        const revenueTrend = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayRevenue = payments
                .filter(p => (p.status === 'paid' || p.status === 'Ödendi') && format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr)
                .reduce((sum, p) => sum + Number(p.amount), 0);
            return { date: dayStr, revenue: dayRevenue };
        });

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
                revenueTrend,
                appointmentTrend: days.map(day => ({
                    date: format(day, 'yyyy-MM-dd'),
                    count: filteredData.filter(a => isSameDay(new Date(a.starts_at), day)).length
                }))
            },
            doctorPerformance: doctors.map(d => {
                const docAppts = filteredData.filter(a => a.doctor_id === d.id);
                const docRevenue = payments
                    .filter(p => {
                        const appt = appointments.find(a => a.id === p.appointment_id);
                        return appt?.doctor_id === d.id && (p.status === 'paid' || p.status === 'Ödendi');
                    })
                    .reduce((sum, p) => sum + Number(p.amount), 0);

                return {
                    id: d.id,
                    name: d.full_name,
                    appointments: docAppts.length,
                    revenue: docRevenue,
                    noShowRate: docAppts.length > 0 ? (docAppts.filter(a => a.status === 'no_show').length / docAppts.length) * 100 : 0
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
