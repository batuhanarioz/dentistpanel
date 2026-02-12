 "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { localDateStr } from "@/app/lib/dateUtils";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

type ListAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  doctorName: string;
  channel: string;
  status: "ONAYLI" | "ONAY_BEKLIYOR";
  phone?: string;
  dbStatus: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
};

const channelMap: Record<string, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  phone: "Telefon",
  walk_in: "Yüz yüze",
};

const statusMap: Record<string, "ONAYLI" | "ONAY_BEKLIYOR"> = {
  confirmed: "ONAYLI",
  completed: "ONAYLI",
  pending: "ONAY_BEKLIYOR",
  created: "ONAY_BEKLIYOR",
};

export default function AppointmentsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const today = useMemo(() => localDateStr(), []);
  const PAGE_SIZE = 10;
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<ListAppointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("ALL");
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);

      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(`${selectedDate}T23:59:59`);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, patient_id, doctor_id, channel, status, starts_at, ends_at"
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
      const doctorIds = Array.from(
        new Set(data.map((a) => a.doctor_id).filter(Boolean))
      ) as string[];

      const [patientsRes, doctorsRes] = await Promise.all([
        patientIds.length
          ? supabase
              .from("patients")
              .select("id, full_name, phone")
              .in("id", patientIds)
          : Promise.resolve({ data: [], error: null } as {
              data: any[];
              error: any;
            }),
        doctorIds.length
          ? supabase
              .from("users")
              .select("id, full_name")
              .in("id", doctorIds)
          : Promise.resolve({ data: [], error: null } as {
              data: any[];
              error: any;
            }),
      ]);

      const patientsMap = Object.fromEntries(
        (patientsRes.data || []).map((p: any) => [p.id, p])
      );
      const doctorsMap = Object.fromEntries(
        (doctorsRes.data || []).map((d: any) => [d.id, d.full_name])
      );

      const mapped: ListAppointment[] = data.map((row: any) => {
        const patient = patientsMap[row.patient_id];
        const doctorName = row.doctor_id ? doctorsMap[row.doctor_id] : "";
        const uiStatus =
          statusMap[row.status as keyof typeof statusMap] ?? "ONAY_BEKLIYOR";

        return {
          id: row.id,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          patientName: patient?.full_name ?? "Hasta",
          doctorName,
          channel: channelMap[row.channel] ?? "Web",
          status: uiStatus,
          phone: patient?.phone ?? undefined,
          dbStatus: row.status,
        };
      });

      setAppointments(mapped);
      setLoading(false);
    };

    loadAppointments();
  }, [selectedDate]);

  useEffect(() => {
    // Tarih veya filtre değiştiğinde ilk sayfaya dön
    setCurrentPage(1);
  }, [selectedDate, selectedDoctor, selectedChannel]);

  const filteredAppointments = appointments.filter((appt) => {
    if (selectedDoctor !== "ALL" && appt.doctorName !== selectedDoctor) {
      return false;
    }
    if (selectedChannel !== "ALL" && appt.channel !== selectedChannel) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / PAGE_SIZE)
  );
  const currentPageAppointments = filteredAppointments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = loading ? 0 : filteredAppointments.filter(a => a.dbStatus !== "cancelled" && a.dbStatus !== "no_show").length;
  const cancelledCount = loading ? 0 : filteredAppointments.filter(a => a.dbStatus === "cancelled" || a.dbStatus === "no_show").length;
  const completedCount = loading ? 0 : filteredAppointments.filter(a => a.dbStatus === "completed").length;

  return (
    <div className="space-y-5">
      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Toplam Randevu</p>
              <p className="text-lg font-bold text-slate-900">{loading ? "..." : filteredAppointments.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Aktif</p>
              <p className="text-lg font-bold text-emerald-700">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Tamamlanan</p>
              <p className="text-lg font-bold text-blue-700">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">İptal</p>
              <p className="text-lg font-bold text-rose-700">{cancelledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Araç Çubuğu */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {new Date(selectedDate).toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PremiumDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            today={today}
          />
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            onClick={() => setSelectedDate(today)}
          >
            Bugün
          </button>
          <button
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-violet-600 transition-all flex items-center gap-1.5"
            onClick={() => router.push(`/${slug}/appointments/calendar`)}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Yeni Randevu
          </button>
        </div>
      </div>

      {/* Liste Bölümü */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Filtreler */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 pt-5 pb-3">
          <div className="flex gap-2">
            <select
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="ALL">Tüm doktorlar</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              <option value="ALL">Tüm kanallar</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Web">Web</option>
              <option value="Telefon">Telefon</option>
              <option value="Yüz yüze">Yüz yüze</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Onaylı
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Onay bekliyor
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Tamamlandı
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              İptal
            </span>
          </div>
        </div>

        {/* Tablo Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr] gap-4 items-center px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-y text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Saat</span>
              <span>Hasta</span>
              <span>Doktor</span>
              <span>Durum & Kanal</span>
            </div>

            {/* Tablo Satırları */}
            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="px-5 py-8 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Randevular yükleniyor...
                  </div>
                </div>
              )}
              {!loading && filteredAppointments.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    </div>
                    <p className="text-sm text-slate-500">Bu tarih için randevu bulunmuyor</p>
                    <p className="text-xs text-slate-400">Farklı bir tarih seçin veya yeni randevu oluşturun</p>
                  </div>
                </div>
              )}
              {!loading &&
                currentPageAppointments.map((appt) => {
                const start = new Date(appt.startsAt);
                const end = new Date(appt.endsAt);
                const timeRange = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")} - ${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;

                const now = new Date();
                const isPast = end < now;
                let statusLabel = appt.status === "ONAYLI" ? "Onaylı" : "Onay bekliyor";
                let statusClass = appt.status === "ONAYLI"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200";

                if (appt.dbStatus === "cancelled" || appt.dbStatus === "no_show") {
                  statusLabel = "İptal edildi";
                  statusClass = "bg-rose-100 text-rose-700 border-rose-200";
                } else if (isPast) {
                  statusLabel = "Tamamlandı";
                  statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                }

                const channelBadgeClass: Record<string, string> = {
                  WhatsApp: "bg-green-50 text-green-700 border-green-200",
                  Web: "bg-sky-50 text-sky-700 border-sky-200",
                  Telefon: "bg-violet-50 text-violet-700 border-violet-200",
                  "Yüz yüze": "bg-orange-50 text-orange-700 border-orange-200",
                };

                return (
                  <div
                    key={appt.id}
                    className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr] gap-4 items-center px-5 py-3.5 transition-all hover:bg-slate-50/80 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white shadow-sm shrink-0">
                        {appt.patientName[0]?.toUpperCase() ?? "H"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                          {appt.patientName}
                        </span>
                        {appt.phone && (
                          <span className="text-[11px] text-slate-400 truncate">{appt.phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      <span className="text-sm text-slate-700 truncate">
                        {appt.doctorName || "Atanmadı"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border", statusClass].join(" ")}>
                        {statusLabel}
                      </span>
                      <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", channelBadgeClass[appt.channel] ?? "bg-slate-50 text-slate-600 border-slate-200"].join(" ")}>
                        {appt.channel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!loading && filteredAppointments.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{filteredAppointments.length}</span> randevu · Sayfa <span className="font-medium text-slate-700">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 bg-white hover:bg-slate-50 text-slate-600 font-medium shadow-sm transition-colors"
              >
                Önceki
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all",
                    page === currentPage
                      ? "bg-gradient-to-r from-indigo-600 to-violet-500 text-white border border-indigo-600"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 bg-white hover:bg-slate-50 text-slate-600 font-medium shadow-sm transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

