import { supabase } from "@/lib/supabaseClient";
import { UserRole, User, Payment, AppointmentStatus } from "@/types/database";
import { CHANNEL_LABEL_MAP } from "@/constants/dashboard";
import { CalendarAppointment } from "@/hooks/useAppointmentManagement";

export async function getClinicBySlug(slug: string) {
    const { data } = await supabase.from("clinics").select("id, name, slug").eq("slug", slug).maybeSingle();
    return data;
}

export async function getAppointmentsForDate(date: string, clinicId: string): Promise<CalendarAppointment[]> {
    if (!clinicId) return [];

    // date is YYYY-MM-DD. 
    // We want to fetch all appointments that overlap with this day.
    // For simplicity, we fetch all that start on this day.
    // Using simple string comparison for timestamps works well in Supabase/Postgres.
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id, starts_at, ends_at, patient_id, doctor_id, channel, treatment_type, status, 
            patient_note, internal_note, treatment_note, tags, source_conversation_id, 
            source_message_id, estimated_amount
        `)
        .eq("clinic_id", clinicId)
        .gte("starts_at", `${date}T00:00:00+03:00`)
        .lte("starts_at", `${date}T23:59:59+03:00`)
        .order("starts_at", { ascending: true });

    if (error || !data) {
        console.error("getAppointmentsForDate error:", error);
        return [];
    }

    const patientIds = Array.from(new Set(data.map((a) => a.patient_id).filter(Boolean))) as string[];
    const doctorIds = Array.from(new Set(data.map((a) => a.doctor_id).filter(Boolean))) as string[];

    const [patientsRes, doctorsRes] = await Promise.all([
        patientIds.length ? supabase.from("patients").select("id, full_name, phone, email, birth_date, allergies, medical_alerts").eq("clinic_id", clinicId).in("id", patientIds) : Promise.resolve({ data: [], error: null }),
        doctorIds.length ? supabase.from("users").select("id, full_name").eq("clinic_id", clinicId).in("id", doctorIds) : Promise.resolve({ data: [], error: null }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientsMap = Object.fromEntries((patientsRes.data || []).map((p: any) => [p.id, p]));
    const doctorsMap = Object.fromEntries((doctorsRes.data || []).map((d: { id: string, full_name: string }) => [d.id, d.full_name]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: CalendarAppointment[] = (data || []).map((row: any) => {
        const startDate = new Date(row.starts_at);
        const endDate = new Date(row.ends_at);
        const durationMinutes = Math.max(10, Math.round((endDate.getTime() - startDate.getTime()) / 60000) || 30);
        const patient = patientsMap[row.patient_id];

        const trTime = new Intl.DateTimeFormat('tr-TR', {
            timeZone: 'Asia/Istanbul',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).formatToParts(startDate);

        const hour = parseInt(trTime.find(p => p.type === 'hour')?.value || '0');
        const minute = parseInt(trTime.find(p => p.type === 'minute')?.value || '0');

        const localDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(startDate);

        return {
            id: row.id,
            date: localDate,
            startHour: hour,
            startMinute: minute,
            durationMinutes,
            patientName: patient?.full_name ?? "İsimsiz",
            phone: patient?.phone ?? "",
            email: patient?.email ?? "",
            birthDate: patient?.birth_date ?? "",
            doctor: row.doctor_id ? doctorsMap[row.doctor_id] : "",
            doctorId: row.doctor_id,
            channel: CHANNEL_LABEL_MAP[row.channel as string] || row.channel,
            treatmentType: row.treatment_type ?? "MUAYENE",
            status: row.status as AppointmentStatus,
            dbStatus: row.status as AppointmentStatus,
            patientNote: row.patient_note || undefined,
            internalNote: row.internal_note || undefined,
            treatmentNote: row.treatment_note || undefined,
            patientAllergies: patient?.allergies,
            patientMedicalAlerts: patient?.medical_alerts,
            tags: row.tags || [],
            sourceConversationId: row.source_conversation_id || undefined,
            sourceMessageId: row.source_message_id || undefined,
            estimatedAmount: row.estimated_amount?.toString(),
            patientId: row.patient_id,
        };
    });

    return mapped;
}

export async function getDoctors(clinicId: string) {
    if (!clinicId) return [];
    const { data } = await supabase.from("users").select("id, full_name").eq("clinic_id", clinicId).eq("role", UserRole.DOKTOR);
    return data || [];
}

export async function getAllPatients(clinicId: string) {
    if (!clinicId) return [];
    const { data } = await supabase.from("patients")
        .select("id, full_name, phone, email, birth_date, tc_identity_no, allergies, medical_alerts, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
    return data || [];
}

export async function getDashboardData(date: string, clinicId: string) {
    if (!clinicId) return [];
    const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, patient_id, doctor_id, channel, status, treatment_type, estimated_amount")
        .eq("clinic_id", clinicId)
        .gte("starts_at", `${date}T00:00:00+03:00`)
        .lte("starts_at", `${date}T23:59:59+03:00`)
        .order("starts_at", { ascending: true });

    if (error || !data) {
        console.error("getDashboardData error:", error);
        return [];
    }

    const patientIds = Array.from(new Set(data.map((a) => a.patient_id).filter(Boolean))) as string[];
    const doctorIds = Array.from(new Set(data.map((a) => a.doctor_id).filter(Boolean))) as string[];

    const [patientsRes, doctorsRes] = await Promise.all([
        patientIds.length ? supabase.from("patients").select("id, full_name, phone").eq("clinic_id", clinicId).in("id", patientIds) : Promise.resolve({ data: [] }),
        doctorIds.length ? supabase.from("users").select("id, full_name").eq("clinic_id", clinicId).in("id", doctorIds) : Promise.resolve({ data: [] })
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientsMap = Object.fromEntries((patientsRes.data || []).map((p: any) => [p.id, p]));
    const doctorsMap = Object.fromEntries((doctorsRes.data || []).map((d: Partial<User>) => [d.id, d.full_name || ""]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        patientName: patientsMap[row.patient_id]?.full_name ?? "İsimsiz Hasta",
        patientPhone: patientsMap[row.patient_id]?.phone ?? null,
        doctorName: doctorsMap[row.doctor_id] ?? "Doktor atanmadı",
        doctorId: row.doctor_id ?? null,
        channel: row.channel,
        status: row.status,
        treatmentType: row.treatment_type ?? null,
        estimatedAmount: row.estimated_amount !== null ? Number(row.estimated_amount) : null,
    }));
}

export async function getTaskConfigs(clinicId: string) {
    const { data: defs } = await supabase.from("dashboard_task_definitions").select("*");
    const { data: configs } = await supabase.from("clinic_task_configs").select("*").eq("clinic_id", clinicId);

    const mapping: Record<string, { role: string; enabled: boolean }> = {};
    defs?.forEach((d: { id: string; code: string; default_role: string }) => {
        const config = configs?.find((c: { task_definition_id: string; assigned_role: string; is_enabled: boolean }) => c.task_definition_id === d.id);
        mapping[d.code] = {
            role: config ? config.assigned_role : d.default_role,
            enabled: config ? config.is_enabled : true,
        };
    });
    return mapping;
}

export async function getPaymentsForAppointments(appointmentIds: string[]) {
    if (!appointmentIds.length) return {};
    const { data } = await supabase.from("payments").select("id, appointment_id").in("appointment_id", appointmentIds);
    return Object.fromEntries((data || []).map((p: { appointment_id: string }) => [p.appointment_id, true]));
}

export async function getPatientDetails(patientId: string) {
    const [apptRes, payRes] = await Promise.all([
        supabase
            .from("appointments")
            .select("id, starts_at, ends_at, status, treatment_type, doctor:doctor_id(full_name), patient_note, internal_note, treatment_note")
            .eq("patient_id", patientId)
            .order("starts_at", { ascending: false }),
        supabase
            .from("payments")
            .select("id, amount, method, status, due_date")
            .eq("patient_id", patientId)
            .order("due_date", { ascending: false }),
    ]);

    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appointments: (apptRes.data || []).map((row: any) => {
            const doctorData = (Array.isArray(row.doctor) ? row.doctor[0] : row.doctor) as { full_name: string } | null;
            return {
                id: row.id,
                starts_at: row.starts_at,
                ends_at: row.ends_at,
                status: row.status,
                treatment_type: row.treatment_type,
                doctor_name: doctorData?.full_name ?? null,
                patient_note: row.patient_note,
                internal_note: row.internal_note,
                treatment_note: row.treatment_note,
            };
        }),
        payments: (payRes.data || []).map((row: Partial<Payment>) => ({
            id: row.id!,
            amount: Number(row.amount),
            method: row.method || null,
            status: row.status || null,
            due_date: row.due_date || null,
        })),
    };
}
