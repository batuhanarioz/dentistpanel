import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole } from "@/types/database";

export type AppointmentRow = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    channel: string | null;
    doctor_id: string | null;
    patient_id: string | null;
    treatment_type: string | null;
};

export type PaymentRow = {
    id: string;
    amount: number;
    status: string | null;
    appointment_id: string | null;
};

export type DoctorRow = { id: string; full_name: string };
export type DatePreset = "today" | "7d" | "30d" | "custom";
export type KPIDetailType = "completed" | "cancelled_noshow" | "unpaid" | null;

const WORKING_HOURS = 10;
export const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", web: "Web", phone: "Telefon", walk_in: "Yüz yüze" };

export function useReports() {
    const [preset, setPreset] = useState<DatePreset>("30d");
    const todayStr = useMemo(() => localDateStr(), []);
    const [customStart, setCustomStart] = useState(todayStr);
    const [customEnd, setCustomEnd] = useState(todayStr);
    const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
    const [kpiDetail, setKpiDetail] = useState<KPIDetailType>(null);
    const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [doctors, setDoctors] = useState<DoctorRow[]>([]);
    const [patientFirstDates, setPatientFirstDates] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [patientNames, setPatientNames] = useState<Record<string, string>>({});

    const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date = new Date(now);
        end.setDate(end.getDate() + 1);

        switch (preset) {
            case "today": start = new Date(now); break;
            case "7d": start = new Date(now); start.setDate(start.getDate() - 6); break;
            case "30d": start = new Date(now); start.setDate(start.getDate() - 29); break;
            case "custom": start = new Date(customStart + "T00:00:00"); end = new Date(customEnd + "T00:00:00"); end.setDate(end.getDate() + 1); break;
            default: start = new Date(now); start.setDate(start.getDate() - 29);
        }
        const labels: Record<DatePreset, string> = { today: "Bugün", "7d": "Son 7 Gün", "30d": "Son 30 Gün", custom: `${new Date(customStart + "T00:00:00").toLocaleDateString("tr-TR")} – ${new Date(customEnd + "T00:00:00").toLocaleDateString("tr-TR")}` };
        return { rangeStart: localDateStr(start), rangeEnd: localDateStr(end), rangeLabel: labels[preset] };
    }, [preset, customStart, customEnd]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [apptRes, payRes, docRes] = await Promise.all([
            supabase.from("appointments").select("id, starts_at, ends_at, status, channel, doctor_id, patient_id, treatment_type").gte("starts_at", rangeStart).lt("starts_at", rangeEnd).order("starts_at", { ascending: true }),
            supabase.from("payments").select("id, amount, status, appointment_id").gte("due_date", rangeStart).lt("due_date", rangeEnd),
            supabase.from("users").select("id, full_name").in("role", [UserRole.DOKTOR]),
        ]);

        const appts = (apptRes.data || []).map((r: any) => ({ ...r }));
        setAppointments(appts);
        setPayments((payRes.data || []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
        setDoctors(docRes.data || []);

        const pIds = Array.from(new Set(appts.map((a: any) => a.patient_id).filter(Boolean))) as string[];
        if (pIds.length > 0) {
            const { data: pData } = await supabase.from("patients").select("id, created_at").in("id", pIds);
            const map: Record<string, string> = {};
            (pData || []).forEach(p => map[p.id] = p.created_at?.slice(0, 10) ?? "");
            setPatientFirstDates(map);
        }
        setLoading(false);
    }, [rangeStart, rangeEnd]);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = useMemo(() => doctorFilter === "ALL" ? appointments : appointments.filter(a => a.doctor_id === doctorFilter), [appointments, doctorFilter]);

    useEffect(() => {
        if (!kpiDetail || Object.keys(patientNames).length > 0) return;
        const ids = Array.from(new Set(filtered.map(a => a.patient_id).filter(Boolean))) as string[];
        if (ids.length === 0) return;
        supabase.from("patients").select("id, full_name").in("id", ids).then(({ data }) => {
            const map: Record<string, string> = {};
            (data || []).forEach(p => map[p.id] = p.full_name);
            setPatientNames(map);
        });
    }, [kpiDetail, filtered, patientNames]);

    const stats = useMemo(() => {
        const total = filtered.length;
        const completed = filtered.filter(a => a.status === "completed").length;
        const cancelledNoShow = filtered.filter(a => a.status === "cancelled" || a.status === "no_show").length;
        const uniqueDays = new Set(filtered.map(a => a.starts_at.slice(0, 10))).size;
        const maxSlots = Math.max(uniqueDays, 1) * 10 * 2;
        const occupancyPct = Math.min(100, Math.round((total / maxSlots) * 100));
        const paidTotal = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
        const paidApptIds = new Set(payments.filter(p => p.status === "paid").map(p => p.appointment_id));
        const unpaidCompletedIds = filtered.filter(a => a.status === "completed" && !paidApptIds.has(a.id)).map(a => a.id);
        return { total, completed, cancelledNoShow, occupancyPct, paidTotal, unpaidCompletedCount: unpaidCompletedIds.length, unpaidCompletedIds, uniqueDays };
    }, [filtered, payments]);

    const chartData = useMemo(() => {
        // Status by day
        const statusMap: Record<string, any> = {};
        filtered.forEach(a => {
            const day = a.starts_at.slice(0, 10);
            if (!statusMap[day]) statusMap[day] = { day, completed: 0, confirmed: 0, pending: 0, cancelled: 0, no_show: 0 };
            if (statusMap[day][a.status] !== undefined) statusMap[day][a.status]++;
        });
        const statusByDay = Object.values(statusMap).sort((a: any, b: any) => a.day.localeCompare(b.day));

        // Channel Performance
        const channelMap: Record<string, number> = {};
        filtered.forEach(a => {
            const ch = a.channel || "web";
            channelMap[ch] = (channelMap[ch] || 0) + 1;
        });
        const channelData = Object.entries(channelMap).map(([name, value]) => ({
            name: CHANNEL_LABELS[name] || name,
            value,
            pct: stats.total > 0 ? Math.round((value / stats.total) * 100) : 0
        })).sort((a, b) => b.value - a.value);

        // Occupancy by day
        const occupancyMap: Record<string, number> = {};
        filtered.forEach(a => {
            const day = a.starts_at.slice(0, 10);
            occupancyMap[day] = (occupancyMap[day] || 0) + 1;
        });
        const occupancyByDay = Object.entries(occupancyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({
            day: new Date(day + "T00:00:00").toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
            doluluk: Math.min(100, Math.round((count / 20) * 100)),
            randevu: count
        }));

        // Doctor stats
        const docMap: Record<string, any> = {};
        appointments.forEach(a => {
            const docId = a.doctor_id || "unassigned";
            if (!docMap[docId]) docMap[docId] = { total: 0, completed: 0, noShow: 0 };
            docMap[docId].total++;
            if (a.status === "completed") docMap[docId].completed++;
            if (a.status === "no_show") docMap[docId].noShow++;
        });
        const doctorMap = Object.fromEntries(doctors.map(d => [d.id, d.full_name]));
        const doctorStats = Object.entries(docMap).map(([id, s]) => ({
            name: id === "unassigned" ? "Atanmamış" : doctorMap[id] || "Bilinmiyor",
            ...s,
            completePct: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
            noShowPct: s.total > 0 ? Math.round((s.noShow / s.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);

        // Patient breakdown
        let newCount = 0; let existingCount = 0; const seen = new Set();
        filtered.forEach(a => {
            if (!a.patient_id || seen.has(a.patient_id)) return;
            seen.add(a.patient_id);
            if (patientFirstDates[a.patient_id] >= rangeStart) newCount++; else existingCount++;
        });
        const patientBreakdown = [{ name: "Yeni Hasta", value: newCount }, { name: "Mevcut Hasta", value: existingCount }];

        return { statusByDay, channelData, occupancyByDay, doctorStats, patientBreakdown };
    }, [filtered, stats.total, patientFirstDates, rangeStart, appointments, doctors]);

    const downloadReportCsv = () => {
        const sep = ";";
        const escape = (v: any) => {
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return /[";\n\r]/.test(s) ? `"${s}"` : s;
        };
        const lines = [
            "RAPOR ÖZET", `Dönem${sep}${rangeLabel}`,
            `Doktor${sep}${doctorFilter === "ALL" ? "Tümü" : doctors.find(d => d.id === doctorFilter)?.full_name ?? ""}`,
            "", "Metrik" + sep + "Değer",
            `Toplam Randevu${sep}${stats.total}`, `Tamamlanan${sep}${stats.completed}`,
            `İptal + Gelmedi${sep}${stats.cancelledNoShow}`, `Ortalama Doluluk %${sep}${stats.occupancyPct}`,
            `Tahsil Edilen (₺)${sep}${stats.paidTotal}`, `Ödemesiz Tamamlanan${sep}${stats.unpaidCompletedCount}`
        ];
        // Add more sections as per existing logic if needed
        const csv = "\uFEFF" + lines.join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Klinik_Rapor.csv`;
        a.click();
    };

    return {
        preset, setPreset, todayStr, customStart, setCustomStart, customEnd, setCustomEnd,
        doctorFilter, setDoctorFilter, kpiDetail, setKpiDetail, doctors, loading,
        rangeLabel, rangeStart, filtered, stats, patientNames, patientFirstDates, appointments, payments,
        chartData, downloadReportCsv
    };
}
