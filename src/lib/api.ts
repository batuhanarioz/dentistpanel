import { supabase } from "@/lib/supabaseClient";
import { UserRole, Payment, AppointmentStatus, ClinicSettings, TreatmentDefinition } from "@/types/database";
import { CHANNEL_LABEL_MAP } from "@/constants/dashboard";

// Inline type – previously lived in the deleted useAppointmentManagement hook
export interface CalendarAppointment {
    id: string;
    date: string;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
    patientName: string;
    phone: string;
    email: string;
    birthDate: string;
    doctor: string;
    doctorId: string | null;
    channel: string;
    treatmentType: string;
    status: AppointmentStatus;
    dbStatus: AppointmentStatus;
    patientNote?: string;
    internalNote?: string;
    treatmentNote?: string;
    patientAllergies?: string;
    patientMedicalAlerts?: string;
    tags: string[];
    sourceConversationId?: string;
    sourceMessageId?: string;
    estimatedAmount?: string;
    patientId: string;
}

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
            treatmentType: row.treatment_type ?? "",
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

export async function getAllPatients(clinicId: string, page: number = 1, pageSize: number = 50) {
    if (!clinicId) return [];
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase.from("patients")
        .select("id, full_name, phone, email, birth_date, tc_identity_no, gender, blood_group, address, occupation, allergies, medical_alerts, notes, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("getAllPatients error:", error);
        return [];
    }
    return data || [];
}

export async function getDashboardData(date: string, clinicId: string) {
    if (!clinicId) return [];
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id, starts_at, ends_at, patient_id, doctor_id, channel, status, treatment_type, estimated_amount,
            patients(full_name, phone),
            doctor:doctor_id(full_name)
        `)
        .eq("clinic_id", clinicId)
        .gte("starts_at", `${date}T00:00:00+03:00`)
        .lte("starts_at", `${date}T23:59:59+03:00`)
        .order("starts_at", { ascending: true });

    if (error || !data) {
        console.error("getDashboardData error:", error);
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        patientName: row.patients?.full_name ?? "İsimsiz Hasta",
        patientPhone: row.patients?.phone ?? null,
        doctorName: row.doctor?.full_name ?? "Hekim atanmadı",
        doctorId: row.doctor_id ?? null,
        channel: row.channel,
        status: row.status,
        treatmentType: row.treatment_type ?? null,
        estimatedAmount: row.estimated_amount !== null ? Number(row.estimated_amount) : null,
    }));
}

export async function getChecklistItems(clinicId: string, date: string) {
    if (!clinicId) return [];

    // Veritabanı düzeyinde görevleri yenile (yeni biten randevular vb. için)
    const { error: rpcError } = await supabase.rpc('refresh_checklist_items', { p_clinic_id: clinicId });
    if (rpcError) console.error("refresh_checklist_items rpc error:", rpcError);

    // Sadece belirtilen güne ait randevuların görevlerini getir
    const { data, error } = await supabase
        .from("checklist_items")
        .select(`
            id, status, appointment_id, definition_id,
            appointments!inner(
                id, starts_at, ends_at, treatment_type, status, clinic_id, patient_id, estimated_amount,
                patients!inner(full_name)
            ),
            checklist_definitions!inner(code, title, tone)
        `)
        .eq("clinic_id", clinicId)
        .eq("status", "pending")
        .gte("appointments.starts_at", `${date}T00:00:00+03:00`)
        .lte("appointments.starts_at", `${date}T23:59:59+03:00`);

    if (error) {
        console.error("getChecklistItems error:", error);
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        appointmentId: row.appointment_id,
        code: row.checklist_definitions.code,
        title: row.checklist_definitions.title,
        tone: row.checklist_definitions.tone,
        patientName: row.appointments.patients.full_name,
        patientId: row.appointments.patient_id,
        estimatedAmount: row.appointments.estimated_amount,
        startsAt: row.appointments.starts_at,
        endsAt: row.appointments.ends_at,
        treatmentType: row.appointments.treatment_type,
        appointmentStatus: row.appointments.status
    }));
}

export async function updateChecklistItemStatus(itemId: string, status: string, clinicId: string) {
    const { error } = await supabase
        .from("checklist_items")
        .update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", itemId)
        .eq("clinic_id", clinicId);
    return { error };
}

export async function getChecklistConfigs(clinicId: string) {
    // Yeni sistem: checklist_definitions ve checklist_clinic_roles tablolarını birleştir
    const [defsRes, rolesRes] = await Promise.all([
        supabase.from("checklist_definitions").select("id, code, title, tone"),
        supabase.from("checklist_clinic_roles").select("definition_id, role").eq("clinic_id", clinicId)
    ]);

    const mapping: Record<string, { roles: string[]; enabled: boolean }> = {};

    defsRes.data?.forEach(def => {
        const rolesForDef = rolesRes.data?.filter(r => r.definition_id === def.id).map(r => r.role) || [];
        mapping[def.code] = {
            roles: rolesForDef,
            enabled: true // Yeni sistemde ayrı bir is_enabled yok, rol ataması yoksa o rol görmez
        };
    });

    return mapping;
}

export async function getTaskConfigs(clinicId: string) {
    // Geriye dönük uyumluluk için eski ismi koruyoruz ama yeni yapıdan besliyoruz
    const configs = await getChecklistConfigs(clinicId);
    const legacyMapping: Record<string, { role: string; enabled: boolean }> = {};

    Object.entries(configs).forEach(([code, data]) => {
        legacyMapping[code] = {
            role: data.roles[0] || "", // Eski kod tek rol bekliyor olabilir
            enabled: data.roles.length > 0
        };
    });
    return legacyMapping;
}

export async function createPayments(payments: Partial<Payment>[]) {
    // Parent_id takibi için eğer taksitli ise ilkini kaydedip id'sini alıp diğerlerine set etmek gerekebilir.
    // Şimdilik client-side id üretilip gönderilebilir veya Supabase insert ile toplu eklenebilir.
    const { data, error } = await supabase
        .from("payments")
        .insert(payments.map(p => ({ ...p, clinic_id: p.clinic_id || payments[0]?.clinic_id })))
        .select("id, amount, status");
    return { data, error };
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
            .select("id, amount, method, status, due_date, appointment_id, installment_count, installment_number, parent_payment_id")
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
            appointment_id: row.appointment_id || null,
            installment_count: row.installment_count || null,
            installment_number: row.installment_number || null,
            parent_payment_id: row.parent_payment_id || null,
        })),
    };
}

export async function getTodayPayments(clinicId: string, date: string) {
    if (!clinicId) return [];

    const { data, error } = await supabase
        .from("payments")
        .select(`
            id, amount, status, due_date, patient_id, appointment_id,
            patients(full_name, phone)
        `)
        .eq("clinic_id", clinicId)
        .eq("due_date", date)
        .in("status", ["pending", "planned", "partial", "Beklemede", "Kısmi", "Ödenmedi"]);

    if (error) {
        console.error("getTodayPayments error:", error);
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        status: row.status,
        dueDate: row.due_date,
        patientName: row.patients?.full_name ?? "İsimsiz",
        patientPhone: row.patients?.phone ?? null,
        patientId: row.patient_id,
        appointmentId: row.appointment_id
    }));
}

export async function getClinicSettings(clinicId: string): Promise<ClinicSettings | null> {
    if (!clinicId) return null;
    const { data, error } = await supabase
        .from("clinic_settings")
        .select("id, clinic_id, message_templates, notification_settings, assistant_timings, created_at, updated_at")
        .eq("clinic_id", clinicId)
        .maybeSingle();

    if (error) {
        console.error("getClinicSettings error:", error);
        return null;
    }
    return data;
}

export async function updateClinicSettings(clinicId: string, settings: Partial<ClinicSettings>) {
    if (!clinicId) return { error: "Clinic ID is required" };

    // id ve clinic_id'nin güncellenmesini istemiyoruz
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { id, clinic_id, created_at, updated_at, ...updateData } = settings as any;

    const { data, error } = await supabase
        .from("clinic_settings")
        .update(updateData)
        .eq("clinic_id", clinicId)
        .select("id, updated_at")
        .single();

    return { data, error };
}


export async function getTreatmentDefinitions(clinicId: string): Promise<TreatmentDefinition[]> {
    if (!clinicId) return [];
    const { data, error } = await supabase
        .from("treatment_definitions")
        .select("id, clinic_id, name, default_duration, color, created_at, updated_at")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });

    if (error) {
        console.error("getTreatmentDefinitions error:", error);
        return [];
    }
    return data || [];
}

export async function upsertTreatmentDefinition(clinicId: string, definition: Partial<TreatmentDefinition>) {
    if (!clinicId) return { error: "Clinic ID is required" };

    const { data, error } = await supabase
        .from("treatment_definitions")
        .upsert({ ...definition, clinic_id: clinicId })
        .select("id, name")
        .single();

    return { data, error };
}

export async function deleteTreatmentDefinition(id: string, clinicId: string) {
    const { error } = await supabase
        .from("treatment_definitions")
        .delete()
        .eq("id", id)
        .eq("clinic_id", clinicId);

    return { error };
}
