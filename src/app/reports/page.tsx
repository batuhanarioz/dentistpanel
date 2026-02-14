"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole } from "@/types/database";
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

// const PIE_COLORS = ["#0d9488", "#f59e0b", "#e11d48", "#6366f1", "#64748b"];

/* ================================================================
   COMPONENT
   ================================================================ */
type KPIDetailType = "completed" | "cancelled_noshow" | "unpaid" | null;

export default function ReportsPage() {
  const router = useRouter();

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
        .eq("role", UserRole.DOKTOR),
    ]);

    const appts: AppointmentRow[] = (apptRes.data || []).map((r) => ({
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
      (payRes.data || []).map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        appointment_id: r.appointment_id,
      }))
    );
    setDoctors(
      (docRes.data || []).map((r) => ({
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
      (patientData || []).forEach((p) => {
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
  /*
  const unpaidTotal = payments
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);
  */

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
        (data || []).forEach((p) => {
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
      const s = a.status;
      if (
        s === "completed" ||
        s === "confirmed" ||
        s === "pending" ||
        s === "cancelled" ||
        s === "no_show"
      ) {
        map[day][s]++;
      }
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
     4) DOCTOR BAZLI RANDEVU DAĞILIMI
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

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-5 max-w-5xl mx-auto w-full">
      {/* ─── 1️⃣ GLOBAL KONTROLLER ─── */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {/* Tarih preset'leri */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-700">
              Dönem:
            </span>
            {(
              [
                ["today", "Bugün"],
                ["7d", "Son 7 Gün"],
                ["30d", "Son 30 Gün"],
                ["custom", "Özel"],
              ] as [DatePreset, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-medium transition-colors border",
                  preset === key
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
            {preset === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-md border px-2 py-1 text-[11px]"
                />
                <span className="text-[11px] text-slate-500">–</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-md border px-2 py-1 text-[11px]"
                />
              </div>
            )}
          </div>

          {/* Doktor filtresi */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-700">
              Doktor:
            </span>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="rounded-md border px-2 py-1 text-[11px] bg-white"
            >
              <option value="ALL">Tümü</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aktif dönem göstergesi */}
        <p className="mt-2 text-[10px] text-slate-500">
          Aktif dönem: <span className="font-medium text-slate-700">{rangeLabel}</span>
          {doctorFilter !== "ALL" && (
            <span>
              {" "}
              · Doktor:{" "}
              <span className="font-medium text-slate-700">
                {doctors.find((d) => d.id === doctorFilter)?.full_name}
              </span>
            </span>
          )}
        </p>
      </div>

      {loading && (
        <p className="text-xs text-slate-600 text-center py-6">
          Veriler yükleniyor...
        </p>
      )}

      {/* ─── 2️⃣ KPI ÖZET KARTLARI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          value={String(totalAppts)}
          label="Toplam Randevu"
          hint="Seçili dönemdeki tüm randevular"
          color="text-slate-900"
          bg="bg-white"
        />
        <KPICard
          value={String(completedAppts)}
          label="Tamamlanan"
          hint="Başarıyla gerçekleşen randevular"
          color="text-emerald-700"
          bg="bg-emerald-50"
          onClick={() => setKpiDetail(kpiDetail === "completed" ? null : "completed")}
          active={kpiDetail === "completed"}
        />
        <KPICard
          value={String(cancelledNoShow)}
          label="İptal + Gelmedi"
          hint="İptal edilen ve gelmeyen hastalar"
          color="text-rose-700"
          bg="bg-rose-50"
          onClick={() => setKpiDetail(kpiDetail === "cancelled_noshow" ? null : "cancelled_noshow")}
          active={kpiDetail === "cancelled_noshow"}
        />
        <KPICard
          value={`%${occupancyPct}`}
          label="Ort. Doluluk"
          hint="Çalışma saatlerine göre doluluk oranı"
          color="text-teal-700"
          bg="bg-teal-50"
        />
        <KPICard
          value={fmtCurrency(paidTotal)}
          label="Tahsil Edilen"
          hint="Seçili dönemde girilen ödemeler"
          color="text-emerald-700"
          bg="bg-emerald-50"
          small
        />
        <KPICard
          value={unpaidCompletedCount > 0 ? String(unpaidCompletedCount) : "0"}
          label="Ödemesiz Randevu"
          hint="Tamamlanmış ama ödemesi girilmemiş"
          color={unpaidCompletedCount > 0 ? "text-amber-700" : "text-slate-700"}
          bg={unpaidCompletedCount > 0 ? "bg-amber-50" : "bg-white"}
          onClick={() => setKpiDetail(kpiDetail === "unpaid" ? null : "unpaid")}
          active={kpiDetail === "unpaid"}
        />
      </div>

      {/* ─── KPI DETAY LİSTESİ ─── */}
      {kpiDetail && kpiDetailList.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900">
              {kpiDetailTitle[kpiDetail]} ({kpiDetailList.length})
            </h3>
            <button
              type="button"
              onClick={() => setKpiDetail(null)}
              className="rounded-full border px-2.5 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {kpiDetailList.map((a) => {
              const d = new Date(a.starts_at);
              const doctorName =
                doctors.find((doc) => doc.id === a.doctor_id)?.full_name ||
                "Atanmamış";
              const patient = a.patient_id
                ? patientNames[a.patient_id] || "..."
                : "-";
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[11px] hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/appointments/calendar?date=${a.starts_at.slice(0, 10)}`
                    )
                  }
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">
                      {patient}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      · {a.treatment_type || "Muayene"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-600">
                    <span>{doctorName}</span>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5",
                        a.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.status === "cancelled" || a.status === "no_show"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                    <span>
                      {d.toLocaleDateString("tr-TR")} {d.toTimeString().slice(0, 5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {kpiDetail === "unpaid" && (
            <p className="mt-2 text-[10px] text-amber-700">
              Randevuya tıklayarak takvimde açabilir ve ödeme kaydı girebilirsiniz.
            </p>
          )}
        </div>
      )}

      {!loading && (
        <>
          {/* ─── RAPOR 1: RANDEVU DURUM RAPORU ─── */}
          <ReportCard title="Randevu Durum Raporu" subtitle="Gün bazlı durum kırılımı">
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
            <ReportCard
              title="Kanal Performans Raporu"
              subtitle="Randevuların kaynak dağılımı"
            >
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
                  <div className="space-y-1.5 w-full sm:w-auto">
                    {channelData.map((c, i) => (
                      <div
                        key={c.name}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-slate-700">{c.name}</span>
                        <span className="ml-auto font-medium text-slate-900">
                          {c.value}{" "}
                          <span className="text-slate-500">(%{c.pct})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportCard>

            {/* Yeni vs Mevcut Hasta */}
            <ReportCard
              title="Yeni vs Mevcut Hasta"
              subtitle="Bu dönemdeki benzersiz hastalar"
            >
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
                  <div className="space-y-2 w-full sm:w-auto">
                    {patientBreakdown.map((p, i) => (
                      <div
                        key={p.name}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            background: i === 0 ? "#0d9488" : "#6366f1",
                          }}
                        />
                        <span className="text-slate-700">{p.name}</span>
                        <span className="ml-auto font-medium text-slate-900">
                          {p.value}{" "}
                          <span className="text-slate-500">
                            (%
                            {totalUniquePatients > 0
                              ? Math.round(
                                (p.value / totalUniquePatients) * 100
                              )
                              : 0}
                            )
                          </span>
                        </span>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 pt-1">
                      Toplam {totalUniquePatients} benzersiz hasta
                    </p>
                  </div>
                </div>
              )}
            </ReportCard>
          </div>

          {/* ─── RAPOR 3: DOLULUK ORANI ─── */}
          <ReportCard
            title="Doluluk Oranı Trendi"
            subtitle="Gün bazlı randevu yoğunluğu (%)"
          >
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

          {/* ─── RAPOR 4: DOCTOR BAZLI DAĞILIM ─── */}
          <ReportCard
            title="Doktor Bazlı Randevu Dağılımı"
            subtitle="Doktor performans karşılaştırması"
          >
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
                <div className="mt-3 border rounded-lg overflow-hidden text-[11px]">
                  <div className="grid grid-cols-5 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                    <span>Doktor</span>
                    <span className="text-center">Toplam</span>
                    <span className="text-center">Tamamlanan</span>
                    <span className="text-center">Gelmedi</span>
                    <span className="text-center">Tamamlanma %</span>
                  </div>
                  {doctorStats.map((d) => {
                    const isUnassigned = d.name === "Atanmamış";
                    return (
                      <div
                        key={d.name}
                        className={[
                          "grid grid-cols-5 px-3 py-1.5 border-t text-slate-700",
                          isUnassigned
                            ? "bg-amber-50/60 cursor-pointer hover:bg-amber-100/60 transition-colors"
                            : "",
                        ].join(" ")}
                        onClick={
                          isUnassigned
                            ? () => router.push("/appointments/calendar")
                            : undefined
                        }
                        title={
                          isUnassigned
                            ? "Doktor atanmamış randevuları görmek için tıklayın"
                            : undefined
                        }
                      >
                        <span className="font-medium text-slate-900 truncate flex items-center gap-1">
                          {isUnassigned && (
                            <svg
                              className="h-3.5 w-3.5 text-amber-600 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          {d.name}
                          {isUnassigned && (
                            <span className="text-[9px] text-amber-600 font-normal">
                              (Ata)
                            </span>
                          )}
                        </span>
                        <span className="text-center">{d.total}</span>
                        <span className="text-center text-emerald-700">
                          {d.completed}
                        </span>
                        <span className="text-center text-rose-700">
                          {d.noShow}
                        </span>
                        <span className="text-center font-medium">
                          %{d.completePct}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ReportCard>

          {/* ─── OTOMASYON RAPORLARI (Bilgi kartları) ─── */}
          <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🤖</span>
              <h3 className="text-xs font-semibold text-slate-900">
                Otomasyon Raporları
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Yakında
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Aşağıdaki raporlar otomasyon entegrasyonuyla otomatik olarak ilgili
              kişilere gönderilecek.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <AutomationCard
                icon="📩"
                title="Gün Sonu Özeti"
                desc="Günlük randevu, no-show ve ödeme durumu"
                target="Klinik sahibi / yönetici"
                schedule="Her gün saat 19:30"
              />
              <AutomationCard
                icon="📊"
                title="Haftalık Performans Raporu"
                desc="Randevu, kanal dağılımı, doluluk, no-show trendi"
                target="Yönetim ekibi"
                schedule="Her Pazartesi saat 09:00"
              />
              <AutomationCard
                icon="⏰"
                title="Boş Saat / Düşük Doluluk Uyarısı"
                desc="Düşük doluluklu günler için kampanya tetikleme"
                target="Otomatik WhatsApp"
                schedule="Doluluk %40 altına düştüğünde"
              />
              <AutomationCard
                icon="💰"
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
  hint,
  color,
  bg,
  small,
  onClick,
  active,
}: {
  value: string;
  label: string;
  hint?: string;
  color: string;
  bg: string;
  small?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const clickable = !!onClick;
  return (
    <div
      className={[
        "rounded-xl border p-3.5 text-center shadow-sm transition-all",
        bg,
        clickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : "",
        active ? "ring-2 ring-teal-500 ring-offset-1" : "",
      ].join(" ")}
      onClick={onClick}
      title={hint}
    >
      <p
        className={[
          "font-bold",
          small ? "text-base" : "text-xl",
          color,
        ].join(" ")}
      >
        {value}
      </p>
      <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
      {hint && (
        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{hint}</p>
      )}
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
        <p className="text-[10px] text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-[11px] text-slate-400">
        Seçilen dönemde veri bulunmuyor.
      </p>
    </div>
  );
}

function AutomationCard({
  icon,
  title,
  desc,
  target,
  schedule,
}: {
  icon: string;
  title: string;
  desc: string;
  target: string;
  schedule: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>
      <p className="text-slate-600">{desc}</p>
      <div className="flex items-center justify-between mt-1.5 text-[10px]">
        <span className="text-slate-400">Hedef: {target}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {schedule}
        </span>
      </div>
    </div>
  );
}
