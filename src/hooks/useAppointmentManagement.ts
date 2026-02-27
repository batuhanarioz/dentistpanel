import { useState, useEffect, useMemo, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { DayOfWeek, AppointmentChannel, AppointmentStatus } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { CHANNEL_LABEL_MAP } from "@/constants/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAppointmentsForDate, getDoctors } from "@/lib/api";
import { patientSchema } from "@/lib/validations/patient";
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
    status: "confirmed" | "cancelled" | "no_show" | "completed";
    dbStatus: "confirmed" | "cancelled" | "no_show" | "completed";
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
    statusResult?: string; // result yerine statusResult kullanabiliriz ama mevcut yapıya sadık kalalım
    allergies: string;
    medicalAlerts: string;
    tags: string;
    conversationId: string;
    messageId: string;
    estimatedAmount: string;
    result: string;
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
    });

    // React Query for Doctors
    const { data: doctorsData = [] } = useQuery({
        queryKey: ["doctors", effectiveClinicId],
        queryFn: () => getDoctors(effectiveClinicId || ""),
        enabled: !!effectiveClinicId,
    });

    const doctors = useMemo(() => ["", ...doctorsData.map((d: { full_name: string | null }) => d.full_name || "")], [doctorsData]);
    const doctorsList = doctorsData as { id: string; full_name: string | null }[];



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
        channel: "web",
        durationMinutes: 30,
        treatmentType: "MUAYENE",
        status: "confirmed" as "confirmed" | "cancelled" | "no_show" | "completed",
        patientNote: "",
        treatmentNote: "",
        allergies: "",
        medicalAlerts: "",

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

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setEditing(null);
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: doctors.length > 1 ? doctors[1] : "", channel: "web", durationMinutes: 30,
            treatmentType: "MUAYENE", status: "confirmed", patientNote: "", treatmentNote: "",
            allergies: "", medicalAlerts: "", tags: "", conversationId: "", messageId: "",
            estimatedAmount: "", result: "",
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
    }, [doctors]);

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
                // Perform a targeted search instead of using a local list
                const { data } = await supabase
                    .from("patients")
                    .select("id, full_name, phone, email, birth_date, allergies, medical_alerts")
                    .ilike("phone", `%${cleanPhone}%`)
                    .limit(1);
                setDuplicatePatient(data?.[0] || null);
            } else {
                setDuplicatePatient(null);
            }
        };
        const timer = setTimeout(checkDuplicate, 500);
        return () => clearTimeout(timer);
    }, [phoneNumber, selectedPatientId]);

    const openNew = (hour?: number, date?: string) => {
        setEditing(null);
        setFormDate(date || selectedDate);
        setFormTime(hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "");
        setForm({
            patientName: "", phone: "", email: "", birthDate: "", tcIdentityNo: "",
            doctor: doctors.length > 1 ? doctors[1] : "", channel: "web", durationMinutes: 30,
            treatmentType: "MUAYENE", status: "confirmed", patientNote: "", treatmentNote: "",
            allergies: "", medicalAlerts: "", tags: "", conversationId: "", messageId: "",
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
            status: appt.dbStatus,
            patientNote: appt.patientNote || "",
            treatmentNote: appt.treatmentNote || "",
            allergies: appt.patientAllergies || "",
            medicalAlerts: appt.patientMedicalAlerts || "",
            tags: appt.tags?.join(", ") || "",
            conversationId: appt.sourceConversationId || "",
            messageId: appt.sourceMessageId || "",
            estimatedAmount: appt.estimatedAmount?.toString() || "",
            result: "",
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
        if (!clinic.clinicId) return;

        let patientId = selectedPatientId;
        if (!patientId) {
            // Validation
            const patientValidation = patientSchema.safeParse({
                full_name: form.patientName,
                phone: form.phone,
                email: form.email || null,
                birth_date: form.birthDate || null,
                tc_identity_no: form.tcIdentityNo || null,
                allergies: form.allergies || null,
                medical_alerts: form.medicalAlerts || null,
            });

            if (!patientValidation.success) {
                alert("Hasta bilgileri geçersiz: " + patientValidation.error.issues[0].message);
                return;
            }

            const { data: p, error: pError } = await supabase.from("patients").insert({
                clinic_id: clinic.clinicId,
                ...patientValidation.data
            }).select("id").single();
            if (pError) { alert("Hasta kaydı yapılamadı: " + pError.message); return; }
            patientId = p.id;
        } else {
            // Update patient if info changed
            const patientValidation = patientSchema.partial().safeParse({
                full_name: form.patientName,
                phone: form.phone,
                email: form.email || null,
                birth_date: form.birthDate || null,
                allergies: form.allergies || null,
                medical_alerts: form.medicalAlerts || null,
            });

            if (!patientValidation.success) {
                alert("Hasta bilgileri geçersiz: " + patientValidation.error.issues[0].message);
                return;
            }

            await supabase.from("patients").update(patientValidation.data).eq("id", patientId);
        }

        const [h, m] = formTime.split(":").map(Number);
        const start = new Date(`${formDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
        const end = new Date(start.getTime() + form.durationMinutes * 60000);
        const drId = doctorsList.find(d => d.full_name === form.doctor)?.id || null;

        const reverseChannelMap = Object.fromEntries(
            Object.entries(CHANNEL_LABEL_MAP).map(([k, v]) => [v, k])
        );

        const apptData = {
            patient_id: patientId,
            doctor_id: drId,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            channel: (reverseChannelMap[form.channel] || form.channel.toLowerCase()) as AppointmentChannel,
            status: form.status as AppointmentStatus,
            treatment_type: form.treatmentType,
            patient_note: form.patientNote || null,
            treatment_note: form.treatmentNote || null,

            tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            estimated_amount: form.estimatedAmount ? parseFloat(form.estimatedAmount) : null,
        };

        if (editing?.id && form.result === "GERCEKLESTI") apptData.status = "completed" as AppointmentStatus;
        if (editing?.id && form.result === "IPTAL") apptData.status = "cancelled" as AppointmentStatus;

        const apptValidation = internalAppointmentSchema.safeParse(apptData);
        if (!apptValidation.success) {
            alert("Randevu bilgileri geçersiz: " + apptValidation.error.issues[0].message);
            return;
        }

        const payload = {
            clinic_id: clinic.clinicId,
            ...apptValidation.data
        };

        if (editing) {
            const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id);
            if (error) {
                Sentry.captureException(error, { tags: { section: "appointments", action: "update" } });
                alert("Güncelleme hatası: " + error.message);
            }
        } else {
            const { error } = await supabase.from("appointments").insert(payload);
            if (error) {
                Sentry.captureException(error, { tags: { section: "appointments", action: "insert" } });
                alert(" Kayıt hatası: " + error.message);
            }
        }

        closeModal();
        queryClient.invalidateQueries({ queryKey: ["appointments", selectedDate] });
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
        if (error) {
            Sentry.captureException(error, { tags: { section: "appointments", action: "delete" } });
            alert("Silme hatası: " + error.message);
        }
        else {
            closeModal();
            queryClient.invalidateQueries({ queryKey: ["appointments", selectedDate] });
        }
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
        openNew, openEdit, handleSubmit, handleDelete, handleUseDuplicate, closeModal,
        todaySchedule, isDayOff, workingHourSlots, appointmentsLoading
    };
}

