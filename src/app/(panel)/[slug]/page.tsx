"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { localDateStr } from "@/app/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";

type DashboardAppointment = {
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
  const params = useParams();
  const slug = params.slug as string;
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
          : Promise.resolve({ data: [], error: null } as {
            data: any[];
            error: any;
          }),
        supabase
          .from("users")
          .select("id, full_name")
          .in("role", ["DOKTOR"]),
      ]);

      const patientsMap = Object.fromEntries(
        (patientsRes.data || []).map((p: any) => [
          p.id,
          { full_name: p.full_name, phone: p.phone },
        ])
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
        patientName: patientsMap[row.patient_id]?.full_name ?? "Hasta",
        patientPhone: patientsMap[row.patient_id]?.phone ?? null,
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
        .select("id, full_name, phone")
        .in("id", patientIds);

      const patientsMap = Object.fromEntries(
        (patientsData || []).map((p: any) => [
          p.id,
          { full_name: p.full_name, phone: p.phone },
        ])
      );

      const now = new Date();

      const mapped: DashboardAppointment[] = data.map((row: any) => ({
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
      const userRole = clinic.userRole || "SEKRETER";
      const userId = clinic.userId;

      const canShowTask = (code: string, apptDoctorId?: string | null) => {
        const config = taskAssignments[code];
        if (!config || !config.enabled) return false;

        if (clinic.isAdmin) return true;

        // Eğer görev doktor içinse ve randevu doktoru bu kullanıcıysa görsün
        if (config.role === "DOKTOR" && apptDoctorId === userId) return true;

        return config.role === userRole;
      };

      mapped.forEach((appt) => {
        const startDate = new Date(appt.startsAt);
        const endDate = new Date(appt.endsAt);
        const timeLabel = `${formatTime(appt.startsAt)} - ${formatTime(
          appt.endsAt
        )}`;
        const treatmentLabel =
          appt.treatmentType?.trim() || "Genel muayene";

        // 1) Geldi gitti (durum) güncellemesi: süresi geçmiş ama final durumuna alınmamış
        // ADMIN ve SEKRETER hepsini görür, DOKTOR sadece kendisininkini
        if (
          endDate < now &&
          appt.status !== "completed" &&
          appt.status !== "cancelled" &&
          appt.status !== "no_show"
        ) {
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

        // 2) Onay bekleyen randevular
        // Sadece ADMIN ve SEKRETER
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

        // 3) Doktor ataması yapılmamış randevular
        // Sadece ADMIN ve SEKRETER
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

        // 4) Tedavisi tamamlanmış ama ödeme girişi olmayan randevular
        // Sadece ADMIN ve FINANS
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
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt || !appt.patientPhone) {
      alert("Hasta telefonu kayıtlı değil!");
      return;
    }

    // Telefon numarasını temizle (sadece rakamlar)
    const phone = appt.patientPhone.replace(/\D/g, "");

    // Basit bir selamlama/hatırlatma mesajı şablonu
    const text = `Merhaba Sayın ${appt.patientName}, randevunuzu hatırlatmak isteriz.`;

    // WhatsApp linkini aç
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleControlItemClick = (item: ControlItem) => {
    if (item.type === "payment") {
      router.push(`/${slug}/payment-management?appointmentId=${item.appointmentId}`);
      return;
    }

    // Varsayılan: randevu listesinde/takviminde aç
    router.push(`/${slug}/appointments?appointmentId=${item.appointmentId}`);
  };

  const isTodayAppointmentsView = viewOffsetAppointments === 0;
  const isTodayControlsView = viewOffsetControls === 0;

  const pendingCount = appointments.filter(a => a.status === "pending").length;
  const confirmedCount = appointments.filter(a => a.status === "confirmed").length;

  const statusBadgeClass: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    no_show: "bg-rose-100 text-rose-700 border-rose-200",
  };

  const channelColorMap: Record<string, string> = {
    whatsapp: "from-emerald-500 to-green-500",
    web: "from-sky-500 to-blue-500",
    phone: "from-violet-500 to-purple-500",
    walk_in: "from-orange-500 to-amber-500",
  };

  const channelIconMap: Record<string, React.ReactNode> = {
    whatsapp: <WhatsAppIcon />,
    web: <svg className="h-3.5 w-3.5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
    phone: <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>,
    walk_in: <svg className="h-3.5 w-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
  };

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">{isTodayAppointmentsView ? "Bugün" : "Yarın"}</p>
              <p className="text-lg font-bold text-slate-900">{loading ? "..." : totalToday} <span className="text-sm font-normal text-slate-400">randevu</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Onaylı</p>
              <p className="text-lg font-bold text-emerald-700">{confirmedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Onay Bekleyen</p>
              <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Kontrol Bekleyen</p>
              <p className="text-lg font-bold text-rose-700">{controlItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Randevular & Kontrol Listesi */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Randevular */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isTodayAppointmentsView ? "Bugünkü Randevular" : "Yarının Randevuları"}
                </h2>
                <p className="text-[11px] text-slate-400">{loading ? "Yükleniyor..." : `${totalToday} randevu listeleniyor`}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewOffsetAppointments((prev) => (prev === 0 ? 1 : 0))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {isTodayAppointmentsView ? "Yarın →" : "← Bugün"}
            </button>
          </div>

          {/* Mobil Kartlar */}
          <div className="space-y-2 md:hidden px-5 pb-5 text-xs max-h-[320px] overflow-y-auto">
            {loading && (
              <div className="py-6 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Yükleniyor...
                </div>
              </div>
            )}
            {!loading && appointments.length === 0 && (
              <div className="py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-2">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                </div>
                <p className="text-sm text-slate-500">Randevu bulunmuyor</p>
                <p className="text-xs text-slate-400 mt-0.5">Takvimden yeni randevu ekleyebilirsiniz</p>
              </div>
            )}
            {!loading && appointments.map((appt) => {
              const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
              const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
              return (
                <div key={appt.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[9px] font-bold text-white">{appt.patientName[0]?.toUpperCase()}</div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900">{appt.patientName}</span>
                        <div className="text-[10px] text-slate-400">{timeRange} · {treatmentLabel}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleReminderClick(appt.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                      <WhatsAppIcon /><span>Hatırlat</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    {appt.status === "pending" ? (
                      <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]" value={appt.status} onChange={(e) => handleStatusChange(appt.id, e.target.value as DashboardAppointment["status"])}>
                        <option value="pending">Onay bekliyor</option><option value="confirmed">Onaylandı</option><option value="cancelled">İptal</option>
                      </select>
                    ) : (
                      <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border", statusBadgeClass[appt.status] ?? "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>{statusLabelMap[appt.status]}</span>
                    )}
                    <div>{appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                      <span className="text-[11px] text-slate-600">{appt.doctorName}</span>
                    ) : doctors.length > 0 ? (
                      <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]" defaultValue="" onChange={(e) => handleAssignDoctor(appt.id, e.target.value)}>
                        <option value="">Doktor atanmadı</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                      </select>
                    ) : <span className="text-[11px] text-slate-400">Doktor atanmadı</span>}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Tablo */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[1fr_1.2fr_1fr_1.5fr] gap-3 items-center px-5 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-y text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Saat / İşlem</span>
                  <span>Hasta</span>
                  <span>Doktor</span>
                  <span>Durum & Aksiyonlar</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {loading && (
                    <div className="px-5 py-8 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Yükleniyor...
                      </div>
                    </div>
                  )}
                  {!loading && appointments.length === 0 && (
                    <div className="px-5 py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-2">
                        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                      </div>
                      <p className="text-sm text-slate-500">Randevu bulunmuyor</p>
                      <p className="text-xs text-slate-400 mt-0.5">Takvimden yeni randevu ekleyebilirsiniz</p>
                    </div>
                  )}
                  {!loading && appointments.map((appt) => {
                    const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
                    const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
                    return (
                      <div key={appt.id} className="grid grid-cols-[1fr_1.2fr_1fr_1.5fr] gap-3 items-center px-5 py-3 transition-all hover:bg-slate-50/80 group text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{timeRange}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{treatmentLabel}</div>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white shadow-sm shrink-0">{appt.patientName[0]?.toUpperCase()}</div>
                          <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{appt.patientName}</span>
                        </div>
                        <div>
                          {appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                            <span className="text-sm text-slate-700">{appt.doctorName}</span>
                          ) : doctors.length > 0 ? (
                            <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] w-full" defaultValue="" onChange={(e) => handleAssignDoctor(appt.id, e.target.value)}>
                              <option value="">Doktor atanmadı</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                            </select>
                          ) : <span className="text-[11px] text-slate-400">Doktor atanmadı</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button type="button" onClick={() => handleReminderClick(appt.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                            <WhatsAppIcon /><span>Hatırlat</span>
                          </button>
                          {appt.status === "pending" ? (
                            <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]" value={appt.status} onChange={(e) => handleStatusChange(appt.id, e.target.value as DashboardAppointment["status"])}>
                              <option value="pending">Onay bekliyor</option><option value="confirmed">Onaylandı</option><option value="cancelled">İptal</option>
                            </select>
                          ) : (
                            <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border", statusBadgeClass[appt.status] ?? "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>{statusLabelMap[appt.status]}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kontrol Listesi */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Kontrol Listesi</h2>
                <p className="text-[11px] text-slate-400">
                  {isTodayControlsView ? "Bugün için aksiyon bekleyen kayıtlar" : "Yarın için aksiyon planı"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewOffsetControls((prev) => (prev === 0 ? 1 : 0))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              {isTodayControlsView ? "Yarın →" : "← Bugün"}
            </button>
          </div>
          <div className="px-5 pb-5 space-y-2 text-xs max-h-[400px] overflow-y-auto">
            {controlItems.length === 0 && (
              <div className="py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-2">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </div>
                <p className="text-sm text-slate-500">Her şey kontrol altında</p>
                <p className="text-xs text-slate-400 mt-0.5">Aksiyon bekleyen öğe bulunmuyor</p>
              </div>
            )}
            {controlItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleControlItemClick(item)}
                className={[
                  "w-full text-left rounded-xl border border-slate-200 px-4 py-3 transition-all hover:shadow-sm border-l-4",
                  controlToneStyles[item.tone]?.container ?? "bg-slate-50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={["inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold", controlToneStyles[item.tone]?.badge ?? "bg-slate-500 text-white"].join(" ")}>
                        {item.toneLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">{item.patientName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{item.timeLabel} · {item.treatmentLabel}</div>
                    <div className="mt-1.5 text-[11px] text-slate-700 font-medium">{item.actionLabel}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">
                    <span>{item.type === "payment" ? "Ödeme" : "Takvim"}</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Kanal Dağılımı */}
      <section className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
            <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Kanal Dağılımı</h2>
            <p className="text-[11px] text-slate-400">Randevuların kaynak kanallarına göre dağılımı</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {["whatsapp", "web", "phone", "walk_in"].map((ch) => {
            const percent = channelPercent(ch);
            const count = channelCounts[ch] ?? 0;
            return (
              <div key={ch} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                      {channelIconMap[ch]}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{channelLabelMap[ch]}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900">{count}</span>
                    <span className="text-xs text-slate-400 ml-1">({percent}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${channelColorMap[ch] ?? "from-slate-400 to-slate-500"} transition-all duration-500`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {!channelTotal && (
          <div className="mt-4 text-center py-4">
            <p className="text-xs text-slate-400">Kayıtlı randevu olmadığı için kanal dağılımı gösterilemiyor.</p>
          </div>
        )}
      </section>
    </div>
  );
}
