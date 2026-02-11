 "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { localDateStr } from "../lib/dateUtils";

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

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-base md:text-lg font-semibold text-slate-900">
            Toplam{" "}
            <span className="text-teal-700">
              {loading
                ? "…"
                : filteredAppointments.filter(
                    (a) =>
                      a.dbStatus !== "cancelled" && a.dbStatus !== "no_show"
                  ).length}
            </span>{" "}
            randevu
          </p>
          {!loading &&
            filteredAppointments.some(
              (a) =>
                a.dbStatus === "cancelled" || a.dbStatus === "no_show"
            ) && (
              <p className="text-sm text-rose-600 font-medium">
                {
                  filteredAppointments.filter(
                    (a) =>
                      a.dbStatus === "cancelled" || a.dbStatus === "no_show"
                  ).length
                }{" "}
                iptal
              </p>
            )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs items-center">
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-xs"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="rounded-md border px-2 py-1 bg-white"
            onClick={() => setSelectedDate(today)}
          >
            Bugün
          </button>
          <button
            className="rounded-md border px-2 py-1 bg-teal-600 text-white"
            onClick={() => router.push("/appointments/calendar")}
          >
            Yeni randevu
          </button>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3 text-xs">
          <div className="flex gap-2">
            <select
              className="rounded-md border px-2 py-1"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="ALL">Tüm doktorlar</option>
              {/* Doktor filtrelemesi için ileride dinamik liste eklenebilir */}
            </select>
            <select
              className="rounded-md border px-2 py-1"
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
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Onaylı
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Onay bekliyor
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[560px] grid grid-cols-4 text-[11px] font-medium text-slate-800 border-b pb-2">
            <span>Saat</span>
            <span>Hasta</span>
            <span>Doktor</span>
            <span>Durum / Kanal</span>
          </div>

          <div className="min-w-[560px] divide-y text-[11px]">
            {loading && (
              <div className="py-4 text-center text-slate-700">
                Randevular yükleniyor...
              </div>
            )}
            {!loading && filteredAppointments.length === 0 && (
              <div className="py-4 text-center text-slate-700">
                Seçili tarih için randevu bulunmuyor.
              </div>
            )}
            {!loading &&
              currentPageAppointments.map((appt) => {
              const start = new Date(appt.startsAt);
              const end = new Date(appt.endsAt);
              const timeRange = `${start
                .getHours()
                .toString()
                .padStart(2, "0")}:${start
                .getMinutes()
                .toString()
                .padStart(2, "0")} - ${end
                .getHours()
                .toString()
                .padStart(2, "0")}:${end
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;

              const now = new Date();
              const isPast = end < now;
              let statusLabel =
                appt.status === "ONAYLI" ? "Onaylı" : "Onay bekliyor";
              let statusClass =
                appt.status === "ONAYLI"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800";

              if (
                appt.dbStatus === "cancelled" ||
                appt.dbStatus === "no_show"
              ) {
                statusLabel = "İptal edildi";
                statusClass = "bg-rose-100 text-rose-800";
              } else if (isPast) {
                statusLabel = "Randevu gerçekleştirildi";
                statusClass = "bg-emerald-700 text-white";
              }

                return (
                  <div
                    key={appt.id}
                    className="grid grid-cols-4 py-2 items-center"
                  >
                    <span className="text-slate-800">{timeRange}</span>
                    <span className="text-slate-900 font-medium">
                      {appt.patientName}
                    </span>
                    <span className="text-slate-800">
                      {appt.doctorName || "Doktor atanmadı"}
                    </span>
                    <span className="flex flex-col gap-0.5 text-slate-800">
                      <span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] mr-1 ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-[11px]">{appt.channel}</span>
                      </span>
                      {appt.phone && (
                        <span className="text-[10px] text-slate-600">
                          {appt.phone}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {!loading && filteredAppointments.length > 0 && (
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-700">
            <span>
              Toplam {filteredAppointments.length} randevu · Sayfa {currentPage}{" "}
              / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                className="rounded-md border border-slate-200 px-2 py-0.5 disabled:opacity-50 bg-white hover:bg-slate-50 text-slate-800"
              >
                Önceki
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={[
                      "rounded-md px-2 py-0.5 border border-slate-200 text-[11px]",
                      page === currentPage
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-800 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="rounded-md border border-slate-200 px-2 py-0.5 disabled:opacity-50 bg-white hover:bg-slate-50 text-slate-800"
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

