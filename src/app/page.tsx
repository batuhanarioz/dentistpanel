"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";
import { localDateStr } from "./lib/dateUtils";

type DashboardAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  doctorName: string;
  doctorId: string | null;
  channel: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  treatmentType: string | null;
  estimatedAmount: number | null;
};

type DoctorOption = {
  id: string;
  full_name: string;
};

type ControlItemType = "status" | "approval" | "doctor" | "payment";
type ControlItemTone = "critical" | "high" | "medium" | "low";

type ControlItem = {
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

const controlToneStyles: Record<
  ControlItemTone,
  { container: string; badge: string }
> = {
  critical: {
    container: "border-l-red-600 bg-red-50 hover:bg-red-100",
    badge: "bg-red-700 text-white",
  },
  high: {
    container: "border-l-rose-600 bg-rose-50 hover:bg-rose-100",
    badge: "bg-rose-700 text-white",
  },
  medium: {
    container: "border-l-amber-500 bg-amber-50 hover:bg-amber-100",
    badge: "bg-amber-600 text-white",
  },
  low: {
    container: "border-l-sky-500 bg-sky-50 hover:bg-sky-100",
    badge: "bg-sky-600 text-white",
  },
};

const statusLabelMap: Record<string, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylı",
  completed: "Tamamlandı",
  cancelled: "İptal",
  no_show: "Gelmedi",
};

const statusClassMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  // Onaylandı: koyu yeşil
  confirmed: "bg-emerald-700 text-white",
  completed: "bg-emerald-700 text-white",
  // İptal edildi: koyu kırmızı
  cancelled: "bg-red-700 text-white",
  no_show: "bg-red-700 text-white",
};

const statusCardClassMap: Record<string, string> = {
  // Bekliyor: daha turuncuya yakın
  pending: "bg-amber-100 border-amber-200",
  // Onaylı: aynı kalsın (yumuşak yeşil)
  confirmed: "bg-emerald-50 border-emerald-100",
  // Tamamlandı: daha koyu yeşil ton
  completed: "bg-emerald-100 border-emerald-300",
  // İptal: aynı kalsın
  cancelled: "bg-rose-50 border-rose-100",
  // Gelmedi: daha kırmızıya yakın
  no_show: "bg-red-100 border-red-200",
};

function formatTime(dateString: string) {
  const d = new Date(dateString);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-emerald-600"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.04 2C6.59 2 2.18 6.41 2.18 11.86c0 2.09.61 4.02 1.78 5.71L2 22l4.57-1.91a9.8 9.8 0 0 0 5.47 1.61h.01c5.45 0 9.86-4.41 9.86-9.86C21.91 6.41 17.5 2 12.04 2Zm5.8 13.77c-.24.68-1.18 1.29-1.93 1.46-.52.11-1.2.2-3.48-.75-2.92-1.21-4.8-4.18-4.95-4.38-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.51.24.58.82 2.01.89 2.15.07.14.11.3.02.48-.09.19-.14.3-.29.46-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12.99 2.07 1.3 2.38 1.45.31.15.49.13.67-.08.18-.21.77-.9.98-1.21.21-.31.41-.26.69-.16.29.1 1.8.85 2.11 1.01.31.16.52.24.6.38.08.14.08.8-.16 1.48Z"
      />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const baseToday = useMemo(() => localDateStr(), []);
  const [viewOffsetAppointments, setViewOffsetAppointments] =
    useState<0 | 1>(0); // 0: bugün, 1: yarın
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
              .select("id, full_name")
              .in("id", patientIds)
          : Promise.resolve({ data: [], error: null } as {
              data: any[];
              error: any;
            }),
        supabase
          .from("users")
          .select("id, full_name")
          .eq("role", "DOCTOR"),
      ]);

      const patientsMap = Object.fromEntries(
        (patientsRes.data || []).map((p: any) => [p.id, p.full_name])
      );
      const doctorsMap = Object.fromEntries(
        (doctorsRes.data || []).map((d: any) => [d.id, d.full_name])
      );

      setDoctors((doctorsRes.data || []) as DoctorOption[]);

      const now = new Date();

      const mapped: DashboardAppointment[] = data.map((row: any) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        patientName: patientsMap[row.patient_id] ?? "Hasta",
        doctorName: doctorsMap[row.doctor_id] ?? "Doktor atanmadı",
        doctorId: row.doctor_id ?? null,
        channel: row.channel,
        status: row.status,
        treatmentType: row.treatment_type ?? null,
        estimatedAmount:
          row.estimated_amount !== null ? Number(row.estimated_amount) : null,
      }));

      // Ödemeleri çek (tamamlanmış fakat ödemesi olmayan randevular için)
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

      // Yalnızca seçili gün için, tamamlanmamış ve (bugünse) saati gelmemiş randevuları göster
      const upcomingNotCompleted = mapped.filter((a) => {
        if (a.status === "completed") return false;
        const startDate = new Date(a.startsAt);

        // Bugün görünümünde, geçmiş saatleri gösterme
        if (viewOffsetAppointments === 0) {
          return startDate > now;
        }

        // Yarın görünümünde tüm gün (tamamlanmamış) randevuları göster
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
        .select("id, full_name")
        .in("id", patientIds);

      const patientsMap = Object.fromEntries(
        (patientsData || []).map((p: any) => [p.id, p.full_name])
      );

      const now = new Date();

      const mapped: DashboardAppointment[] = data.map((row: any) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        patientName: patientsMap[row.patient_id] ?? "Hasta",
        doctorName: "",
        doctorId: row.doctor_id ?? null,
        channel: row.channel,
        status: row.status,
        treatmentType: row.treatment_type ?? null,
        estimatedAmount: null,
      }));

      // Ödemeleri çek (tamamlanmış fakat ödemesi olmayan randevular için)
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

      // Kontrol listesi öğelerini üret
      const controls: ControlItem[] = [];

      mapped.forEach((appt) => {
        const startDate = new Date(appt.startsAt);
        const endDate = new Date(appt.endsAt);
        const timeLabel = `${formatTime(appt.startsAt)} - ${formatTime(
          appt.endsAt
        )}`;
        const treatmentLabel =
          appt.treatmentType?.trim() || "Genel muayene";

        // 1) Geldi gitti (durum) güncellemesi: süresi geçmiş ama final durumuna alınmamış
        if (
          endDate < now &&
          appt.status !== "completed" &&
          appt.status !== "cancelled" &&
          appt.status !== "no_show"
        ) {
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

        // 2) Onay bekleyen randevular
        if (appt.status === "pending") {
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

        // 3) Doktor ataması yapılmamış randevular
        if (!appt.doctorId) {
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

        // 4) Tedavisi tamamlanmış ama ödeme girişi olmayan randevular
        if (appt.status === "completed" && !paymentsMap[appt.id]) {
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
      });

      // En son gelen bildirim en üstte
      controls.sort((a, b) => b.sortTime - a.sortTime);
      setControlItems(controls);
    };

    loadControlItems();
  }, [viewDateControls, viewOffsetControls]);

  const totalToday = appointments.length;

  const channelCounts = appointments.reduce(
    (acc, a) => {
      acc[a.channel] = (acc[a.channel] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const channelTotal = Object.values(channelCounts).reduce(
    (sum, v) => sum + v,
    0
  );

  const channelPercent = (channel: string) => {
    if (!channelTotal) return 0;
    return Math.round(((channelCounts[channel] ?? 0) / channelTotal) * 100);
  };

  const channelLabelMap: Record<string, string> = {
    whatsapp: "WhatsApp",
    web: "Web",
    phone: "Telefon",
    walk_in: "Yüz yüze",
  };

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
        // Eğer randevu tamamlandıysa listeden çıkar
        .filter((appt) => appt.status !== "completed")
    );
  };

  const handleReminderClick = (appointmentId: string) => {
    // Otomasyon entegrasyonu burada devreye girecek.
    // Şimdilik placeholder.
    console.log("Hatırlatma akışı tetiklenecek:", appointmentId);
  };

  const handleControlItemClick = (item: ControlItem) => {
    if (item.type === "payment") {
      router.push(`/payments?appointmentId=${item.appointmentId}`);
      return;
    }

    // Varsayılan: randevu takviminde kartı aç
    router.push(`/appointments/calendar?appointmentId=${item.appointmentId}`);
  };

  const isTodayAppointmentsView = viewOffsetAppointments === 0;
  const isTodayControlsView = viewOffsetControls === 0;

  return (
    <div className="space-y-6">
      <section className="space-y-4 max-w-5xl mx-auto w-full">
        <div className="rounded-xl border bg-white p-4 max-w-md w-full mx-auto md:max-w-none md:mx-0 min-h-[260px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">
                {isTodayAppointmentsView
                  ? "Bugünkü Randevular"
                  : "Yarının Randevuları"}{" "}
                <span className="ml-1 text-xs font-normal text-slate-600">
                  ({loading ? "…" : `${totalToday} randevu`})
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setViewOffsetAppointments((prev) => (prev === 0 ? 1 : 0))
              }
              className="text-[11px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full px-2 py-1 transition-colors"
            >
              {isTodayAppointmentsView ? "Yarın >>" : "<< Bugün"}
            </button>
          </div>
          {/* Mobil görünüm: her randevu için dikey kartlar (maksimum 2 satır görünür, aşağı kaydırılabilir) */}
          <div className="space-y-2 md:hidden text-xs max-h-[180px] overflow-y-auto pr-1">
            {loading && (
              <div className="py-3 text-center text-slate-700">
                Randevular yükleniyor...
              </div>
            )}
            {!loading && appointments.length === 0 && (
              <div className="py-3 text-center text-slate-700">
                Kayıtlı randevu yok. Randevu takviminden yeni randevu
                ekleyebilirsiniz.
              </div>
            )}
            {!loading &&
              appointments.map((appt) => {
                const startLabel = formatTime(appt.startsAt);
                const endLabel = formatTime(appt.endsAt);
                const timeRange = `${startLabel} - ${endLabel}`;
                const treatmentLabel =
                  appt.treatmentType?.trim() || "Genel muayene";
                const cardStatusClass =
                  statusCardClassMap[appt.status] ??
                  "bg-slate-50 border-slate-200";

                return (
                  <div
                    key={appt.id}
                    className={[
                      "rounded-lg border px-3 py-2 space-y-1 transition-colors",
                      cardStatusClass,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        {timeRange}
                        <span className="ml-1 text-slate-700">
                          · {treatmentLabel}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {appt.patientName}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReminderClick(appt.id)}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 shadow-sm"
                      >
                        <WhatsAppIcon />
                        <span className="ml-1">Hatırlatma Yap</span>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {appt.status === "pending" ? (
                        <select
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] flex-shrink-0"
                          value={appt.status}
                          onChange={(e) =>
                            handleStatusChange(
                              appt.id,
                              e.target.value as DashboardAppointment["status"]
                            )
                          }
                        >
                          <option value="pending">
                            Onay durumu: Bekliyor
                          </option>
                          <option value="confirmed">Onaylandı</option>
                          <option value="cancelled">İptal Edildi</option>
                        </select>
                      ) : (
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px]",
                            statusClassMap[appt.status] ??
                              "bg-slate-100 text-slate-800",
                          ].join(" ")}
                        >
                          {statusLabelMap[appt.status]}
                        </span>
                      )}
                      <div className="flex-1 flex justify-end">
                        {appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                          <span className="text-[11px] text-slate-700">
                            {appt.doctorName}
                          </span>
                        ) : doctors.length > 0 ? (
                          <select
                            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                            defaultValue=""
                            onChange={(e) =>
                              handleAssignDoctor(appt.id, e.target.value)
                            }
                          >
                            <option value="">Doktor atanmadı</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.full_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Doktor atanmadı
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Masaüstü / tablet görünüm: 4 kolonlu tablo */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[640px] grid grid-cols-4 text-xs font-medium text-slate-800 border-b pb-2">
                <span>Saat / İşlem</span>
                <span>Hasta</span>
                <span>Doktor</span>
                <span>Durum &amp; Aksiyonlar</span>
              </div>
              <div className="min-w-[640px] divide-y text-xs">
                {loading && (
                  <div className="grid grid-cols-4 py-4 text-slate-800 text-xs">
                    <span className="col-span-4 text-center">
                      Randevular yükleniyor...
                    </span>
                  </div>
                )}
                {!loading && appointments.length === 0 && (
                  <div className="grid grid-cols-4 py-4 text-slate-800 text-xs">
                    <span className="col-span-4 text-center">
                      Kayıtlı randevu yok. Randevu takviminden yeni
                      randevu ekleyebilirsiniz.
                    </span>
                  </div>
                )}
                {!loading &&
                  appointments.map((appt) => {
                    const startLabel = formatTime(appt.startsAt);
                    const endLabel = formatTime(appt.endsAt);
                    const timeRange = `${startLabel} - ${endLabel}`;
                    const treatmentLabel =
                      appt.treatmentType?.trim() || "Genel muayene";
                const rowStatusClass =
                  statusCardClassMap[appt.status]?.split(" ")[0] ?? "";

                    return (
                      <div
                        key={appt.id}
                    className={[
                      "grid grid-cols-4 py-2 items-center rounded-md px-1 transition-colors",
                      rowStatusClass,
                    ].join(" ")}
                      >
                        <span>
                          <div>{timeRange}</div>
                          <div className="text-[11px] text-slate-600">
                            {treatmentLabel}
                          </div>
                        </span>
                        <span className="font-medium text-slate-900">
                          {appt.patientName}
                        </span>
                        <span>
                          {appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                            <div>{appt.doctorName}</div>
                          ) : doctors.length > 0 ? (
                            <select
                              className="mt-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                              defaultValue=""
                              onChange={(e) =>
                                handleAssignDoctor(appt.id, e.target.value)
                              }
                            >
                              <option value="">Doktor atanmadı</option>
                              {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.full_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-[11px] text-slate-500">
                              Doktor atanmadı
                            </div>
                          )}
                        </span>
                        <span className="space-y-1">
                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleReminderClick(appt.id)}
                              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                            >
                              <WhatsAppIcon />
                              <span className="ml-1">Hatırlatma Yap</span>
                            </button>
                            {appt.status === "pending" ? (
                              <select
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                                value={appt.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    appt.id,
                                    e.target.value as DashboardAppointment["status"]
                                  )
                                }
                              >
                                <option value="pending">
                                  Onay durumu: Bekliyor
                                </option>
                                <option value="confirmed">Onaylandı</option>
                                <option value="cancelled">İptal Edildi</option>
                              </select>
                            ) : (
                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px]",
                                  statusClassMap[appt.status] ??
                                    "bg-slate-100 text-slate-800",
                                ].join(" ")}
                              >
                                {statusLabelMap[appt.status]}
                              </span>
                            )}
                          </div>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 max-w-md w-full mx-auto md:max-w-none md:mx-0 min-h-[220px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Kontrol Listesi
            </h2>
            <button
              type="button"
              onClick={() =>
                setViewOffsetControls((prev) => (prev === 0 ? 1 : 0))
              }
              className="text-[11px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-full px-2 py-1 transition-colors"
            >
              {isTodayControlsView ? "Yarın >>" : "<< Bugün"}
            </button>
          </div>
          <div className="text-[11px] text-slate-600 mb-2">
            {isTodayControlsView
              ? "Bugün için aksiyon bekleyen kayıtlar."
              : "Yarın için aksiyon planı."}
          </div>
          <div className="space-y-2 text-xs max-h-44 overflow-y-auto pr-1">
            {controlItems.length === 0 && (
              <p className="text-slate-600 text-[11px]">
                Şu anda kontrol gerektiren bir öğe bulunmuyor.
              </p>
            )}
            {controlItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleControlItemClick(item)}
                className={[
                  "w-full text-left flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 transition-colors border-l-4",
                  controlToneStyles[item.tone]?.container ?? "bg-slate-50",
                ].join(" ")}
              >
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-slate-900">
                    {item.patientName}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {item.timeLabel} · {item.treatmentLabel}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-800">
                    {item.actionLabel}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium flex-shrink-0 ml-2">
                  {item.type === "payment"
                    ? "Ödeme ekranını aç"
                    : "Takvimde aç"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 max-w-md w-full mx-auto md:max-w-none md:mx-0">
          <p className="text-xs font-medium text-slate-700 uppercase">
            Kanal Dağılımı
          </p>
          <div className="mt-3 space-y-2 text-xs text-slate-800">
            {["whatsapp", "web", "phone", "walk_in"].map((ch) => {
              const percent = channelPercent(ch);
              return (
                <div key={ch} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{channelLabelMap[ch]}</span>
                    <span className="text-[11px] text-slate-600">
                      {percent}% ({channelCounts[ch] ?? 0})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!channelTotal && (
              <p className="pt-1 text-[11px] text-slate-600">
                Bugün için kayıtlı randevu olmadığı için kanal dağılımı
                gösterilemiyor.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
