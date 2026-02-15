import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { UserRole, DayOfWeek } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";

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
    estimatedAmount?: string;
};

const JS_DAY_TO_KEY: DayOfWeek[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

export function useAppointmentManagement() {
    const clinic = useClinic();
    const today = useMemo(() => localDateStr(), []);
    const [selectedDate, setSelectedDate] = useState(today);
    const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarAppointment | null>(null);
    const [formTime, setFormTime] = useState<string>("");
    const [formDate, setFormDate] = useState<string>(today);
    const [doctors, setDoctors] = useState<string[]>([]);
    const [doctorsList, setDoctorsList] = useState<Array<{ id: string; full_name: string }>>([]);

    const [phoneCountryCode, setPhoneCountryCode] = useState("+90");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [patients, setPatients] = useState<Array<{ id: string; full_name: string; phone: string | null; email: string | null; birth_date: string | null; allergies?: string | null; medical_alerts?: string | null }>>([]);
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
        channel: "web",
        durationMinutes: 30,
        treatmentType: "MUAYENE",
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
    const lastRequestDate = useRef<string>("");

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditing(null);
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: "", channel: "web", durationMinutes: 30, treatmentType: "MUAYENE",
            status: "ONAY_BEKLIYOR", patientNote: "", treatmentNote: "", allergies: "",
            medicalAlerts: "", contactPreference: "WhatsApp", reminderMinutesBefore: 1440,
            tags: "", conversationId: "", messageId: "", estimatedAmount: "", result: "",
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
    }, []);

    const loadAppointmentsForDate = useCallback(async (date: string) => {
        lastRequestDate.current = date;
        setAppointments([]);

        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59`);

        const { data, error } = await supabase
            .from("appointments")
            .select("*")
            .gte("starts_at", start.toISOString())
            .lt("starts_at", end.toISOString())
            .order("starts_at", { ascending: true });

        if (lastRequestDate.current !== date) return;

        if (error || !data) {
            setAppointments([]);
            return;
        }

        const patientIds = Array.from(new Set(data.map((a) => a.patient_id).filter(Boolean))) as string[];
        const doctorIds = Array.from(new Set(data.map((a) => a.doctor_id).filter(Boolean))) as string[];

        const [patientsRes, doctorsRes] = await Promise.all([
            patientIds.length ? supabase.from("patients").select("*").in("id", patientIds) : Promise.resolve({ data: [], error: null }),
            doctorIds.length ? supabase.from("users").select("*").in("id", doctorIds) : Promise.resolve({ data: [], error: null }),
        ]);

        const patientsMap = Object.fromEntries((patientsRes.data || []).map((p: any) => [p.id, p]));
        const doctorsMap = Object.fromEntries((doctorsRes.data || []).map((d: any) => [d.id, d.full_name]));

        const channelMap: Record<string, string> = { web: "Web", whatsapp: "WhatsApp", phone: "Telefon", walk_in: "Yüz yüze" };

        const mapped: CalendarAppointment[] = (data || []).map((row: any) => {
            const startDate = new Date(row.starts_at);
            const endDate = new Date(row.ends_at);
            const durationMinutes = Math.max(10, Math.round((endDate.getTime() - startDate.getTime()) / 60000) || 30);
            const patient = patientsMap[row.patient_id];
            return {
                id: row.id,
                date: (row.starts_at as string).split("T")[0],
                startHour: startDate.getHours(),
                startMinute: startDate.getMinutes(),
                durationMinutes,
                patientName: patient?.full_name ?? "İsimsiz",
                phone: patient?.phone ?? "",
                email: patient?.email ?? "",
                birthDate: patient?.birth_date ?? "",
                doctor: row.doctor_id ? doctorsMap[row.doctor_id] : "",
                doctorId: row.doctor_id,
                channel: channelMap[row.channel as string] || row.channel,
                treatmentType: row.treatment_type ?? "MUAYENE",
                status: row.status === "confirmed" ? "ONAYLI" : "ONAY_BEKLIYOR",
                dbStatus: row.status as any,
                patientNote: row.patient_note,
                internalNote: row.internal_note,
                treatmentNote: row.treatment_note,
                patientAllergies: patient?.allergies,
                patientMedicalAlerts: patient?.medical_alerts,
                contactPreference: row.contact_preference === "WhatsApp" || row.contact_preference === "SMS" || row.contact_preference === "Arama" ? row.contact_preference : "WhatsApp",
                reminderMinutesBefore: row.reminder_minutes_before,
                tags: row.tags || [],
                sourceConversationId: row.source_conversation_id,
                sourceMessageId: row.source_message_id,
                estimatedAmount: row.estimated_amount,
            };
        });

        setAppointments(mapped);
    }, []);

    useEffect(() => {
        loadAppointmentsForDate(selectedDate);
    }, [selectedDate, loadAppointmentsForDate]);

    useEffect(() => {
        const fetchContextData = async () => {
            const { data } = await supabase.from("users").select("id, full_name").eq("role", UserRole.DOKTOR);
            const drNames = (data || []).map((d: any) => d.full_name);
            setDoctors(["", ...drNames]);
            setDoctorsList(data || []);

            const { data: pData } = await supabase.from("patients").select("id, full_name, phone, email, birth_date, allergies, medical_alerts").limit(200);
            setPatients(pData || []);
        };
        fetchContextData();
    }, []);

    useEffect(() => {
        const searchPatients = async () => {
            if (patientSearch.length < 2) {
                setPatientSearchResults([]);
                return;
            }
            setPatientSearchLoading(true);
            const { data } = await supabase.from("patients").select("id, full_name, phone, email, birth_date, allergies, medical_alerts").or(`full_name.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%`).limit(10);
            setPatientSearchResults(data || []);
            setPatientSearchLoading(false);
        };
        const timer = setTimeout(searchPatients, 300);
        return () => clearTimeout(timer);
    }, [patientSearch]);

    useEffect(() => {
        const checkDuplicate = async () => {
            let cleanPhone = phoneNumber.replace(/\D/g, "");
            if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
            if (cleanPhone.length === 10 && !selectedPatientId) {
                const match = patients.find(p => p.phone?.replace(/\D/g, "").endsWith(cleanPhone));
                setDuplicatePatient(match || null);
            } else {
                setDuplicatePatient(null);
            }
        };
        checkDuplicate();
    }, [phoneNumber, selectedPatientId, patients]);

    const openNew = (hour?: number, date?: string) => {
        setEditing(null);
        setFormDate(date || selectedDate);
        setFormTime(hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "");
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: doctors.length > 1 ? doctors[1] : "", channel: "web", durationMinutes: 30,
            treatmentType: "MUAYENE", status: "ONAY_BEKLIYOR", patientNote: "", treatmentNote: "",
            allergies: "", medicalAlerts: "", contactPreference: "WhatsApp",
            reminderMinutesBefore: 1440, tags: "", conversationId: "", messageId: "",
            estimatedAmount: "", result: "",
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
            status: appt.status,
            patientNote: appt.patientNote || "",
            treatmentNote: appt.treatmentNote || "",
            allergies: appt.patientAllergies || "",
            medicalAlerts: appt.patientMedicalAlerts || "",
            contactPreference: appt.contactPreference,
            reminderMinutesBefore: appt.reminderMinutesBefore || 0,
            tags: appt.tags?.join(", ") || "",
            conversationId: appt.sourceConversationId || "",
            messageId: appt.sourceMessageId || "",
            estimatedAmount: appt.estimatedAmount?.toString() || "",
            result: "",
        });
        const fullPhone = appt.phone;
        if (fullPhone.startsWith("+")) {
            const m = fullPhone.match(/^(\+\d{1,4})(.*)$/);
            setPhoneCountryCode(m?.[1] ?? "+90");
            setPhoneNumber(m?.[2] ?? "");
        } else {
            setPhoneCountryCode("+90");
            setPhoneNumber(fullPhone.replace(/\D/g, ""));
        }
        const found = patients.find(p => p.phone === appt.phone);
        setSelectedPatientId(found?.id || "");
        setIsNewPatient(!found);
        setPatientMatchInfo(found ? "Mevcut hasta baz alındı." : null);
        setMatchedPatientAllergies(appt.patientAllergies || null);
        setMatchedPatientMedicalAlerts(appt.patientMedicalAlerts || null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clinic.clinicId) return;

        let patientId = selectedPatientId;
        if (!patientId) {
            const { data: p, error: pError } = await supabase.from("patients").insert({
                clinic_id: clinic.clinicId,
                full_name: form.patientName,
                phone: form.phone,
                email: form.email || null,
                birth_date: form.birthDate || null,
                tc_identity_no: form.tcIdentityNo || null,
                allergies: form.allergies || null,
                medical_alerts: form.medicalAlerts || null,
            }).select("id").single();
            if (pError) { alert("Hasta kaydı yapılamadı: " + pError.message); return; }
            patientId = p.id;
        } else {
            // Update patient if info changed
            await supabase.from("patients").update({
                full_name: form.patientName,
                phone: form.phone,
                email: form.email || null,
                birth_date: form.birthDate || null,
                allergies: form.allergies || null,
                medical_alerts: form.medicalAlerts || null,
            }).eq("id", patientId);
        }

        const [h, m] = formTime.split(":").map(Number);
        const start = new Date(`${formDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
        const end = new Date(start.getTime() + form.durationMinutes * 60000);
        const drId = doctorsList.find(d => d.full_name === form.doctor)?.id || null;

        const reverseChannelMap: Record<string, string> = { "Web": "web", "WhatsApp": "whatsapp", "Telefon": "phone", "Yüz yüze": "walk_in" };
        const payload: any = {
            clinic_id: clinic.clinicId,
            patient_id: patientId,
            doctor_id: drId,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            channel: reverseChannelMap[form.channel] || form.channel.toLowerCase(),
            status: form.status === "ONAYLI" ? "confirmed" : "pending",
            treatment_type: form.treatmentType,
            patient_note: form.patientNote,
            treatment_note: form.treatmentNote,
            contact_preference: form.contactPreference,
            reminder_minutes_before: form.reminderMinutesBefore,
            tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            source_conversation_id: form.conversationId || null,
            source_message_id: form.messageId || null,
            estimated_amount: form.estimatedAmount ? parseFloat(form.estimatedAmount) : null,
        };

        if (editing?.id && form.result === "GERCEKLESTI") payload.status = "completed";
        if (editing?.id && form.result === "IPTAL") payload.status = "cancelled";

        if (editing) {
            const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id);
            if (error) alert("Güncelleme hatası: " + error.message);
        } else {
            const { error } = await supabase.from("appointments").insert(payload);
            if (error) alert(" Kayıt hatası: " + error.message);
        }

        closeModal();
        loadAppointmentsForDate(selectedDate);
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
        if (!editing || !confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
        const { error } = await supabase.from("appointments").delete().eq("id", editing.id);
        if (error) alert("Silme hatası: " + error.message);
        else { closeModal(); loadAppointmentsForDate(selectedDate); }
    };

    const handleUseDuplicate = () => {
        if (!duplicatePatient) return;
        const p = patients.find(px => px.id === duplicatePatient.id);
        if (!p) return;
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
        openNew, openEdit, handleSubmit, handleDelete, handleUseDuplicate, closeModal,
        todaySchedule, isDayOff, workingHourSlots, patients
    };
}
