import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole, DayOfWeek } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { isPaid, isPending, normalizePaymentMethod } from "@/constants/payments";
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";

/** Rapor hook'unda kullanılan appointment kolonları */
interface ReportAppointment {
    id: string;
    starts_at: string;
    ends_at: string;
    patient_id: string;
    doctor_id: string | null;
    status: string;
    channel: string;
    treatment_type: string | null;
    estimated_amount: number | null;
    patient?: { full_name: string; created_at: string; birth_date: string | null; gender: string | null } | { full_name: string; created_at: string; birth_date: string | null; gender: string | null }[] | null;
    doctor?: { full_name: string } | { full_name: string }[] | null;
}

/** Rapor hook'unda kullanılan payment kolonları */
interface ReportPayment {
    id: string;
    amount: number;
    status: string | null;
    method: string | null;
    due_date: string | null;
    created_at: string;
    appointment_id: string | null;
}

export type AppointmentRow = ReportAppointment;

export type DatePreset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

interface PatientRow {
    id: string;
    gender?: string | null;
    birth_date?: string | null;
    created_at: string;
}

export function useReports() {
    const { clinicId, workingHours } = useClinic();
    const [preset, setPreset] = useState<DatePreset>("30d");
    const todayStr = useMemo(() => localDateStr(), []);
    const [customStart, setCustomStart] = useState(todayStr);
    const [customEnd, setCustomEnd] = useState(todayStr);

    // Filters
    const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
    const [treatmentFilter, setTreatmentFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const { rangeStart, rangeEnd, rangeLabel, prevRangeStart, prevRangeEnd } = useMemo(() => {
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

        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        return {
            rangeStart: start.toISOString(),
            rangeEnd: end.toISOString(),
            rangeLabel: labels[preset],
            prevRangeStart: prevStart.toISOString(),
            prevRangeEnd: prevEnd.toISOString(),
        };
    }, [preset, customStart, customEnd]);

    const { data: rawData, isLoading: loading, refetch: loadData } = useQuery({
        queryKey: ["reports", clinicId, rangeStart, rangeEnd, prevRangeStart, prevRangeEnd],
        queryFn: async () => {
            const [
                { data: appts },
                { data: pmnts },
                { data: docs },
                { data: treatments },
                { data: newPatients },
                { data: existing },
                { data: prevAppts },
                { data: prevPmnts },
                { data: prevPats },
            ] = await Promise.all([
                supabase
                    .from("appointments")
                    .select("id, starts_at, ends_at, patient_id, doctor_id, status, channel, treatment_type, estimated_amount, patient:patient_id(full_name, created_at, birth_date, gender), doctor:doctor_id(full_name)")
                    .eq("clinic_id", clinicId!)
                    .gte("starts_at", rangeStart)
                    .lte("starts_at", rangeEnd),
                supabase
                    .from("payments")
                    .select("id, amount, status, method, due_date, created_at, appointment_id")
                    .eq("clinic_id", clinicId!)
                    .gte("created_at", rangeStart)
                    .lte("created_at", rangeEnd),
                supabase.from("users").select("id, full_name").eq("clinic_id", clinicId!).or(`role.eq.${UserRole.DOKTOR},is_clinical_provider.eq.true`),
                supabase.from("treatment_definitions").select("id, name").eq("clinic_id", clinicId!),
                supabase.from("patients").select("id, gender, birth_date, created_at").eq("clinic_id", clinicId!).gte("created_at", rangeStart).lte("created_at", rangeEnd),
                supabase.from("patients").select("id").eq("clinic_id", clinicId!).lt("created_at", rangeStart),
                supabase.from("appointments").select("id, doctor_id, status, starts_at, patient_id").eq("clinic_id", clinicId!).gte("starts_at", prevRangeStart).lte("starts_at", prevRangeEnd),
                supabase.from("payments").select("id, amount, status, appointment_id").eq("clinic_id", clinicId!).gte("created_at", prevRangeStart).lte("created_at", prevRangeEnd),
                supabase.from("patients").select("id").eq("clinic_id", clinicId!).gte("created_at", prevRangeStart).lte("created_at", prevRangeEnd),
            ]);
            return {
                appointments: (appts || []) as ReportAppointment[],
                payments: (pmnts || []) as ReportPayment[],
                doctors: (docs || []) as { id: string; full_name: string }[],
                treatmentTypes: (treatments || []) as { id: string; name: string }[],
                patients: (newPatients || []) as PatientRow[],
                existingPatients: (existing || []) as { id: string }[],
                prevAppointments: (prevAppts || []) as ReportAppointment[],
                prevPayments: (prevPmnts || []) as ReportPayment[],
                prevPatients: (prevPats || []) as PatientRow[],
            };
        },
        enabled: !!clinicId,
        staleTime: 2 * 60 * 1000,
    });

    const appointments = rawData?.appointments ?? [];
    const payments = rawData?.payments ?? [];
    const doctors = rawData?.doctors ?? [];
    const treatmentTypes = rawData?.treatmentTypes ?? [];
    const patients = rawData?.patients ?? [];
    const existingPatients = rawData?.existingPatients ?? [];
    const prevAppointments = rawData?.prevAppointments ?? [];
    const prevPayments = rawData?.prevPayments ?? [];
    const prevPatients = rawData?.prevPatients ?? [];

    const filteredData = useMemo(() => {
        let filtered = appointments;
        if (doctorFilter !== "ALL") filtered = filtered.filter((a: ReportAppointment) => a.doctor_id === doctorFilter);
        if (treatmentFilter !== "ALL") filtered = filtered.filter((a: ReportAppointment) => a.treatment_type === treatmentFilter);
        if (statusFilter !== "ALL") filtered = filtered.filter((a: ReportAppointment) => a.status === statusFilter);
        return filtered;
    }, [appointments, doctorFilter, treatmentFilter, statusFilter]);

    const filteredPayments = useMemo(() => {
        if (doctorFilter === "ALL") return payments;
        const doctorApptIds = new Set(
            appointments.filter((a: ReportAppointment) => a.doctor_id === doctorFilter).map((a: ReportAppointment) => a.id)
        );
        return payments.filter((p: ReportPayment) => p.appointment_id && doctorApptIds.has(p.appointment_id));
    }, [payments, appointments, doctorFilter]);

    const analytics = useMemo(() => {
        if (!rawData) return null;

        const today = new Date().toISOString().slice(0, 10);

        // ── Current period core metrics ──
        const totalRevenue = filteredPayments
            .filter(p => isPaid(p.status))
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingPayments = filteredPayments
            .filter(p => isPending(p.status))
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalAppointments = filteredData.length;
        const noShowCount = filteredData.filter(a => a.status === "no_show").length;
        const cancelledCount = filteredData.filter(a => a.status === "cancelled").length;
        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;
        const cancelledRate = totalAppointments > 0 ? (cancelledCount / totalAppointments) * 100 : 0;

        // ── Previous period metrics ──
        const prevRevenue = prevPayments
            .filter(p => isPaid(p.status))
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const prevTotalAppts = prevAppointments.length;
        const prevNoShowCount = prevAppointments.filter(a => a.status === "no_show").length;
        const prevNoShowRate = prevTotalAppts > 0 ? (prevNoShowCount / prevTotalAppts) * 100 : 0;
        const prevNewPatients = prevPatients.length;

        const pctChange = (curr: number, prev: number): number | null =>
            prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

        const kpiTrends = {
            revenue: pctChange(totalRevenue, prevRevenue),
            appointments: pctChange(totalAppointments, prevTotalAppts),
            newPatients: pctChange(patients.length, prevNewPatients),
            noShowRate: prevTotalAppts > 0 ? Math.round((noShowRate - prevNoShowRate) * 10) / 10 : null,
        };

        // ── Lookups ──
        const apptDoctorMap = new Map<string, string | null>(
            appointments.map(a => [a.id, a.doctor_id ?? null])
        );
        const apptTreatmentMap = new Map<string, string | null>(
            appointments.map(a => [a.id, a.treatment_type ?? null])
        );

        // ── Revenue by day ──
        const revenueByDay = new Map<string, number>();
        for (const p of filteredPayments) {
            if (!isPaid(p.status)) continue;
            const dayStr = format(new Date(p.created_at), "yyyy-MM-dd");
            revenueByDay.set(dayStr, (revenueByDay.get(dayStr) ?? 0) + Number(p.amount));
        }

        // ── Revenue by doctor ──
        const revenueByDoctor = new Map<string, number>();
        for (const p of payments) {
            if (!isPaid(p.status) || !p.appointment_id) continue;
            const doctorId = apptDoctorMap.get(p.appointment_id);
            if (!doctorId) continue;
            revenueByDoctor.set(doctorId, (revenueByDoctor.get(doctorId) ?? 0) + Number(p.amount));
        }

        // ── Revenue by treatment type (filtered by active doctor filter) ──
        const revenueByTreatment = new Map<string, number>();
        for (const p of filteredPayments) {
            if (!isPaid(p.status) || !p.appointment_id) continue;
            const treatmentType = apptTreatmentMap.get(p.appointment_id);
            if (!treatmentType) continue;
            revenueByTreatment.set(treatmentType, (revenueByTreatment.get(treatmentType) ?? 0) + Number(p.amount));
        }

        // ── Payment method distribution ──
        const methodAmountMap = new Map<string, number>();
        const methodCountMap = new Map<string, number>();
        for (const p of filteredPayments) {
            if (!isPaid(p.status)) continue;
            const method = normalizePaymentMethod(p.method);
            methodAmountMap.set(method, (methodAmountMap.get(method) ?? 0) + Number(p.amount));
            methodCountMap.set(method, (methodCountMap.get(method) ?? 0) + 1);
        }
        const paymentMethodStats = [...methodAmountMap.entries()]
            .map(([method, amount]) => ({ method, amount, count: methodCountMap.get(method) ?? 0 }))
            .sort((a, b) => b.amount - a.amount);

        // ── Overdue payments ──
        const overduePayments = payments.filter(p =>
            isPending(p.status) && p.due_date && p.due_date < today
        );
        const overdueStats = {
            count: overduePayments.length,
            totalAmount: overduePayments.reduce((sum, p) => sum + Number(p.amount), 0),
        };

        // ── Appointments by day ──
        const apptsByDay = new Map<string, number>();
        for (const a of filteredData) {
            const dayStr = format(new Date(a.starts_at), "yyyy-MM-dd");
            apptsByDay.set(dayStr, (apptsByDay.get(dayStr) ?? 0) + 1);
        }

        // ── Capacity: by hour (0-23) ──
        const apptsByHour = new Array(24).fill(0);
        for (const a of filteredData) {
            const hour = new Date(a.starts_at).getHours();
            apptsByHour[hour]++;
        }

        // ── Capacity: by day of week ──
        const dowNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
        const apptsByDow = new Array(7).fill(0);
        for (const a of filteredData) {
            const dow = new Date(a.starts_at).getDay();
            apptsByDow[dow]++;
        }

        // ── Working days in range ──
        const dowToKey: Record<number, DayOfWeek> = {
            0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
            4: "thursday", 5: "friday", 6: "saturday"
        };
        const days = eachDayOfInterval({ start: new Date(rangeStart), end: new Date(rangeEnd) });
        const workingDaysCount = workingHours
            ? days.filter(d => workingHours[dowToKey[d.getDay()]]?.enabled).length
            : days.length;

        const maxHourCount = Math.max(...apptsByHour);
        const peakHour = maxHourCount > 0 ? apptsByHour.indexOf(maxHourCount) : null;
        const maxDowCount = Math.max(...apptsByDow);
        const peakDowIndex = maxDowCount > 0 ? apptsByDow.indexOf(maxDowCount) : null;

        // ── Patient demographics ──
        const genderMap: Record<string, number> = {};
        const ageGroups: Record<string, number> = {
            "0-17": 0, "18-35": 0, "36-50": 0, "51-65": 0, "65+": 0
        };
        const now = new Date();
        for (const p of patients) {
            const g = p.gender ?? "other";
            genderMap[g] = (genderMap[g] ?? 0) + 1;
            if (p.birth_date) {
                const age = now.getFullYear() - new Date(p.birth_date).getFullYear();
                if (age <= 17) ageGroups["0-17"]++;
                else if (age <= 35) ageGroups["18-35"]++;
                else if (age <= 50) ageGroups["36-50"]++;
                else if (age <= 65) ageGroups["51-65"]++;
                else ageGroups["65+"]++;
            }
        }

        // ── Patient retention ──
        const existingPatientIdSet = new Set(existingPatients.map(p => p.id));
        const currentApptPatientIds = new Set(
            appointments.map(a => a.patient_id).filter((id): id is string => !!id)
        );
        const returningCount = [...currentApptPatientIds].filter(id => existingPatientIdSet.has(id)).length;
        const firstTimeCount = [...currentApptPatientIds].filter(id => !existingPatientIdSet.has(id)).length;
        const totalDistinctWithAppts = currentApptPatientIds.size;

        // ── Daily new patients trend ──
        const newPatientsByDay = new Map<string, number>();
        for (const p of patients) {
            const dayStr = format(new Date(p.created_at), "yyyy-MM-dd");
            newPatientsByDay.set(dayStr, (newPatientsByDay.get(dayStr) ?? 0) + 1);
        }

        // ── No-show trend ──
        const noShowByDay = new Map<string, { total: number; noShow: number }>();
        for (const a of filteredData) {
            const dayStr = format(new Date(a.starts_at), "yyyy-MM-dd");
            const cur = noShowByDay.get(dayStr) ?? { total: 0, noShow: 0 };
            cur.total++;
            if (a.status === "no_show") cur.noShow++;
            noShowByDay.set(dayStr, cur);
        }

        return {
            kpis: {
                totalRevenue,
                collectedPayments: totalRevenue,
                pendingPayments,
                totalAppointments,
                newPatients: patients.length,
                noShowRate,
                noShowCount,
                cancelledCount,
                cancelledRate,
                avgRevenuePerAppt: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
                kpiTrends,
            },
            trends: {
                revenueTrend: days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return { date: dayStr, revenue: revenueByDay.get(dayStr) ?? 0 };
                }),
                appointmentTrend: days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return { date: dayStr, count: apptsByDay.get(dayStr) ?? 0 };
                }),
                newPatientTrend: days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return { date: dayStr, count: newPatientsByDay.get(dayStr) ?? 0 };
                }),
                noShowTrend: days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const bucket = noShowByDay.get(dayStr);
                    return {
                        date: dayStr,
                        rate: bucket && bucket.total > 0
                            ? Math.round((bucket.noShow / bucket.total) * 100)
                            : 0
                    };
                }),
            },
            capacity: {
                apptsByHour: apptsByHour.map((count, hour) => ({ hour, count })),
                apptsByDow: apptsByDow.map((count, dow) => ({ day: dowNames[dow], count })),
                workingDaysCount,
                peakHour,
                peakDow: peakDowIndex !== null ? dowNames[peakDowIndex] : null,
                avgDailyAppts: workingDaysCount > 0
                    ? Math.round((totalAppointments / workingDaysCount) * 10) / 10
                    : 0,
            },
            doctorPerformance: doctors.map(d => {
                const docAppts = filteredData.filter(a => a.doctor_id === d.id);
                const docRevenue = revenueByDoctor.get(d.id) ?? 0;
                return {
                    id: d.id,
                    name: d.full_name,
                    appointments: docAppts.length,
                    revenue: docRevenue,
                    avgRevenuePerAppt: docAppts.length > 0 ? Math.round(docRevenue / docAppts.length) : 0,
                    noShowRate: docAppts.length > 0
                        ? (docAppts.filter(a => a.status === "no_show").length / docAppts.length) * 100
                        : 0,
                    cancelledRate: docAppts.length > 0
                        ? (docAppts.filter(a => a.status === "cancelled").length / docAppts.length) * 100
                        : 0,
                };
            }),
            treatmentStats: treatmentTypes.map(t => {
                const count = filteredData.filter(a => a.treatment_type === t.name).length;
                return {
                    name: t.name,
                    count,
                    revenue: revenueByTreatment.get(t.name) ?? 0,
                };
            }).sort((a, b) => b.count - a.count),
            patientDemographics: {
                total: patients.length,
                genderMap,
                ageGroups,
            },
            retention: {
                returningCount,
                firstTimeCount,
                totalDistinctWithAppts,
            },
            paymentMethodStats,
            overdueStats,
        };
    }, [
        rawData, filteredData, filteredPayments, payments, patients,
        prevAppointments, prevPayments, prevPatients,
        doctors, treatmentTypes, rangeStart, rangeEnd, appointments,
        workingHours, existingPatients,
    ]);

    return {
        preset, setPreset,
        customStart, setCustomStart,
        customEnd, setCustomEnd,
        doctorFilter, setDoctorFilter,
        treatmentFilter, setTreatmentFilter,
        statusFilter, setStatusFilter,
        doctors,
        treatmentTypes,
        loading,
        rangeLabel,
        analytics,
        refresh: loadData,
    };
}
