"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { localDateStr } from "@/app/lib/dateUtils";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

/* ================================================================
   TYPES
   ================================================================ */
type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  channel: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  treatment_type: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string | null;
  appointment_id: string | null;
};

type DoctorRow = { id: string; full_name: string };

type DatePreset = "today" | "7d" | "30d" | "custom";

/* ================================================================
   HELPERS
   ================================================================ */
const fmtCurrency = (n: number) => n.toLocaleString("tr-TR") + " ₺";

const WORKING_HOURS = 10; // 09:00 - 19:00 arası 10 saat

const STATUS_LABELS: Record<string, string> = {
  pending: "Onay Bekliyor",
  confirmed: "Onaylı",
  completed: "Tamamlandı",
  cancelled: "İptal",
  no_show: "Gelmedi",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  web: "Web",
  phone: "Telefon",
  walk_in: "Yüz yüze",
};

const CHART_COLORS = [
  "#0d9488", // teal-600
  "#4BB543", // koyu yeşil (tamamlandı)
  "#d97706", // amber-600
  "#e11d48", // rose-600
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#0ea5e9", // sky-500
];

const PIE_COLORS = ["#0d9488", "#f59e0b", "#e11d48", "#6366f1", "#64748b"];

/* ================================================================
   COMPONENT
   ================================================================ */
type KPIDetailType = "completed" | "cancelled_noshow" | "unpaid" | null;

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  /* ---------- State ---------- */
  const todayStr = useMemo(() => localDateStr(), []);

  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
  const [kpiDetail, setKpiDetail] = useState<KPIDetailType>(null);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [patientFirstDates, setPatientFirstDates] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);

  /* ---------- Tarih aralığı hesaplama ---------- */
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);
    end.setDate(end.getDate() + 1); // bugün dahil

    switch (preset) {
      case "today":
        start = new Date(now);
        break;
      case "7d":
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        break;
      case "30d":
        start = new Date(now);
        start.setDate(start.getDate() - 29);
        break;
      case "custom":
        start = new Date(customStart + "T00:00:00");
        end = new Date(customEnd + "T00:00:00");
        end.setDate(end.getDate() + 1);
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 29);
    }

    const labels: Record<DatePreset, string> = {
      today: "Bugün",
      "7d": "Son 7 Gün",
      "30d": "Son 30 Gün",
      custom: `${new Date(customStart + "T00:00:00").toLocaleDateString(
        "tr-TR"
      )} – ${new Date(customEnd + "T00:00:00").toLocaleDateString("tr-TR")}`,
    };

    return {
      rangeStart: localDateStr(start),
      rangeEnd: localDateStr(end),
      rangeLabel: labels[preset],
    };
  }, [preset, customStart, customEnd]);

  /* ---------- Veri yükleme ---------- */
  const loadData = useCallback(async () => {
    setLoading(true);

    const [apptRes, payRes, docRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, channel, doctor_id, patient_id, treatment_type"
        )
        .gte("starts_at", rangeStart)
        .lt("starts_at", rangeEnd)
        .order("starts_at", { ascending: true }),
      supabase
        .from("payments")
        .select("id, amount, status, appointment_id")
        .gte("due_date", rangeStart)
        .lt("due_date", rangeEnd),
      supabase
        .from("users")
        .select("id, full_name")
        .in("role", ["DOCTOR", "ADMIN_DOCTOR"]),
    ]);

    const appts: AppointmentRow[] = (apptRes.data || []).map((r: any) => ({
      id: r.id,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      status: r.status,
      channel: r.channel,
      doctor_id: r.doctor_id,
      patient_id: r.patient_id,
      treatment_type: r.treatment_type,
    }));

    setAppointments(appts);
    setPayments(
      (payRes.data || []).map((r: any) => ({
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        appointment_id: r.appointment_id,
      }))
    );
    setDoctors(
      (docRes.data || []).map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
      }))
    );

    // Hasta ilk ziyaret tarihleri (yeni vs mevcut hasta tespiti)
    const patientIds = Array.from(
      new Set(appts.map((a) => a.patient_id).filter(Boolean))
    ) as string[];

    if (patientIds.length > 0) {
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, created_at")
        .in("id", patientIds);

      const map: Record<string, string> = {};
      (patientData || []).forEach((p: any) => {
        map[p.id] = p.created_at?.slice(0, 10) ?? "";
      });
      setPatientFirstDates(map);
    }

    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------- Filtrelenmiş randevular ---------- */
  const filtered = useMemo(() => {
    if (doctorFilter === "ALL") return appointments;
    return appointments.filter((a) => a.doctor_id === doctorFilter);
  }, [appointments, doctorFilter]);

  /* ================================================================
     KPI HESAPLAMALARI
     ================================================================ */
  const totalAppts = filtered.length;
  const completedAppts = filtered.filter(
    (a) => a.status === "completed"
  ).length;
  const cancelledNoShow = filtered.filter(
    (a) => a.status === "cancelled" || a.status === "no_show"
  ).length;

  // Doluluk oranı: gün sayısı * çalışma saati * 2 (30dk slot) = max slot
  const uniqueDays = new Set(
    filtered.map((a) => a.starts_at.slice(0, 10))
  ).size;
  const maxSlots = Math.max(uniqueDays, 1) * WORKING_HOURS * 2;
  const occupancyPct = Math.min(
    100,
    Math.round((totalAppts / maxSlots) * 100)
  );

  // Tahmini ciro
  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const unpaidTotal = payments
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);

  // Tamamlanmış ama ödemesi girilmemiş randevular
  const completedApptIds = new Set(
    filtered.filter((a) => a.status === "completed").map((a) => a.id)
  );
  const paidApptIds = new Set(
    payments.filter((p) => p.status === "paid").map((p) => p.appointment_id)
  );
  const unpaidCompletedIds = [...completedApptIds].filter(
    (id) => !paidApptIds.has(id)
  );
  const unpaidCompletedCount = unpaidCompletedIds.length;

  /* ---------- KPI Detay Listesi ---------- */
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});

  // Hasta adlarını lazy yükle (kpi detail açıldığında)
  useEffect(() => {
    if (!kpiDetail) return;
    const ids = Array.from(
      new Set(filtered.map((a) => a.patient_id).filter(Boolean))
    ) as string[];
    if (ids.length === 0) return;
    if (Object.keys(patientNames).length > 0) return;
    supabase
      .from("patients")
      .select("id, full_name")
      .in("id", ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((p: any) => {
          map[p.id] = p.full_name;
        });
        setPatientNames(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiDetail]);

  const kpiDetailList = useMemo(() => {
    if (!kpiDetail) return [];
    let list: AppointmentRow[] = [];
    if (kpiDetail === "completed") {
      list = filtered.filter((a) => a.status === "completed");
    } else if (kpiDetail === "cancelled_noshow") {
      list = filtered.filter(
        (a) => a.status === "cancelled" || a.status === "no_show"
      );
    } else if (kpiDetail === "unpaid") {
      const idsSet = new Set(unpaidCompletedIds);
      list = filtered.filter((a) => idsSet.has(a.id));
    }
    return list.sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
    );
  }, [kpiDetail, filtered, unpaidCompletedIds]);

  const kpiDetailTitle: Record<string, string> = {
    completed: "Tamamlanan Randevular",
    cancelled_noshow: "İptal Edilen / Gelmedi Randevular",
    unpaid: "Ödemesi Girilmemiş Randevular",
  };

  /* ================================================================
     1) RANDEVU DURUM RAPORU (Stacked bar – gün kırılımı)
     ================================================================ */
  const statusByDay = useMemo(() => {
    const map: Record<
      string,
      { day: string; completed: number; confirmed: number; pending: number; cancelled: number; no_show: number }
    > = {};

    filtered.forEach((a) => {
      const day = a.starts_at.slice(0, 10);
      if (!map[day])
        map[day] = {
          day,
          completed: 0,
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          no_show: 0,
        };
      const s = a.status as keyof (typeof map)[string];
      if (s in map[day]) (map[day] as any)[s]++;
    });

    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);

  /* ================================================================
     2) KANAL PERFORMANS RAPORU
     ================================================================ */
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((a) => {
      const ch = a.channel || "web";
      map[ch] = (map[ch] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name: CHANNEL_LABELS[name] || name,
        value,
        pct: totalAppts > 0 ? Math.round((value / totalAppts) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, totalAppts]);

  /* ================================================================
     3) DOLULUK ORANI RAPORU (Line chart – gün bazlı %)
     ================================================================ */
  const occupancyByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((a) => {
      const day = a.starts_at.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });

    const maxPerDay = WORKING_HOURS * 2; // 30dk slot
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({
        day: new Date(day + "T00:00:00").toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        }),
        doluluk: Math.min(100, Math.round((count / maxPerDay) * 100)),
        randevu: count,
      }));
  }, [filtered]);

  /* ================================================================
     4) DOKTOR BAZLI RANDEVU DAĞILIMI
     ================================================================ */
  const doctorStats = useMemo(() => {
    const map: Record<
      string,
      { total: number; completed: number; noShow: number }
    > = {};

    // Doktor filtresiz tüm verileri kullan
    appointments.forEach((a) => {
      const docId = a.doctor_id || "unassigned";
      if (!map[docId])
        map[docId] = { total: 0, completed: 0, noShow: 0 };
      map[docId].total++;
      if (a.status === "completed") map[docId].completed++;
      if (a.status === "no_show") map[docId].noShow++;
    });

    const doctorMap = Object.fromEntries(
      doctors.map((d) => [d.id, d.full_name])
    );

    return Object.entries(map)
      .map(([id, stats]) => ({
        name: id === "unassigned" ? "Atanmamış" : doctorMap[id] || "Bilinmiyor",
        ...stats,
        completePct:
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
        noShowPct:
          stats.total > 0
            ? Math.round((stats.noShow / stats.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [appointments, doctors]);

  /* ================================================================
     5) YENİ vs MEVCUT HASTA RAPORU
     ================================================================ */
  const patientBreakdown = useMemo(() => {
    let newCount = 0;
    let existingCount = 0;
    const seen = new Set<string>();

    filtered.forEach((a) => {
      if (!a.patient_id || seen.has(a.patient_id)) return;
      seen.add(a.patient_id);

      const firstDate = patientFirstDates[a.patient_id];
      if (firstDate && firstDate >= rangeStart) {
        newCount++;
      } else {
        existingCount++;
      }
    });

    return [
      { name: "Yeni Hasta", value: newCount },
      { name: "Mevcut Hasta", value: existingCount },
    ];
  }, [filtered, patientFirstDates, rangeStart]);

  const totalUniquePatients =
    patientBreakdown[0].value + patientBreakdown[1].value;

  const clinic = useClinic();
  const canDownloadReport =
    clinic.userRole === "ADMIN" || clinic.userRole === "ADMIN_DOCTOR";

  const downloadReportCsv = useCallback(() => {
    const sep = ";";
    const escape = (v: string | number | null | undefined) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[";\n\r]/.test(s) ? `"${s}"` : s;
    };
    const lines: string[] = [];
    lines.push("RAPOR ÖZET");
    lines.push(`Dönem${sep}${rangeLabel}`);
    lines.push(`Doktor${sep}${doctorFilter === "ALL" ? "Tümü" : doctors.find((d) => d.id === doctorFilter)?.full_name ?? ""}`);
    lines.push("");
    lines.push("Metrik" + sep + "Değer");
    lines.push(`Toplam Randevu${sep}${totalAppts}`);
    lines.push(`Tamamlanan${sep}${completedAppts}`);
    lines.push(`İptal + Gelmedi${sep}${cancelledNoShow}`);
    lines.push(`Ortalama Doluluk %${sep}${occupancyPct}`);
    lines.push(`Tahsil Edilen (₺)${sep}${paidTotal}`);
    lines.push(`Ödemesiz Tamamlanan${sep}${unpaidCompletedCount}`);
    lines.push(`Yeni Hasta (dönem)${sep}${patientBreakdown[0].value}`);
    lines.push(`Mevcut Hasta (dönem)${sep}${patientBreakdown[1].value}`);
    lines.push("");
    lines.push("GÜNLÜK RANDEVU DURUMU");
    lines.push(`Tarih${sep}Tamamlandı${sep}Onaylı${sep}Bekliyor${sep}İptal${sep}Gelmedi`);
    statusByDay.forEach((r) => {
      lines.push([r.day, r.completed, r.confirmed, r.pending, r.cancelled, r.no_show].map(escape).join(sep));
    });
    lines.push("");
    lines.push("KANAL DAĞILIMI");
    lines.push(`Kanal${sep}Adet${sep}Oran %`);
    channelData.forEach((c) => lines.push([c.name, c.value, c.pct].map(escape).join(sep)));
    lines.push("");
    lines.push("DOKTOR BAZLI ÖZET");
    lines.push(`Doktor${sep}Toplam${sep}Tamamlanan${sep}Gelmedi${sep}Tamamlanma %`);
    doctorStats.forEach((d) => {
      lines.push([d.name, d.total, d.completed, d.noShow, d.completePct].map(escape).join(sep));
    });
    lines.push("");
    lines.push("GÜNLÜK DOLULUK");
    lines.push(`Tarih${sep}Doluluk %${sep}Randevu Adet`);
    occupancyByDay.forEach((r) => lines.push([r.day, r.doluluk, r.randevu].map(escape).join(sep)));

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (clinic.clinicName || "Klinik").replace(/\s+/g, "_").replace(/[^\w\u00C0-\u024F.-]/gi, "") || "Klinik";
    a.download = `${safeName}_Rapor.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    rangeLabel,
    rangeStart,
    rangeEnd,
    doctorFilter,
    doctors,
    totalAppts,
    completedAppts,
    cancelledNoShow,
    occupancyPct,
    paidTotal,
    unpaidCompletedCount,
    patientBreakdown,
    statusByDay,
    channelData,
    doctorStats,
    occupancyByDay,
  ]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-5 max-w-5xl mx-auto w-full">
      {/* ─── GLOBAL KONTROLLER ─── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Raporlar & Analitik</h2>
              <p className="text-[11px] text-slate-400">
                {rangeLabel}
                {doctorFilter !== "ALL" && ` · ${doctors.find((d) => d.id === doctorFilter)?.full_name}`}
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                {([["today", "Bugün"], ["7d", "7 Gün"], ["30d", "30 Gün"], ["custom", "Özel"]] as [DatePreset, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={[
                      "px-3.5 py-2 text-xs font-medium transition-colors border-r last:border-r-0 border-slate-200",
                      preset === key
                        ? "bg-gradient-to-r from-indigo-600 to-violet-500 text-white"
                        : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {preset === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <PremiumDatePicker value={customStart} onChange={setCustomStart} today={todayStr} compact />
                  <span className="text-xs text-slate-400 self-center">–</span>
                  <PremiumDatePicker value={customEnd} onChange={setCustomEnd} today={todayStr} compact />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              >
                <option value="ALL">Tüm Doktorlar</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
              {canDownloadReport && (
                <button
                  type="button"
                  onClick={downloadReportCsv}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-violet-600 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Raporu İndir (CSV)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Rapor verileri yükleniyor...
          </div>
        </div>
      )}

      {/* ─── KPI ÖZET KARTLARI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard value={String(totalAppts)} label="Toplam Randevu" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>} iconBg="from-indigo-500 to-violet-500" valueColor="text-slate-900" />
        <KPICard value={String(completedAppts)} label="Tamamlanan" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>} iconBg="from-emerald-500 to-green-500" valueColor="text-emerald-700" onClick={() => setKpiDetail(kpiDetail === "completed" ? null : "completed")} active={kpiDetail === "completed"} />
        <KPICard value={String(cancelledNoShow)} label="İptal + Gelmedi" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>} iconBg="from-rose-500 to-pink-500" valueColor="text-rose-700" onClick={() => setKpiDetail(kpiDetail === "cancelled_noshow" ? null : "cancelled_noshow")} active={kpiDetail === "cancelled_noshow"} />
        <KPICard value={`%${occupancyPct}`} label="Ort. Doluluk" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>} iconBg="from-teal-500 to-emerald-500" valueColor="text-teal-700" />
        <KPICard value={fmtCurrency(paidTotal)} label="Tahsil Edilen" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} iconBg="from-emerald-500 to-teal-500" valueColor="text-emerald-700" small />
        <KPICard value={unpaidCompletedCount > 0 ? String(unpaidCompletedCount) : "0"} label="Ödemesiz" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>} iconBg={unpaidCompletedCount > 0 ? "from-amber-500 to-orange-500" : "from-slate-400 to-slate-500"} valueColor={unpaidCompletedCount > 0 ? "text-amber-700" : "text-slate-700"} onClick={() => setKpiDetail(kpiDetail === "unpaid" ? null : "unpaid")} active={kpiDetail === "unpaid"} />
      </div>

      {/* ─── KPI DETAY LİSTESİ ─── */}
      {kpiDetail && kpiDetailList.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={["flex h-7 w-7 items-center justify-center rounded-lg", kpiDetail === "completed" ? "bg-emerald-100" : kpiDetail === "cancelled_noshow" ? "bg-rose-100" : "bg-amber-100"].join(" ")}>
                {kpiDetail === "completed" ? (
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                ) : kpiDetail === "cancelled_noshow" ? (
                  <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900">{kpiDetailTitle[kpiDetail]}</h3>
                <p className="text-[10px] text-slate-400">{kpiDetailList.length} kayıt bulundu</p>
              </div>
            </div>
            <button type="button" onClick={() => setKpiDetail(null)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {kpiDetailList.map((a) => {
              const d = new Date(a.starts_at);
              const doctorName = doctors.find((doc) => doc.id === a.doctor_id)?.full_name || "Atanmamış";
              const patient = a.patient_id ? patientNames[a.patient_id] || "..." : "-";
              const initials = patient.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={a.id}
                  type="button"
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
                  onClick={() => router.push(`/${slug}/appointments/calendar?date=${a.starts_at.slice(0, 10)}`)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-bold text-slate-600">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 truncate">{patient}</p>
                    <p className="text-[10px] text-slate-400 truncate">{a.treatment_type || "Muayene"} · {doctorName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={["rounded-full border px-2 py-0.5 text-[10px] font-medium", a.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : a.status === "cancelled" || a.status === "no_show" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"].join(" ")}>{STATUS_LABELS[a.status] || a.status}</span>
                    <span className="text-[10px] text-slate-400">{d.toLocaleDateString("tr-TR")} {d.toTimeString().slice(0, 5)}</span>
                    <svg className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
          {kpiDetail === "unpaid" && (
            <div className="border-t px-5 py-3 bg-amber-50/50">
              <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                Randevuya tıklayarak takvimde açabilir ve ödeme kaydı girebilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <>
          {/* ─── RAPOR 1: RANDEVU DURUM RAPORU ─── */}
          <ReportCard title="Randevu Durum Raporu" subtitle="Gün bazlı durum kırılımı" icon={<svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>} iconBg="bg-indigo-100">
            {statusByDay.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      new Date(v + "T00:00:00").toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    labelFormatter={(v) =>
                      new Date(v + "T00:00:00").toLocaleDateString("tr-TR")
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="completed"
                    name="Tamamlandı"
                    stackId="a"
                    fill="#4BB543"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="confirmed"
                    name="Onaylı"
                    stackId="a"
                    fill="#0d9488"
                  />
                  <Bar
                    dataKey="pending"
                    name="Bekliyor"
                    stackId="a"
                    fill="#f59e0b"
                  />
                  <Bar
                    dataKey="cancelled"
                    name="İptal"
                    stackId="a"
                    fill="#e11d48"
                  />
                  <Bar
                    dataKey="no_show"
                    name="Gelmedi"
                    stackId="a"
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ReportCard>

          {/* ─── RAPOR 2 & 5: KANAL + YENİ/MEVCUT HASTA ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kanal Performans */}
            <ReportCard title="Kanal Performans Raporu" subtitle="Randevuların kaynak dağılımı" icon={<svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>} iconBg="bg-teal-100">
              {channelData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {channelData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(value?: number, name?: string) => [
                          `${value ?? 0} randevu`,
                          name ?? "",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 w-full sm:w-auto">
                    {channelData.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2.5 text-[11px]">
                        <span className="h-3 w-3 rounded-md shrink-0 shadow-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-slate-600 font-medium">{c.name}</span>
                        <span className="ml-auto font-bold text-slate-900">{c.value}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">%{c.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>

            {/* Yeni vs Mevcut Hasta */}
            <ReportCard title="Yeni vs Mevcut Hasta" subtitle="Bu dönemdeki benzersiz hastalar" icon={<svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>} iconBg="bg-violet-100">
              {totalUniquePatients === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={patientBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        <Cell fill="#0d9488" />
                        <Cell fill="#6366f1" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(value?: number, name?: string) => [
                          `${value ?? 0} hasta`,
                          name ?? "",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 w-full sm:w-auto">
                    {patientBreakdown.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-2.5 text-[11px]">
                        <span className="h-3 w-3 rounded-md shrink-0 shadow-sm" style={{ background: i === 0 ? "#0d9488" : "#6366f1" }} />
                        <span className="text-slate-600 font-medium">{p.name}</span>
                        <span className="ml-auto font-bold text-slate-900">{p.value}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          %{totalUniquePatients > 0 ? Math.round((p.value / totalUniquePatients) * 100) : 0}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">
                        Toplam <span className="text-slate-600 font-semibold">{totalUniquePatients}</span> benzersiz hasta
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ReportCard>
          </div>

          {/* ─── RAPOR 3: DOLULUK ORANI ─── */}
          <ReportCard title="Doluluk Oranı Trendi" subtitle="Gün bazlı randevu yoğunluğu (%)" icon={<svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>} iconBg="bg-emerald-100">
            {occupancyByDay.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={occupancyByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `%${v}`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(value?: number, name?: string) => [
                      name === "doluluk" ? `%${value ?? 0}` : (value ?? 0),
                      name === "doluluk" ? "Doluluk" : "Randevu",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="doluluk"
                    name="Doluluk"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0d9488" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="randevu"
                    name="Randevu"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    yAxisId={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ReportCard>

          {/* ─── RAPOR 4: DOKTOR BAZLI DAĞILIM ─── */}
          <ReportCard title="Doktor Bazlı Randevu Dağılımı" subtitle="Doktor performans karşılaştırması" icon={<svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>} iconBg="bg-sky-100">
            {doctorStats.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(180, doctorStats.length * 44)}>
                  <BarChart
                    data={doctorStats}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Bar
                      dataKey="completed"
                      name="Tamamlanan"
                      stackId="a"
                      fill="#4BB543"
                    />
                    <Bar
                      dataKey="noShow"
                      name="Gelmedi"
                      stackId="a"
                      fill="#e11d48"
                    />
                    <Bar
                      dataKey="total"
                      name="Toplam"
                      fill="#0d9488"
                      radius={[0, 4, 4, 0]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Mini tablo */}
                <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden text-[11px]">
                  <div className="grid grid-cols-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Doktor</span>
                    <span className="text-center">Toplam</span>
                    <span className="text-center">Tamamlanan</span>
                    <span className="text-center">Gelmedi</span>
                    <span className="text-center">Oran</span>
                  </div>
                  {doctorStats.map((d, i) => {
                    const isUnassigned = d.name === "Atanmamış";
                    const initials = d.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={d.name}
                        className={[
                          "grid grid-cols-5 items-center px-4 py-2.5 text-slate-700 transition-colors",
                          i > 0 ? "border-t border-slate-100" : "",
                          isUnassigned ? "bg-amber-50/40 cursor-pointer hover:bg-amber-50" : "hover:bg-slate-50/50",
                        ].join(" ")}
                        onClick={isUnassigned ? () => router.push(`/${slug}/appointments/calendar`) : undefined}
                        title={isUnassigned ? "Doktor atanmamış randevuları görmek için tıklayın" : undefined}
                      >
                        <span className="font-medium text-slate-900 truncate flex items-center gap-2">
                          <span className={["flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", isUnassigned ? "bg-amber-100 text-amber-700" : "bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700"].join(" ")}>{initials}</span>
                          <span className="truncate">{d.name}</span>
                          {isUnassigned && (
                            <span className="rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 shrink-0">Ata</span>
                          )}
                        </span>
                        <span className="text-center font-semibold">{d.total}</span>
                        <span className="text-center">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{d.completed}</span>
                        </span>
                        <span className="text-center">
                          <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", d.noShow > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-500"].join(" ")}>{d.noShow}</span>
                        </span>
                        <span className="text-center">
                          <span className="font-semibold text-slate-900">%{d.completePct}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ReportCard>

          {/* ─── OTOMASYON RAPORLARI ─── */}
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-purple-100">
                  <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Otomasyon Raporları</h3>
                    <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">Yakında</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Otomatik olarak ilgili kişilere gönderilecek</p>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AutomationCard
                icon={<svg className="h-4.5 w-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
                iconBg="bg-blue-50"
                title="Gün Sonu Özeti"
                desc="Günlük randevu, no-show ve ödeme durumu"
                target="Klinik sahibi / yönetici"
                schedule="Her gün saat 19:30"
              />
              <AutomationCard
                icon={<svg className="h-4.5 w-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>}
                iconBg="bg-indigo-50"
                title="Haftalık Performans Raporu"
                desc="Randevu, kanal dağılımı, doluluk, no-show trendi"
                target="Yönetim ekibi"
                schedule="Her Pazartesi saat 09:00"
              />
              <AutomationCard
                icon={<svg className="h-4.5 w-4.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
                iconBg="bg-amber-50"
                title="Boş Saat / Düşük Doluluk Uyarısı"
                desc="Düşük doluluklu günler için kampanya tetikleme"
                target="Otomatik WhatsApp"
                schedule="Doluluk %40 altına düştüğünde"
              />
              <AutomationCard
                icon={<svg className="h-4.5 w-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
                iconBg="bg-emerald-50"
                title="Ödeme Eksikleri Raporu"
                desc="Tamamlanmış ama ücreti girilmemiş randevular"
                target="Finans / resepsiyon"
                schedule="Her gün saat 18:00"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   ALT BİLEŞENLER
   ================================================================ */

function KPICard({
  value,
  label,
  icon,
  iconBg,
  valueColor,
  small,
  onClick,
  active,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  small?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const clickable = !!onClick;
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-4 shadow-sm transition-all",
        clickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "",
        active ? "ring-2 ring-indigo-500 ring-offset-2" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} mb-3 shadow-sm`}>
        {icon}
      </div>
      <p className={["font-bold", small ? "text-base" : "text-xl", valueColor].join(" ")}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  icon,
  iconBg,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg || "bg-slate-100"}`}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-400">Veri bulunamadı</p>
        <p className="text-[10px] text-slate-300 mt-0.5">Seçilen dönemde gösterilecek veri yok</p>
      </div>
    </div>
  );
}

function AutomationCard({
  icon,
  iconBg,
  title,
  desc,
  target,
  schedule,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  target: string;
  schedule: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-[11px] hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-xs">{title}</p>
          <p className="text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
              <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              {target}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] text-violet-600 font-medium">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              {schedule}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
