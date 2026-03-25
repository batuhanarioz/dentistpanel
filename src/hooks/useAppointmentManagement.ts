import { useState, useEffect, useMemo, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { DayOfWeek, AppointmentStatus } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppointmentsForDate, getDoctors } from "@/lib/api";
import { patientSchema, toPatientDbPayload } from "@/lib/validations/patient";
import { internalAppointmentSchema } from "@/lib/validations/appointment";

export type CalendarAppointment = {
    id: string;
    date: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
    patientName: string;
    phone: string;
    email: string;
    birthDate?: string;
    doctor: string;
    doctorId: string | null;
    channel: string;
    treatmentType: string;
    status: AppointmentStatus;
    dbStatus: AppointmentStatus;
    patientNote?: string;
    internalNote?: string;
    treatmentNote?: string;
    patientAllergies?: string | null;
    patientMedicalAlerts?: string | null;

    tags?: string[];
    sourceConversationId?: string;
    sourceMessageId?: string;
    estimatedAmount?: string;
    patientId: string;
};

export interface AppointmentFormState {
    patientName: string;
    phone: string;
    email: string;
    birthDate: string;
    tcIdentityNo: string;
    doctor: string;
    channel: string;
    durationMinutes: number;
    treatmentType: string;
    status: AppointmentStatus;
    patientNote: string;
    treatmentNote: string;
    allergies: string;
    medicalAlerts: string;
    tags: string;
    conversationId: string;
    messageId: string;
    estimatedAmount: string;
}

export interface PatientSearchResult {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    birth_date: string | null;
    allergies: string | null;
    medical_alerts: string | null;
}

const JS_DAY_TO_KEY: DayOfWeek[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

export function useAppointmentManagement(initialData?: {
    appointments: CalendarAppointment[];
    clinicId?: string;
    slug?: string;
}) {
    const clinic = useClinic();
    const queryClient = useQueryClient();
    const today = useMemo(() => localDateStr(), []);
    const [selectedDate, setSelectedDate] = useState(today);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarAppointment | null>(null);
    const [formTime, setFormTime] = useState<string>("");
    const [formDate, setFormDate] = useState<string>(today);

    // React Query for Appointments
    const effectiveClinicId = initialData?.clinicId || clinic.clinicId;

    const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
        queryKey: ["appointments", selectedDate, effectiveClinicId],
        queryFn: () => getAppointmentsForDate(selectedDate, effectiveClinicId || ""),
        initialData: (selectedDate === today && initialData?.appointments?.length) ? initialData.appointments : undefined,
        enabled: !!effectiveClinicId,
        staleTime: 60 * 1000, // 1 dakika
    });

    // React Query for Doctors
    const { data: doctorsData = [] } = useQuery({
        queryKey: ["doctors", effectiveClinicId],
        queryFn: () => getDoctors(effectiveClinicId || ""),
        enabled: !!effectiveClinicId,
        staleTime: 10 * 60 * 1000, // 10 dakika — doktorlar nadiren değişir
    });

    const doctors = useMemo(() => ["", ...doctorsData.map((d: { full_name: string | null }) => d.full_name || "")], [doctorsData]);
    const doctorsList = doctorsData as { id: string; full_name: string | null }[];

    // React Query for Treatment Definitions
    const { data: treatmentDefinitions = [] } = useQuery({
        queryKey: ["treatmentDefinitions", effectiveClinicId],
        queryFn: async () => {
            if (!effectiveClinicId) return [];
            const { data } = await supabase
                .from("treatment_definitions")
                .select("id, name, default_duration, color")
                .eq("clinic_id", effectiveClinicId)
                .order("name", { ascending: true });
            return data || [];
        },
        enabled: !!effectiveClinicId,
        staleTime: 10 * 60 * 1000, // 10 dakika — tedavi tanımları nadiren değişir
    });



    const [phoneCountryCode, setPhoneCountryCode] = useState("+90");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [patientSearch, setPatientSearch] = useState("");
    const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
    const [patientSearchLoading, setPatientSearchLoading] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [duplicatePatient, setDuplicatePatient] = useState<PatientSearchResult | null>(null);

    const [form, setForm] = useState<AppointmentFormState>({
        patientName: "",
        phone: "",
        email: "",
        birthDate: "",
        tcIdentityNo: "",
        doctor: "",
        channel: "",
        durationMinutes: 30,
        treatmentType: "",
        status: "confirmed" as AppointmentStatus,
        patientNote: "",
        treatmentNote: "",
        allergies: "",
        medicalAlerts: "",

        tags: "",
        conversationId: "",
        messageId: "",
        estimatedAmount: "",
    });

    const [patientMatchInfo, setPatientMatchInfo] = useState<string | null>(null);
    const [isNewPatient, setIsNewPatient] = useState(true);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [matchedPatientAllergies, setMatchedPatientAllergies] = useState<string | null>(null);
    const [matchedPatientMedicalAlerts, setMatchedPatientMedicalAlerts] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditing(null);
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: doctors.length > 1 ? doctors[1] : "", channel: "", durationMinutes: 30,
            treatmentType: "", status: "confirmed", patientNote: "", treatmentNote: "",
            allergies: "", medicalAlerts: "", tags: "", conversationId: "", messageId: "",
            estimatedAmount: "",
        });
        setPhoneNumber("");
        setPatientSearch("");
        setSelectedPatientId("");
        setDuplicatePatient(null);
        setConflictWarning(null);
        setPhoneCountryCode("+90");
        setPatientMatchInfo(null);
        setMatchedPatientAllergies(null);
        setMatchedPatientMedicalAlerts(null);
        setSubmitError(null);
        setIsSubmitting(false);
    }, [doctors]);

    useEffect(() => {
        if (!effectiveClinicId) return;
        let cancelled = false;
        const searchPatients = async () => {
            if (patientSearch.length < 2) {
                setPatientSearchResults([]);
                return;
            }
            setPatientSearchLoading(true);
            const { data } = await supabase.from("patients").select("id, full_name, phone, email, birth_date, allergies, medical_alerts").eq("clinic_id", effectiveClinicId).or(`full_name.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%`).limit(10);
            if (!cancelled) {
                setPatientSearchResults(data || []);
                setPatientSearchLoading(false);
            }
        };
        const timer = setTimeout(searchPatients, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [patientSearch, effectiveClinicId]);

    useEffect(() => {
        if (!effectiveClinicId) return;
        let cancelled = false;
        const checkDuplicate = async () => {
            let cleanPhone = phoneNumber.replace(/\D/g, "");
            if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
            if (cleanPhone.length === 10 && !selectedPatientId) {
                const { data } = await supabase
                    .from("patients")
                    .select("id, full_name, phone, email, birth_date, allergies, medical_alerts")
                    .eq("clinic_id", effectiveClinicId)
                    .ilike("phone", `%${cleanPhone}%`)
                    .limit(1);
                if (!cancelled) setDuplicatePatient(data?.[0] || null);
            } else {
                if (!cancelled) setDuplicatePatient(null);
            }
        };
        const timer = setTimeout(checkDuplicate, 500);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [phoneNumber, selectedPatientId, effectiveClinicId]);

    // Conflict checking
    useEffect(() => {
        if (!formDate || !formTime || !form.doctor || !effectiveClinicId) {
            setConflictWarning(null);
            return;
        }
        const drId = doctorsList.find(d => d.full_name === form.doctor)?.id;
        if (!drId) { setConflictWarning(null); return; }

        let cancelled = false;
        const checkConflict = async () => {
            // +03:00 (Istanbul) ile yorumla — tarayıcı timezone'undan bağımsız
            const proposedStart = new Date(`${formDate}T${formTime}:00+03:00`);
            const proposedEnd = new Date(proposedStart.getTime() + form.durationMinutes * 60000);
            const { data } = await supabase
                .from("appointments")
                .select("id, starts_at, ends_at")
                .eq("clinic_id", effectiveClinicId)
                .eq("doctor_id", drId)
                .not("status", "in", `(cancelled,no_show)`)
                .lt("starts_at", proposedEnd.toISOString())
                .gt("ends_at", proposedStart.toISOString());
            if (!cancelled) {
                const conflicts = (data || []).filter(a => a.id !== editing?.id);
                setConflictWarning(conflicts.length > 0 ? "Bu saatte hekimin başka bir randevusu mevcut." : null);
            }
        };

        const t = setTimeout(checkConflict, 600);
        return () => { cancelled = true; clearTimeout(t); };
    }, [formDate, formTime, form.doctor, form.durationMinutes, effectiveClinicId, editing?.id, doctorsList]);

    const openNew = (hour?: number, date?: string, minute?: number, doctorName?: string) => {
        setEditing(null);
        setFormDate(date || selectedDate);
        setFormTime(hour !== undefined ? `${hour.toString().padStart(2, "0")}:${(minute ?? 0).toString().padStart(2, "0")}` : "");
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: doctorName || (doctors.length > 1 ? doctors[1] : ""), channel: "", durationMinutes: 30,
            treatmentType: "", status: "confirmed", patientNote: "", treatmentNote: "",
            allergies: "", medicalAlerts: "", tags: "", conversationId: "", messageId: "",
            estimatedAmount: "",
        });
        setPhoneNumber("");
        setSelectedPatientId("");
        setIsNewPatient(true);
        setPatientMatchInfo(null);
        setMatchedPatientAllergies(null);
        setMatchedPatientMedicalAlerts(null);
        setModalOpen(true);
    };

    const openEdit = (appt: CalendarAppointment) => {
        setEditing(appt);
        setFormDate(appt.date);
        setFormTime(`${appt.startHour.toString().padStart(2, "0")}:${appt.startMinute.toString().padStart(2, "0")}`);
        setForm({
            patientName: appt.patientName,
            phone: appt.phone,
            email: appt.email,
            birthDate: appt.birthDate || "",
            tcIdentityNo: "",
            doctor: appt.doctor,
            channel: appt.channel,
            durationMinutes: appt.durationMinutes,
            treatmentType: appt.treatmentType,
            status: appt.dbStatus,
            patientNote: appt.patientNote || "",
            treatmentNote: appt.treatmentNote || "",
            allergies: appt.patientAllergies || "",
            medicalAlerts: appt.patientMedicalAlerts || "",
            tags: appt.tags?.join(", ") || "",
            conversationId: appt.sourceConversationId || "",
            messageId: appt.sourceMessageId || "",
            estimatedAmount: appt.estimatedAmount?.toString() || "",
        });
        const fullPhone = appt.phone || "";
        let cleanPhone = fullPhone.replace(/\D/g, "");
        if (fullPhone.startsWith("+90")) {
            setPhoneCountryCode("+90");
            setPhoneNumber(fullPhone.substring(3).replace(/\D/g, ""));
        } else if (fullPhone.startsWith("+")) {
            const m = fullPhone.match(/^(\+\d{1,3})(.*)$/);
            setPhoneCountryCode(m?.[1] ?? "+90");
            setPhoneNumber(m?.[2]?.replace(/\D/g, "") ?? "");
        } else {
            if (cleanPhone.length === 12 && cleanPhone.startsWith("90")) {
                cleanPhone = cleanPhone.substring(2);
                setPhoneCountryCode("+90");
            } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
                cleanPhone = cleanPhone.substring(1);
                setPhoneCountryCode("+90");
            } else {
                setPhoneCountryCode("+90");
            }
            setPhoneNumber(cleanPhone);
        }
        setSelectedPatientId(appt.patientId);
        setIsNewPatient(false);
        setPatientMatchInfo("Mevcut hasta baz alındı.");
        setMatchedPatientAllergies(appt.patientAllergies || null);
        setMatchedPatientMedicalAlerts(appt.patientMedicalAlerts || null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveClinicId) return;
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            let patientId = selectedPatientId;
            if (!patientId) {
                const patientValidation = patientSchema.safeParse({
                    full_name: form.patientName,
                    phone: form.phone,
                    email: form.email || null,
                    birth_date: form.birthDate || null,
                    tc_identity_no: form.tcIdentityNo || null,
                });
                if (!patientValidation.success) {
                    setSubmitError("Hasta bilgileri geçersiz: " + patientValidation.error.issues[0].message);
                    return;
                }
                const { data: p, error: pError } = await supabase.from("patients").insert({
                    clinic_id: effectiveClinicId,
                    ...toPatientDbPayload(patientValidation.data)
                }).select("id").single();
                if (pError) { setSubmitError("Hasta kaydı yapılamadı: " + pError.message); return; }
                patientId = p.id;
            } else {
                const patientValidation = patientSchema.partial().safeParse({
                    full_name: form.patientName,
                    phone: form.phone,
                    email: form.email || null,
                    birth_date: form.birthDate || null,
                });
                if (!patientValidation.success) {
                    setSubmitError("Hasta bilgileri geçersiz: " + patientValidation.error.issues[0].message);
                    return;
                }
                await supabase.from("patients").update(patientValidation.data).eq("id", patientId).eq("clinic_id", effectiveClinicId);
            }

            const [h, m] = formTime.split(":").map(Number);
            // +03:00 (Istanbul) ile yorumla — tarayıcı timezone'undan bağımsız
            const start = new Date(`${formDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00+03:00`);
            const end = new Date(start.getTime() + form.durationMinutes * 60000);
            const drId = doctorsList.find(d => d.full_name === form.doctor)?.id || null;

            const apptData = {
                patient_id: patientId,
                doctor_id: drId,
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                channel: form.channel || null,
                status: form.status as AppointmentStatus,
                treatment_type: form.treatmentType,
                patient_note: form.patientNote || null,
                treatment_note: form.treatmentNote || null,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                estimated_amount: form.estimatedAmount ? parseFloat(form.estimatedAmount) : null,
            };

            const apptValidation = internalAppointmentSchema.safeParse(apptData);
            if (!apptValidation.success) {
                setSubmitError("Randevu bilgileri geçersiz: " + apptValidation.error.issues[0].message);
                return;
            }

            const payload = { clinic_id: effectiveClinicId, ...apptValidation.data };

            if (editing) {
                const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id).eq("clinic_id", effectiveClinicId);
                if (error) {
                    Sentry.captureException(error, { tags: { section: "appointments", action: "update" } });
                    setSubmitError("Güncelleme hatası: " + error.message);
                    return;
                }
            } else {
                const { error } = await supabase.from("appointments").insert(payload);
                if (error) {
                    Sentry.captureException(error, { tags: { section: "appointments", action: "insert" } });
                    setSubmitError("Kayıt hatası: " + error.message);
                    return;
                }
            }

            closeModal();
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedDayOfWeek = useMemo(() => {
        const d = new Date(selectedDate + "T12:00:00");
        return JS_DAY_TO_KEY[d.getDay()];
    }, [selectedDate]);

    const todaySchedule = clinic.workingHours[selectedDayOfWeek];
    const isDayOff = !todaySchedule?.enabled;

    const workingHourSlots = useMemo(() => {
        const slots = new Set<number>();

        // Normal çalışma saatlerini ekle
        if (todaySchedule?.enabled) {
            const openHour = parseInt(todaySchedule.open.split(":")[0], 10);
            const closeHour = parseInt(todaySchedule.close.split(":")[0], 10);
            for (let i = openHour; i <= closeHour; i++) slots.add(i);
        }

        // Randevusu olan her saati ekle (kapalı gün olsa bile)
        appointments.forEach(a => slots.add(a.startHour));

        // Eğer hiç slot yoksa (kapalı gün ve randevu yok), boş döner
        if (slots.size === 0) return [];

        return Array.from(slots).sort((a, b) => a - b);
    }, [todaySchedule, appointments]);

    const handleDelete = async () => {
        if (!editing || !effectiveClinicId) return;
        const { error } = await supabase.from("appointments").delete().eq("id", editing.id).eq("clinic_id", effectiveClinicId);
        if (error) {
            Sentry.captureException(error, { tags: { section: "appointments", action: "delete" } });
            throw new Error("Silme hatası: " + error.message);
        }
        closeModal();
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    const handleUseDuplicate = () => {
        if (!duplicatePatient) return;
        const p = duplicatePatient;

        setSelectedPatientId(p.id);
        setForm(f => ({ ...f, patientName: p.full_name, phone: p.phone || "", email: p.email || "", birthDate: p.birth_date || "" }));

        const rawPhone = p.phone || "";
        let cleanPhone = rawPhone.replace(/\D/g, "");

        if (rawPhone.startsWith("+90")) {
            setPhoneCountryCode("+90");
            setPhoneNumber(rawPhone.substring(3).replace(/\D/g, ""));
        } else if (rawPhone.startsWith("+")) {
            const match = rawPhone.match(/^(\+\d{1,3})(.*)$/);
            setPhoneCountryCode(match?.[1] ?? "+90");
            setPhoneNumber(match?.[2]?.replace(/\D/g, "") ?? "");
        } else {
            // Türkiye için akıllı temizleme
            if (cleanPhone.length === 12 && cleanPhone.startsWith("90")) {
                cleanPhone = cleanPhone.substring(2);
                setPhoneCountryCode("+90");
            } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
                cleanPhone = cleanPhone.substring(1);
                setPhoneCountryCode("+90");
            } else if (cleanPhone.length === 10) {
                setPhoneCountryCode("+90");
            } else {
                setPhoneCountryCode("+90");
            }
            setPhoneNumber(cleanPhone);
        }

        setIsNewPatient(false);
        setPatientMatchInfo("Kayıtlı hasta eşleştirildi.");
        setMatchedPatientAllergies(p.allergies || null);
        setMatchedPatientMedicalAlerts(p.medical_alerts || null);
        setDuplicatePatient(null);
    };

    return {
        today, selectedDate, setSelectedDate, appointments, modalOpen, setModalOpen, editing,
        formTime, setFormTime, formDate, setFormDate, doctors, phoneNumber, setPhoneNumber,
        phoneCountryCode, setPhoneCountryCode, patientSearch, setPatientSearch, patientSearchResults,
        patientSearchLoading, selectedPatientId, setSelectedPatientId, duplicatePatient, form, setForm,
        patientMatchInfo, isNewPatient, conflictWarning, matchedPatientAllergies, matchedPatientMedicalAlerts,
        submitError, isSubmitting,
        openNew, openEdit, handleSubmit, handleDelete, handleUseDuplicate, closeModal,
        todaySchedule, isDayOff, workingHourSlots, appointmentsLoading, treatmentDefinitions
    };
}
