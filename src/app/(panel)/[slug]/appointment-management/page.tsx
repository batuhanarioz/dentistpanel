"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { localDateStr } from "@/app/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import type { DayOfWeek } from "@/app/types/database";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

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
    treatmentNote?: string;
    patientAllergies?: string | null;
    patientMedicalAlerts?: string | null;
    contactPreference: "WhatsApp" | "SMS" | "Arama";
    reminderMinutesBefore?: number;
    tags?: string[];
    sourceConversationId?: string;
    sourceMessageId?: string;
};

// Tarihten gün adını hesapla (JS: 0=Pazar, 1=Pazartesi, ...)
const JS_DAY_TO_KEY: DayOfWeek[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

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
    const clinic = useClinic();
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

    // Patient search states
    const [patients, setPatients] = useState<Array<{ id: string; full_name: string; phone: string | null; email: string | null; birth_date: string | null }>>([]);
    const [patientSearch, setPatientSearch] = useState("");
    const [patientSearchResults, setPatientSearchResults] = useState<typeof patients>([]);
    const [patientSearchLoading, setPatientSearchLoading] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [duplicatePatient, setDuplicatePatient] = useState<{ id: string; full_name: string; phone: string | null } | null>(null);

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
        treatmentNote: "",
        allergies: "",
        medicalAlerts: "",
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
    const [matchedPatientAllergies, setMatchedPatientAllergies] = useState<string | null>(null);
    const [matchedPatientMedicalAlerts, setMatchedPatientMedicalAlerts] = useState<string | null>(null);

    const dayAppointments = appointments.filter(
        (a) => a.date === selectedDate
    );

    // Seçili güne göre çalışma saatlerini hesapla
    const selectedDayOfWeek = useMemo(() => {
        const d = new Date(selectedDate + "T12:00:00");
        return JS_DAY_TO_KEY[d.getDay()];
    }, [selectedDate]);

    const todaySchedule = clinic.workingHours[selectedDayOfWeek];
    const isDayOff = !todaySchedule?.enabled;

    const workingHourSlots = useMemo(() => {
        if (!todaySchedule?.enabled) return [];
        const openHour = parseInt(todaySchedule.open.split(":")[0], 10);
        const closeHour = parseInt(todaySchedule.close.split(":")[0], 10);
        // Son saat slotu kapanış saatinden bir önceki saat (kapanışta randevu başlamaz)
        return Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);
    }, [todaySchedule]);

    const workingHoursLabel = todaySchedule?.enabled
        ? `${todaySchedule.open} - ${todaySchedule.close} çalışma saatleri`
        : "Bu gün klinik kapalı";

    const loadAppointmentsForDate = async (date: string) => {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59`);

        const { data, error } = await supabase
            .from("appointments")
            .select(
                "id, patient_id, doctor_id, channel, status, starts_at, ends_at, treatment_type, patient_note, internal_note, treatment_note, contact_preference, reminder_minutes_before, tags, source_conversation_id, source_message_id, estimated_amount"
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
                    .select("id, full_name, phone, email, birth_date, allergies, medical_alerts")
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
                treatmentNote: row.treatment_note ?? row.internal_note ?? undefined,
                patientAllergies: patient?.allergies ?? undefined,
                patientMedicalAlerts: patient?.medical_alerts ?? undefined,
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

    useEffect(() => {
        const loadPatients = async () => {
            const { data, error } = await supabase
                .from("patients")
                .select("id, full_name, phone, email, birth_date")
                .order("full_name", { ascending: true });

            if (!error && data) {
                setPatients(data);
            }
        };

        loadPatients();
    }, []);

    useEffect(() => {
        const searchPatients = () => {
            const term = patientSearch.trim().toLowerCase();
            if (!modalOpen || !term) {
                setPatientSearchResults([]);
                return;
            }

            setPatientSearchLoading(true);

            const matchingPatients = patients.filter((p) => {
                const name = p.full_name?.toLowerCase() ?? "";
                const phone = p.phone?.replace(/\s+/g, "") ?? "";
                const normalizedTerm = term.replace(/\s+/g, "");
                return (
                    name.includes(term) ||
                    phone.includes(normalizedTerm) ||
                    phone.includes(term)
                );
            });

            setPatientSearchResults(matchingPatients.slice(0, 30));
            setPatientSearchLoading(false);
        };

        searchPatients();
    }, [patientSearch, modalOpen, patients]);

    // Check for duplicate patient by phone number in manual entry
    useEffect(() => {
        const checkDuplicate = async () => {
            let cleanPhone = phoneNumber.replace(/\D/g, "");

            // Normalize: remove leading 0 if 11 digits
            if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
                cleanPhone = cleanPhone.substring(1);
            }

            if (cleanPhone.length === 10 && !selectedPatientId) {
                // Search for patient with this phone (checking both exact and normalized)
                const match = patients.find(p => {
                    const dbPhone = p.phone?.replace(/\D/g, "") || "";
                    // Check if DB phone ends with the typed number (to handle +90 prefix)
                    return dbPhone.endsWith(cleanPhone);
                });

                if (match) {
                    setDuplicatePatient(match);
                } else {
                    setDuplicatePatient(null);
                }
            } else {
                setDuplicatePatient(null);
            }
        };

        checkDuplicate();
    }, [phoneNumber, phoneCountryCode, selectedPatientId, patients]);

    const handleUseDuplicate = () => {
        if (!duplicatePatient) return;

        const patient = duplicatePatient;
        setSelectedPatientId(patient.id);
        const match = patients.find(p => p.id === patient.id);

        setForm((f) => ({
            ...f,
            patientName: patient.full_name,
            phone: patient.phone || "",
            email: (match as any)?.email || "",
            birthDate: (match as any)?.birth_date || "",
        }));

        const rawPhone = patient.phone || "";
        if (rawPhone.startsWith("+90")) {
            setPhoneCountryCode("+90");
            setPhoneNumber(rawPhone.substring(3).replace(/\D/g, ""));
        } else if (rawPhone.startsWith("+")) {
            const matchCode = rawPhone.match(/^(\+\d{1,2})(.*)$/); // Try 2 digits for other countries
            setPhoneCountryCode(matchCode?.[1] ?? "+90");
            setPhoneNumber(matchCode?.[2]?.replace(/\D/g, "") ?? "");
        } else {
            setPhoneCountryCode("+90");
            setPhoneNumber(rawPhone.replace(/\D/g, ""));
        }

        setIsNewPatient(false);
        setDuplicatePatient(null);
        setPatientMatchInfo("Mevcut hasta seçildi.");
    };

    // Kayıtlı doktorları Supabase'den çek (role = DOCTOR)
    useEffect(() => {
        const loadDoctors = async () => {
            const { data, error } = await supabase
                .from("users")
                .select("full_name, role")
                .in("role", ["DOCTOR"])

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
        setMatchedPatientAllergies(null);
        setMatchedPatientMedicalAlerts(null);
        setIsNewPatient(true);
        setConflictWarning(null);
        setPhoneCountryCode("+90");
        setPhoneNumber("");
        // Reset patient search states
        setPatientSearch("");
        setPatientSearchResults([]);
        setSelectedPatientId("");
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
            treatmentNote: "",
            allergies: "",
            medicalAlerts: "",
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
        setPatientMatchInfo("Mevcut randevu düzenleniyor.");
        setMatchedPatientAllergies(appt.patientAllergies ?? null);
        setMatchedPatientMedicalAlerts(appt.patientMedicalAlerts ?? null);
        setIsNewPatient(false);
        setConflictWarning(null);
        // Reset patient search states
        setPatientSearch("");
        setPatientSearchResults([]);
        setSelectedPatientId("");
        const rawPhone = appt.phone || "";
        if (rawPhone.startsWith("+90")) {
            setPhoneCountryCode("+90");
            setPhoneNumber(rawPhone.substring(3).replace(/\D/g, ""));
        } else if (rawPhone.startsWith("+")) {
            const matchCode = rawPhone.match(/^(\+\d{1,2})(.*)$/); // Try 2 digits for other countries
            setPhoneCountryCode(matchCode?.[1] ?? "+90");
            setPhoneNumber(matchCode?.[2]?.replace(/\D/g, "") ?? "");
        } else {
            setPhoneCountryCode("+90");
            setPhoneNumber(rawPhone.replace(/\D/g, ""));
        }
        setForm({
            patientName: appt.patientName,
            phone: appt.phone,
            email: appt.email ?? "",
            birthDate: appt.birthDate ?? "",
            tcIdentityNo: "",
            doctor: appt.doctor,
            channel: appt.channel,
            durationMinutes: appt.durationMinutes,
            treatmentType: appt.treatmentType,
            status: appt.status,
            patientNote: appt.patientNote ?? "",
            treatmentNote: appt.treatmentNote ?? "",
            allergies: "",
            medicalAlerts: "",
            contactPreference: appt.contactPreference ?? "WhatsApp",
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
            treatmentNote: form.treatmentNote || undefined,
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
                        allergies: form.allergies || null,
                        medical_alerts: form.medicalAlerts || null,
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
                .in("role", ["DOCTOR"])
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
            treatment_note: form.treatmentNote || null,
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
                .select("full_name, phone, email, birth_date, tc_identity_no, allergies, medical_alerts")
                .eq("phone", phoneTrimmed)
                .maybeSingle();

            if (!error && data) {
                setForm((f) => ({
                    ...f,
                    patientName: data.full_name,
                    email: data.email ?? "",
                    birthDate: data.birth_date ?? "",
                    tcIdentityNo: data.tc_identity_no ?? "",
                    allergies: data.allergies ?? "",
                    medicalAlerts: data.medical_alerts ?? "",
                }));
                setMatchedPatientAllergies(data.allergies ?? null);
                setMatchedPatientMedicalAlerts(data.medical_alerts ?? null);
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
                setMatchedPatientAllergies(null);
                setMatchedPatientMedicalAlerts(null);
                setIsNewPatient(false);
                setPatientMatchInfo("Mevcut hasta eşleştirildi.");
            } else {
                setIsNewPatient(true);
                setMatchedPatientAllergies(null);
                setMatchedPatientMedicalAlerts(null);
                setPatientMatchInfo(
                    "Bu numara ile kayıtlı hasta bulunamadı. Yeni hasta olarak kaydedilecek."
                );
            }
        };

        run();
    };

    return (
        <div className="space-y-6">
            {/* Üst Bilgi Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">
                                {displayDate.toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" })}
                            </p>
                            <p className="text-lg font-bold text-slate-900">{dayAppointments.length} <span className="text-sm font-normal text-slate-400">randevu</span></p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Çalışma Saatleri</p>
                            <p className="text-sm font-bold text-slate-900">{isDayOff ? "Kapalı" : `${todaySchedule?.open} - ${todaySchedule?.close}`}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm col-span-2 md:col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Boş Slot</p>
                            <p className="text-lg font-bold text-slate-900">{isDayOff ? 0 : Math.max(0, workingHourSlots.length - dayAppointments.length)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Araç Çubuğu */}
            {/* Araç Çubuğu */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Lejant - Mobilde altta (order-2), Desktopte solda (order-1) */}
                <div className="flex flex-wrap gap-2 order-2 md:order-1 justify-center md:justify-start">
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

                {/* Kontroller - Mobilde üstte (order-1), Desktopte sağda (order-2) */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center w-full md:w-auto order-1 md:order-2">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex-1 md:w-auto">
                            <PremiumDatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                today={today}
                            />
                        </div>
                        <button
                            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
                            onClick={() => setSelectedDate(today)}
                        >
                            Bugün
                        </button>
                    </div>
                    <button
                        className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-xs font-semibold text-white shadow-md hover:from-indigo-700 hover:to-violet-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                        onClick={() => openNewForHour(workingHourSlots[0] ?? 9)}
                        disabled={isDayOff}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Randevu Ekle
                    </button>
                </div>
            </div>

            {/* Takvim Grid */}
            <section className="rounded-2xl border bg-white shadow-sm overflow-hidden mt-2">
                {isDayOff && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </div>
                        <p className="text-lg font-semibold text-slate-700">Klinik Kapalı</p>
                        <p className="text-sm text-slate-400 mt-1">Bu gün için çalışma saati tanımlanmamış.</p>
                    </div>
                )}

                {!isDayOff && <div className="grid grid-cols-[80px_minmax(0,1fr)]">
                    {workingHourSlots.map((hour, idx) => {
                        const hourAppointments = dayAppointments.filter(
                            (a) => a.startHour === hour
                        );
                        const now = new Date();
                        const isFirst = idx === 0;
                        return (
                            <div
                                key={hour}
                                className="contents"
                            >
                                <div className={["border-r bg-gradient-to-b from-slate-50 to-white px-4 py-5 text-xs font-semibold text-slate-500 text-right", isFirst ? "border-t" : "border-t"].join(" ")}>
                                    {hour.toString().padStart(2, "0")}:00
                                </div>
                                <div
                                    className={["relative px-4 py-4 cursor-pointer hover:bg-indigo-50/30 transition-colors min-h-[72px]", isFirst ? "border-t" : "border-t border-slate-100"].join(" ")}
                                    onClick={() => openNewForHour(hour)}
                                >
                                    {hourAppointments.length === 0 && (
                                        <span className="text-xs text-slate-400 italic flex items-center gap-2">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            Randevu eklemek için tıklayın
                                        </span>
                                    )}
                                    <div className="space-y-2">
                                        {hourAppointments.map((a) => {
                                            const startTime = new Date(
                                                `${a.date}T${a.startHour.toString().padStart(2, "0")}:${(a.startMinute ?? 0).toString().padStart(2, "0")}:00`
                                            );
                                            const endTime = new Date(startTime.getTime() + a.durationMinutes * 60000);
                                            const isPast = endTime < now;

                                            let cardClass = "";
                                            let dotClass = "";
                                            if (a.dbStatus === "cancelled" || a.dbStatus === "no_show") {
                                                cardClass = "border-rose-200 bg-rose-50 hover:bg-rose-100";
                                                dotClass = "bg-rose-500";
                                            } else if (isPast) {
                                                cardClass = "border-blue-200 bg-blue-50 hover:bg-blue-100";
                                                dotClass = "bg-blue-500";
                                            } else if (a.dbStatus === "confirmed") {
                                                cardClass = "border-emerald-200 bg-emerald-50 hover:bg-emerald-100";
                                                dotClass = "bg-emerald-500";
                                            } else {
                                                cardClass = "border-amber-200 bg-amber-50 hover:bg-amber-100";
                                                dotClass = "bg-amber-500";
                                            }

                                            return (
                                                <div
                                                    key={a.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEdit(a);
                                                    }}
                                                    className={`rounded-xl border px-4 py-3 text-xs transition-all cursor-pointer shadow-sm ${cardClass}`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
                                                            <span className="font-semibold text-slate-900 truncate">
                                                                {a.patientName}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 shrink-0">
                                                                {a.startHour.toString().padStart(2, "0")}:{(a.startMinute ?? 0).toString().padStart(2, "0")} – {endTime.getHours().toString().padStart(2, "0")}:{endTime.getMinutes().toString().padStart(2, "0")}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-slate-600 font-medium truncate shrink-0 max-w-[140px]">
                                                            {a.doctor || "Doktor atanmadı"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                                                        <div className="flex items-center gap-2">
                                                            {a.treatmentType && (
                                                                <span className="inline-flex items-center rounded-lg bg-white/60 border px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                                    {TREATMENTS.find(t => t.value === a.treatmentType)?.label || a.treatmentType}
                                                                </span>
                                                            )}
                                                            <span>{a.channel}</span>
                                                        </div>
                                                        {a.phone && <span className="truncate max-w-[140px]">{a.phone}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>}
            </section>

            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => {
                        setModalOpen(false);
                        setEditing(null);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl border w-full max-w-lg mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-500 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-white/10 p-2">
                                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-white">
                                            {editing ? "Randevuyu Düzenle" : "Yeni Randevu"}
                                        </h2>
                                        <p className="text-xs text-white/70">
                                            {formDate} · {formTime || "Saat seçilmedi"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalOpen(false);
                                        setEditing(null);
                                    }}
                                    className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
                            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1 md:col-span-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Tarih
                                    </label>
                                    <PremiumDatePicker
                                        value={formDate}
                                        onChange={setFormDate}
                                        today={today}
                                        compact
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Başlangıç saati
                                    </label>
                                    <input
                                        type="time"
                                        value={formTime}
                                        onChange={(e) => setFormTime(e.target.value)}
                                        min={todaySchedule?.open || "09:00"}
                                        max={todaySchedule?.close || "19:00"}
                                        step="300"
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    <p className="text-[9px] text-slate-500">
                                        {todaySchedule?.open || "09:00"} – {todaySchedule?.close || "19:00"} arası
                                    </p>
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
                                            <label className="block text-xs font-medium text-slate-700">
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
                                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    {formTime && (
                                        <p className="text-[10px] text-slate-500">
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
                                    <label className="block text-xs font-medium text-slate-700">
                                        Hasta seç
                                    </label>
                                    {!selectedPatientId ? (
                                        <>
                                            <input
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="Ad soyad veya telefon ile ara..."
                                            />
                                            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                                                {patientSearchLoading && (
                                                    <div className="px-3 py-2 text-[11px] text-slate-600">
                                                        Hastalar yükleniyor...
                                                    </div>
                                                )}
                                                {!patientSearchLoading &&
                                                    patientSearch.trim() &&
                                                    patientSearchResults.length === 0 && (
                                                        <div className="px-3 py-2 text-[11px] text-slate-600">
                                                            Bu arama ile eşleşen hasta bulunamadı.
                                                        </div>
                                                    )}
                                                {!patientSearchLoading &&
                                                    patientSearchResults.map((patient) => {
                                                        return (
                                                            <div
                                                                key={patient.id}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSelectedPatientId(patient.id);
                                                                    setForm((f) => ({
                                                                        ...f,
                                                                        patientName: patient.full_name,
                                                                        phone: patient.phone || "",
                                                                        email: patient.email || "",
                                                                        birthDate: patient.birth_date || "",
                                                                    }));
                                                                    const rawPhone = patient.phone || "";
                                                                    if (rawPhone.startsWith("+")) {
                                                                        const match = rawPhone.match(/^(\+\d{1,4})(.*)$/);
                                                                        setPhoneCountryCode(match?.[1] ?? "+90");
                                                                        setPhoneNumber(match?.[2]?.replace(/\D/g, "") ?? "");
                                                                    } else {
                                                                        setPhoneCountryCode("+90");
                                                                        setPhoneNumber(rawPhone.replace(/\D/g, ""));
                                                                    }
                                                                    setIsNewPatient(false);
                                                                    setPatientMatchInfo("Mevcut hasta seçildi.");
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-[11px] flex flex-col gap-0.5 transition-colors cursor-pointer hover:bg-slate-50"
                                                            >
                                                                <span className="font-medium text-slate-900 pointer-events-none">
                                                                    {patient.full_name}{" "}
                                                                    {patient.phone ? `· ${patient.phone}` : ""}
                                                                </span>
                                                                {patient.email && (
                                                                    <span className="text-[10px] text-slate-600 pointer-events-none">
                                                                        {patient.email}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-500">
                                                Hastayı arayın ve listeden seçin. Bulamadıysanız aşağıdaki alanlara manuel girin.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            {(() => {
                                                const selectedPatient = patients.find(p => p.id === selectedPatientId);
                                                if (!selectedPatient) return null;
                                                return (
                                                    <div className="relative">
                                                        <div className="w-full rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2.5 text-sm">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-slate-900">
                                                                        {selectedPatient.full_name}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                                                        {selectedPatient.phone && `${selectedPatient.phone}`}
                                                                        {selectedPatient.email && ` · ${selectedPatient.email}`}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedPatientId("");
                                                                        setPatientSearch("");
                                                                        setPatientSearchResults([]);
                                                                        setForm((f) => ({
                                                                            ...f,
                                                                            patientName: "",
                                                                            phone: "",
                                                                            email: "",
                                                                            birthDate: "",
                                                                        }));
                                                                        setPhoneCountryCode("+90");
                                                                        setPhoneNumber("");
                                                                        setIsNewPatient(true);
                                                                        setPatientMatchInfo(null);
                                                                    }}
                                                                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 hover:bg-indigo-300 transition-colors"
                                                                    title="Seçimi temizle"
                                                                >
                                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <p className="mt-1 text-[10px] text-indigo-600">
                                                ✓ Hasta seçildi. Değiştirmek için X butonuna tıklayın.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Manuel hasta bilgileri - Yeni hasta veya düzenleme için */}
                                <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Hasta bilgileri {!selectedPatientId && "(Manuel giriş veya düzenleme)"}
                                    </label>

                                    {/* Duplicate Patient Warning Alert */}
                                    {duplicatePatient && (
                                        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex items-center gap-2 text-amber-800">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                                </svg>
                                                <span>
                                                    <span className="font-bold">Bu numara kayıtlı:</span> {duplicatePatient.full_name} ({duplicatePatient.phone})
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleUseDuplicate}
                                                className="shrink-0 rounded-md bg-amber-600 px-2 py-0.5 font-bold text-white hover:bg-amber-700 transition-colors"
                                            >
                                                Bu Hastayı Kullan
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid gap-2 md:grid-cols-2">
                                        <div className="flex gap-1">
                                            <input
                                                value={phoneCountryCode}
                                                onChange={(e) => {
                                                    const code = e.target.value;
                                                    setPhoneCountryCode(code);
                                                    setForm((f) => ({ ...f, phone: code + phoneNumber }));
                                                }}
                                                className="w-[56px] shrink-0 rounded-lg border px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="5XX XXX XX XX"
                                            />
                                        </div>
                                        <input
                                            value={form.patientName}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, patientName: e.target.value }))
                                            }
                                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="Hasta adı soyadı"
                                            required
                                        />
                                    </div>
                                    {patientMatchInfo && (
                                        <p className="mt-1 text-[10px] text-slate-600">
                                            {patientMatchInfo}{" "}
                                            <span className="font-semibold text-indigo-600">
                                                ({isNewPatient ? "Yeni hasta" : "Mevcut hasta"})
                                            </span>
                                        </p>
                                    )}
                                    {(matchedPatientAllergies || matchedPatientMedicalAlerts) && (
                                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px]">
                                            <p className="font-semibold text-amber-800 mb-1">Hasta alerji / tıbbi uyarı</p>
                                            {matchedPatientAllergies && (
                                                <p className="text-amber-900"><span className="font-medium">Alerjiler:</span> {matchedPatientAllergies}</p>
                                            )}
                                            {matchedPatientMedicalAlerts && (
                                                <p className="text-amber-900 mt-0.5"><span className="font-medium">Tıbbi uyarılar:</span> {matchedPatientMedicalAlerts}</p>
                                            )}
                                        </div>
                                    )}
                                    {isNewPatient && (
                                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                                            <div className="space-y-1">
                                                <label className="block text-[11px] font-medium text-slate-600">Alerjiler (opsiyonel)</label>
                                                <input
                                                    type="text"
                                                    value={form.allergies}
                                                    onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    placeholder="İlaç, lateks vb."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-[11px] font-medium text-slate-600">Tıbbi uyarılar (opsiyonel)</label>
                                                <input
                                                    type="text"
                                                    value={form.medicalAlerts}
                                                    onChange={(e) => setForm((f) => ({ ...f, medicalAlerts: e.target.value }))}
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    placeholder="Kan sulandırıcı, kalp vb."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Doğum tarihi
                                    </label>
                                    <PremiumDatePicker
                                        value={form.birthDate || today}
                                        onChange={(date) =>
                                            setForm((f) => ({ ...f, birthDate: date }))
                                        }
                                        today={today}
                                        compact
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        E-posta
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, email: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="ornek@hasta.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Opsiyonel"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Doktor
                                    </label>
                                    <select
                                        value={form.doctor}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm((f) => ({ ...f, doctor: value }));
                                        }}
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        {doctors.map((d) => (
                                            <option key={d} value={d}>
                                                {d || "Doktor atanmadı"}
                                            </option>
                                        ))}
                                    </select>
                                    {conflictWarning && (
                                        <p className="mt-1 text-[10px] text-rose-600 font-medium">
                                            {conflictWarning}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Kanal
                                    </label>
                                    <select
                                        value={form.channel}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, channel: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option>Web</option>
                                        <option>WhatsApp</option>
                                        <option>Telefon</option>
                                        <option>Yüz yüze</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="ONAYLI">Onaylandı</option>
                                        <option value="ONAY_BEKLIYOR">Onay bekliyor</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Tahmini ücret
                                    </label>
                                    <input
                                        value={form.estimatedAmount}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, estimatedAmount: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Muayene sonrası netleşir"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Arama">Arama</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
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
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value={0}>Hatırlatma yok</option>
                                        <option value={1440}>1 gün önce</option>
                                        <option value={240}>4 saat önce</option>
                                        <option value={60}>1 saat önce</option>
                                        <option value={30}>30 dakika önce</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Etiketler
                                    </label>
                                    <input
                                        value={form.tags}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, tags: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Yeni hasta, Acil, VIP..."
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Randevu öncesi not / Hasta ile ilgili ön bilgiler
                                    </label>
                                    <textarea
                                        value={form.patientNote}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, patientNote: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        rows={2}
                                        placeholder="Hastanın şikayeti, talep veya randevu öncesi notlar..."
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Tedavi sonrası not (doktor)
                                    </label>
                                    <textarea
                                        value={form.treatmentNote}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, treatmentNote: e.target.value }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        rows={2}
                                        placeholder="Randevu sonrası doktor tarafından doldurulur..."
                                    />
                                </div>
                                {form.channel === "WhatsApp" && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-slate-700">
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
                                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-slate-700">
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
                                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Footer */}
                                <div className="md:col-span-2 mt-4 pt-4 border-t flex items-center justify-between gap-2">
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
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
                                            className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-xs font-medium text-white hover:from-indigo-700 hover:to-violet-600 transition-all"
                                        >
                                            {editing ? "Kaydet" : "Oluştur"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}