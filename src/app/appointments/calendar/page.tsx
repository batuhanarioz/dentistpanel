"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { localDateStr } from "../../lib/dateUtils";

type CalendarAppointment = {
  id: string;
  date: string; // YYYY-MM-DD
  startHour: number; // 9-18
  startMinute: number; // 0-55 (5dk aralık)
  durationMinutes: number;
  patientName: string;
  phone: string;
  email: string;
  birthDate?: string;
  doctor: string;
  channel: string;
  treatmentType: string;
  status: "ONAYLI" | "ONAY_BEKLIYOR";
  dbStatus: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  patientNote?: string;
  internalNote?: string;
  contactPreference: "WhatsApp" | "SMS" | "Arama";
  reminderMinutesBefore?: number;
  tags?: string[];
  sourceConversationId?: string;
  sourceMessageId?: string;
};

const WORKING_HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00 - 18:00 (mesai 19:00'da biter)

const TREATMENTS: { label: string; value: string; duration: number }[] = [
  { label: "Muayene", value: "MUAYENE", duration: 30 },
  { label: "Kontrol", value: "KONTROL", duration: 20 },
  { label: "Dolgu", value: "DOLGU", duration: 45 },
  { label: "Kanal Tedavisi", value: "KANAL", duration: 60 },
  { label: "İmplant", value: "IMPLANT", duration: 90 },
  { label: "Diş Taşı Temizliği", value: "TEMIZLIK", duration: 40 },
];

// Şimdilik sadece UI davranışı için örnek hasta listesi
const MOCK_PATIENTS = [
  {
    id: "p1",
    phone: "05550000000",
    name: "Örnek Hasta",
    email: "hasta@example.com",
    birthDate: "1990-01-01",
  },
];

export default function AppointmentCalendarPage() {
  const today = useMemo(() => localDateStr(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarAppointment | null>(null);
  const [formTime, setFormTime] = useState<string>(""); // "HH:MM"
  const [formDate, setFormDate] = useState<string>(today);
  const [doctors, setDoctors] = useState<string[]>([]);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+90");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [form, setForm] = useState({
    patientName: "",
    phone: "",
    email: "",
    birthDate: "",
    tcIdentityNo: "",
    doctor: "",
    channel: "Web",
    durationMinutes: 30,
    treatmentType: "",
    status: "ONAY_BEKLIYOR" as "ONAYLI" | "ONAY_BEKLIYOR",
    patientNote: "",
    internalNote: "",
    contactPreference: "WhatsApp" as "WhatsApp" | "SMS" | "Arama",
    reminderMinutesBefore: 1440,
    tags: "",
    conversationId: "",
    messageId: "",
    estimatedAmount: "",
    result: "" as "" | "GERCEKLESTI" | "IPTAL",
  });

  const [patientMatchInfo, setPatientMatchInfo] = useState<string | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(true);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const dayAppointments = appointments.filter(
    (a) => a.date === selectedDate
  );

  const loadAppointmentsForDate = async (date: string) => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note, internal_note, contact_preference, reminder_minutes_before, tags, source_conversation_id, source_message_id, estimated_amount"
      )
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at", { ascending: true });

    if (error || !data) {
      setAppointments([]);
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
            .select("id, full_name, phone, email, birth_date")
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

    const channelMap: Record<string, string> = {
      web: "Web",
      whatsapp: "WhatsApp",
      phone: "Telefon",
      walk_in: "Yüz yüze",
    };

    const mapped: CalendarAppointment[] = data.map((row: any) => {
      const startDate = new Date(row.starts_at);
      const endDate = new Date(row.ends_at);
      const durationMinutes = Math.max(
        10,
        Math.round((endDate.getTime() - startDate.getTime()) / 60000) || 30
      );
      const patient = patientsMap[row.patient_id];
      const doctorName = row.doctor_id ? doctorsMap[row.doctor_id] : "";

      const uiStatus: "ONAYLI" | "ONAY_BEKLIYOR" =
        row.status === "confirmed" || row.status === "completed"
          ? "ONAYLI"
          : "ONAY_BEKLIYOR";

      return {
        id: row.id,
        date,
        startHour: startDate.getHours(),
        startMinute: startDate.getMinutes(),
        durationMinutes,
        patientName: patient?.full_name ?? "Hasta",
        phone: patient?.phone ?? "",
        email: patient?.email ?? "",
        birthDate: patient?.birth_date ?? undefined,
        doctor: doctorName,
        channel: channelMap[row.channel] ?? "Web",
        treatmentType: row.treatment_type ?? "",
        status: uiStatus,
        dbStatus: row.status,
        patientNote: row.patient_note ?? undefined,
        internalNote: row.internal_note ?? undefined,
        contactPreference: row.contact_preference ?? "WhatsApp",
        reminderMinutesBefore: row.reminder_minutes_before ?? undefined,
        tags: row.tags ?? undefined,
        sourceConversationId: row.source_conversation_id ?? undefined,
        sourceMessageId: row.source_message_id ?? undefined,
      };
    });

    setAppointments(mapped);
  };

  useEffect(() => {
    loadAppointmentsForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Kayıtlı doktorları Supabase'den çek (role = DOCTOR)
  useEffect(() => {
    const loadDoctors = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, role")
        .eq("role", "DOCTOR")
        .order("full_name", { ascending: true });

      if (error || !data) {
        setDoctors([]);
        return;
      }

      const names = data
        .map((u) => u.full_name)
        .filter((n): n is string => !!n);
      setDoctors(names);
    };

    loadDoctors();
  }, []);

  const openNewForHour = (hour: number) => {
    setEditing(null);
    setFormTime(`${hour.toString().padStart(2, "0")}:00`);
    setFormDate(selectedDate);
    setPatientMatchInfo(null);
    setIsNewPatient(true);
    setConflictWarning(null);
    setPhoneCountryCode("+90");
    setPhoneNumber("");
    setForm({
      patientName: "",
      phone: "",
      email: "",
      birthDate: "",
      tcIdentityNo: "",
      doctor: "",
      channel: "Web",
      durationMinutes: 30,
      treatmentType: "",
      status: "ONAY_BEKLIYOR",
      patientNote: "",
      internalNote: "",
      contactPreference: "WhatsApp",
      reminderMinutesBefore: 1440,
      tags: "",
      conversationId: "",
      messageId: "",
      estimatedAmount: "",
      result: "",
    });
    setModalOpen(true);
  };

  const openEdit = (appt: CalendarAppointment) => {
    setEditing(appt);
    setFormTime(`${appt.startHour.toString().padStart(2, "0")}:${(appt.startMinute ?? 0).toString().padStart(2, "0")}`);
    setFormDate(appt.date);
    setPatientMatchInfo(null);
    setIsNewPatient(false);
    setConflictWarning(null);
    // Telefonu alan kodu + numara olarak parçala
    const rawPhone = appt.phone || "";
    if (rawPhone.startsWith("+")) {
      // +90 5xx... veya +1 xxx... gibi
      const match = rawPhone.match(/^(\+\d{1,4})(.*)$/);
      setPhoneCountryCode(match?.[1] ?? "+90");
      setPhoneNumber(match?.[2]?.replace(/\D/g, "") ?? "");
    } else {
      setPhoneCountryCode("+90");
      setPhoneNumber(rawPhone.replace(/\D/g, ""));
    }
    setForm({
      patientName: appt.patientName,
      phone: appt.phone,
      email: appt.email,
      birthDate: appt.birthDate ?? "",
      tcIdentityNo: "",
      doctor: appt.doctor,
      channel: appt.channel,
      durationMinutes: appt.durationMinutes,
      treatmentType: appt.treatmentType,
      status: appt.status,
      patientNote: appt.patientNote ?? "",
      internalNote: appt.internalNote ?? "",
      contactPreference: appt.contactPreference,
      reminderMinutesBefore: appt.reminderMinutesBefore ?? 1440,
      tags: appt.tags?.join(", ") ?? "",
      conversationId: appt.sourceConversationId ?? "",
      messageId: appt.sourceMessageId ?? "",
      estimatedAmount: "",
      result:
        appt.dbStatus === "completed"
          ? "GERCEKLESTI"
          : appt.dbStatus === "cancelled" || appt.dbStatus === "no_show"
          ? "IPTAL"
          : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTime || !formDate) return;

    const tagsArray =
      form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    const base = {
      id: editing?.id ?? crypto.randomUUID(),
      date: formDate,
      startHour: parseInt(formTime.split(":")[0], 10),
      startMinute: parseInt(formTime.split(":")[1] || "0", 10),
      durationMinutes: Number(form.durationMinutes) || 30,
      patientName: form.patientName,
      phone: form.phone,
      email: form.email,
      birthDate: form.birthDate || undefined,
      doctor: form.doctor,
      channel: form.channel,
      treatmentType: form.treatmentType || "MUAYENE",
      status: form.status,
      patientNote: form.patientNote || undefined,
      internalNote: form.internalNote || undefined,
      contactPreference: form.contactPreference,
      reminderMinutesBefore: form.reminderMinutesBefore || undefined,
      tags: tagsArray.length ? tagsArray : undefined,
      sourceConversationId: form.conversationId || undefined,
      sourceMessageId: form.messageId || undefined,
    };

    // Çakışma kontrolü (aynı doktor, aynı tarih, zaman aralığı çakışması)
    if (base.doctor) {
      const newStart = base.startHour * 60 + base.startMinute;
      const newEnd = newStart + base.durationMinutes;
      const hasConflict = appointments.some((a) => {
        if (a.id === base.id || a.date !== base.date || a.doctor !== base.doctor) return false;
        const aStart = a.startHour * 60 + (a.startMinute ?? 0);
        const aEnd = aStart + a.durationMinutes;
        return newStart < aEnd && newEnd > aStart;
      });
      setConflictWarning(
        hasConflict
          ? "Bu zaman aralığında seçilen doktor için başka bir randevu bulunuyor."
          : null
      );
    } else {
      setConflictWarning(null);
    }

    // Hasta kaydı
    const phoneTrimmed = form.phone.replace(/\s+/g, "");
    let patientId: string | null = null;

    if (phoneTrimmed) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", phoneTrimmed)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        // Mevcut hastanın bilgilerini güncelle
        const updates: Record<string, any> = {};
        if (form.patientName) updates.full_name = form.patientName;
        if (form.email) updates.email = form.email;
        if (form.birthDate) updates.birth_date = form.birthDate;
        if (form.tcIdentityNo) updates.tc_identity_no = form.tcIdentityNo;
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("patients")
            .update(updates)
            .eq("id", existingPatient.id);
        }
      } else {
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            full_name: form.patientName,
            phone: phoneTrimmed,
            email: form.email || null,
            birth_date: form.birthDate || null,
            tc_identity_no: form.tcIdentityNo || null,
          })
          .select("id")
          .single();

        if (patientError || !newPatient) {
          return;
        }
        patientId = newPatient.id;
      }
    }

    // Doktor id'si
    let doctorId: string | null = null;
    if (form.doctor) {
      const { data: doctorRow } = await supabase
        .from("users")
        .select("id")
        .eq("full_name", form.doctor)
        .eq("role", "DOCTOR")
        .maybeSingle();
      doctorId = doctorRow?.id ?? null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [startH, startM] = formTime.split(":").map(Number);
    const startDate = new Date(
      `${formDate}T${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}:00`
    );
    const duration = Number(form.durationMinutes) || 30;
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const now = new Date();
    const isPast = endDate < now;

    const channelToDb: Record<string, string> = {
      Web: "web",
      WhatsApp: "whatsapp",
      Telefon: "phone",
      "Yüz yüze": "walk_in",
    };

    const statusToDb: Record<"ONAYLI" | "ONAY_BEKLIYOR", string> = {
      ONAYLI: "confirmed",
      ONAY_BEKLIYOR: "pending",
    };

    let dbStatus: "pending" | "confirmed" | "cancelled" | "no_show" | "completed" =
      statusToDb[form.status] as
        | "pending"
        | "confirmed"
        | "cancelled"
        | "no_show"
        | "completed";

    if (isPast) {
      if (form.result === "IPTAL") {
        dbStatus = "cancelled";
      } else {
        dbStatus = "completed";
      }
    }

    const payload: any = {
      patient_id: patientId,
      doctor_id: doctorId,
      channel: channelToDb[form.channel] ?? "web",
      status: dbStatus,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      treatment_type: form.treatmentType || null,
      patient_note: form.patientNote || null,
      internal_note: form.internalNote || null,
      contact_preference: form.contactPreference,
      reminder_minutes_before:
        form.reminderMinutesBefore && form.reminderMinutesBefore > 0
          ? form.reminderMinutesBefore
          : null,
      tags: tagsArray.length ? tagsArray : null,
      source_conversation_id: form.conversationId || null,
      source_message_id: form.messageId || null,
      estimated_amount: form.estimatedAmount
        ? Number(form.estimatedAmount)
        : null,
      created_by: user?.id ?? null,
    };

    if (editing) {
      await supabase
        .from("appointments")
        .update(payload)
        .eq("id", editing.id);
    } else {
      await supabase.from("appointments").insert(payload);
    }

    await loadAppointmentsForDate(formDate);

    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    const run = async () => {
      if (!editing) return;
      await supabase.from("appointments").delete().eq("id", editing.id);
      await loadAppointmentsForDate(selectedDate);
      setModalOpen(false);
      setEditing(null);
    };
    run();
  };

  const displayDate = new Date(selectedDate);

  const handleFindPatient = () => {
    const run = async () => {
      const phoneTrimmed = form.phone.replace(/\s+/g, "");
      if (!phoneTrimmed) return;

      // Önce Supabase hastalarından ara
      const { data, error } = await supabase
        .from("patients")
        .select("full_name, phone, email, birth_date, tc_identity_no")
        .eq("phone", phoneTrimmed)
        .maybeSingle();

      if (!error && data) {
        setForm((f) => ({
          ...f,
          patientName: data.full_name,
          email: data.email ?? "",
          birthDate: data.birth_date ?? "",
          tcIdentityNo: data.tc_identity_no ?? "",
        }));
        setIsNewPatient(false);
        setPatientMatchInfo("Mevcut hasta eşleştirildi.");
        return;
      }

      // Supabase'de yoksa mock listeyi dene
      const match = MOCK_PATIENTS.find((p) => p.phone === phoneTrimmed);
      if (match) {
        setForm((f) => ({
          ...f,
          patientName: match.name,
          email: match.email,
          birthDate: match.birthDate,
        }));
        setIsNewPatient(false);
        setPatientMatchInfo("Mevcut hasta eşleştirildi.");
      } else {
        setIsNewPatient(true);
        setPatientMatchInfo(
          "Bu numara ile kayıtlı hasta bulunamadı. Yeni hasta olarak kaydedilecek."
        );
      }
    };

    run();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-xs"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="rounded-md border px-2 py-1"
            onClick={() => setSelectedDate(today)}
          >
            Bugün
          </button>
          <button
            className="rounded-md border px-3 py-1.5 text-[11px] bg-teal-600 text-white"
            onClick={() => openNewForHour(9)}
          >
            Randevu ekle
          </button>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-3 md:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3 text-xs text-slate-800">
          <div className="flex flex-col">
            <span className="font-semibold">
              {displayDate.toLocaleDateString("tr-TR", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
            <span>09:00 - 19:00 çalışma saatleri</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Onaylı
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              Onay bekliyor
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              İptal / No‑show
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[80px_minmax(0,1fr)] text-[11px] border-t">
          {WORKING_HOURS.map((hour) => {
            const hourAppointments = dayAppointments.filter(
              (a) => a.startHour === hour
            );
            const now = new Date();
            return (
              <div
                key={hour}
                className="contents border-t last:border-b text-[11px]"
              >
                <div className="border-r bg-slate-50 px-2 py-4 text-[11px] text-slate-800">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div
                  className="relative px-2 py-2 cursor-pointer hover:bg-slate-50"
                  onClick={() => openNewForHour(hour)}
                >
                  {hourAppointments.length === 0 && (
                    <span className="text-[10px] text-slate-500">
                      Boş slot · tıklayarak randevu ekleyin
                    </span>
                  )}
                  <div className="space-y-1">
                    {hourAppointments.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a);
                        }}
                        className={`rounded-md border px-2 py-1 text-[10px] ${
                          (() => {
                            const start = new Date(
                              `${a.date}T${a.startHour
                                .toString()
                                .padStart(2, "0")}:${(a.startMinute ?? 0).toString().padStart(2, "0")}:00`
                            );
                            const end = new Date(
                              start.getTime() + a.durationMinutes * 60000
                            );
                            const isPast = end < now;

                            if (
                              a.dbStatus === "cancelled" ||
                              a.dbStatus === "no_show"
                            ) {
                              return "border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200";
                            }
                            if (isPast) {
                              return "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800";
                            }
                            if (a.dbStatus === "confirmed") {
                              return "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200";
                            }
                            return "border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200";
                          })()
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-semibold">
                            <span className="text-[9px] font-normal opacity-80">
                              {a.startHour.toString().padStart(2, "0")}:{(a.startMinute ?? 0).toString().padStart(2, "0")}
                            </span>{" "}
                            {a.patientName}
                          </span>
                          <span>{a.doctor || "Doktor atanmadı"}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-700">
                          <span>{a.channel}</span>
                          <span>{a.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-6 text-xs shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-slate-900">
                  {editing ? "Randevuyu düzenle" : "Yeni randevu oluştur"}
                </h2>
                <span className="text-[11px] text-slate-700">
                  Tarih: {formDate} · Saat:{" "}
                  {formTime || "-"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Tarih
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Başlangıç saati
                </label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  min="09:00"
                  max="18:30"
                  step="300"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  required
                />
                <p className="text-[9px] text-slate-500">09:00 – 18:30 arası</p>
              </div>
              {editing && (() => {
                const start = new Date(
                  `${editing.date}T${editing.startHour
                    .toString()
                    .padStart(2, "0")}:${(editing.startMinute ?? 0).toString().padStart(2, "0")}:00`
                );
                const end = new Date(
                  start.getTime() + editing.durationMinutes * 60000
                );
                const isPast = end < new Date();
                if (!isPast) return null;
                return (
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-800">
                      Randevu sonucu
                    </label>
                    <select
                      value={form.result}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          result: e.target.value as
                            | ""
                            | "GERCEKLESTI"
                            | "IPTAL",
                        }))
                      }
                      className="w-full rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">
                        Otomatik (varsayılan: Randevu gerçekleştirildi)
                      </option>
                      <option value="GERCEKLESTI">Randevu gerçekleştirildi</option>
                      <option value="IPTAL">Randevu iptal edildi</option>
                    </select>
                  </div>
                );
              })()}
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Randevu tipi / işlem
                </label>
                <select
                  value={form.treatmentType}
                  onChange={(e) => {
                    const value = e.target.value;
                    const treatment = TREATMENTS.find(
                      (t) => t.value === value
                    );
                    setForm((f) => ({
                      ...f,
                      treatmentType: value,
                      durationMinutes:
                        treatment?.duration ?? f.durationMinutes,
                    }));
                  }}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value="">Seçin</option>
                  {TREATMENTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Süre (dakika)
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
                {formTime && (
                  <p className="text-[10px] text-slate-700">
                    Bitiş saati yaklaşık{" "}
                    {(() => {
                      const [h, m] = formTime.split(":").map(Number);
                      const totalMin = h * 60 + m + form.durationMinutes;
                      return `${Math.floor(totalMin / 60)
                        .toString()
                        .padStart(2, "0")}:${(totalMin % 60)
                        .toString()
                        .padStart(2, "0")}`;
                    })()}
                  </p>
                )}
              </div>

              <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Hasta bul / eşleştir
                </label>
                <div className="grid gap-2 md:grid-cols-[2fr,2fr,auto]">
                  <div className="flex gap-1">
                    <input
                      value={phoneCountryCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setPhoneCountryCode(code);
                        setForm((f) => ({ ...f, phone: code + phoneNumber }));
                      }}
                      className="w-[52px] shrink-0 rounded-md border px-1.5 py-1 text-xs text-center"
                      placeholder="+90"
                    />
                    <input
                      required
                      value={phoneNumber}
                      onChange={(e) => {
                        const num = e.target.value.replace(/[^\d]/g, "");
                        setPhoneNumber(num);
                        setForm((f) => ({ ...f, phone: phoneCountryCode + num }));
                        setPatientMatchInfo(null);
                      }}
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      placeholder="5XX XXX XX XX"
                    />
                  </div>
                  <input
                    value={form.patientName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, patientName: e.target.value }))
                    }
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    placeholder="Hasta adı soyadı"
                  />
                  <button
                    type="button"
                    onClick={handleFindPatient}
                    className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Hasta bul
                  </button>
                </div>
                {patientMatchInfo && (
                  <p className="mt-1 text-[10px] text-slate-700">
                    {patientMatchInfo}{" "}
                    <span className="font-semibold">
                      ({isNewPatient ? "Yeni hasta" : "Mevcut hasta"})
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  E-posta
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="ornek@hasta.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Doğum tarihi
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, birthDate: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  TC Kimlik No <span className="text-slate-400 font-normal">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={form.tcIdentityNo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setForm((f) => ({ ...f, tcIdentityNo: val }));
                  }}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Opsiyonel"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Doktor
                </label>
                <select
                  value={form.doctor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, doctor: value }));
                  }}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  {doctors.map((d) => (
                    <option key={d} value={d}>
                      {d || "Doktor atanmadı"}
                    </option>
                  ))}
                </select>
                {conflictWarning && (
                  <p className="mt-1 text-[10px] text-rose-700">
                    {conflictWarning}
                  </p>
                )}
              </div>
    
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Kanal
                </label>
                <select
                  value={form.channel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, channel: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option>Web</option>
                  <option>WhatsApp</option>
                  <option>Telefon</option>
                  <option>Yüz yüze</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Durum
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as
                        | "ONAYLI"
                        | "ONAY_BEKLIYOR",
                    }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value="ONAYLI">Onaylandı</option>
                  <option value="ONAY_BEKLIYOR">Onay bekliyor</option>
                </select>
              </div>
              <div className="space">
                <label className="block text-[11px] font-medium text-slate-800">
                  Tahmini ücret
                </label>
                <input
                  value={form.estimatedAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimatedAmount: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Muayene sonrası netleşir"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  İletişim tercihi
                </label>
                <select
                  value={form.contactPreference}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contactPreference: e.target.value as
                        | "WhatsApp"
                        | "SMS"
                        | "Arama",
                    }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Arama">Arama</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Hatırlatma
                </label>
                <select
                  value={form.reminderMinutesBefore}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reminderMinutesBefore: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value={0}>Hatırlatma yok</option>
                  <option value={1440}>1 gün önce</option>
                  <option value={240}>4 saat önce</option>
                  <option value={60}>1 saat önce</option>
                  <option value={30}>30 dakika önce</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Etiketler
                </label>
                <input
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Yeni hasta, Acil, VIP..."
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Şikayet / talep (hasta metni)
                </label>
                <textarea
                  value={form.patientNote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, patientNote: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  rows={2}
                  placeholder="Hastanın ifade ettiği şikayet veya talep..."
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Doktor Tedavi Notu
                </label>
                <textarea
                  value={form.internalNote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, internalNote: e.target.value }))
                  }
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  rows={2}
                  placeholder="Tedavi hakkında doktor notu yazın..."
                />
              </div>
              {form.channel === "WhatsApp" && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-800">
                      Kaynak conversation_id
                    </label>
                    <input
                      value={form.conversationId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          conversationId: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      placeholder="Opsiyonel"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-800">
                      Kaynak message_id
                    </label>
                    <input
                      value={form.messageId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          messageId: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      placeholder="Opsiyonel"
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2 mt-3 flex justify-between gap-2">
                {editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50"
                  >
                    Randevuyu sil
                  </button>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setEditing(null);
                    }}
                    className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white"
                  >
                    {editing ? "Kaydet" : "Oluştur"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

