import { supabase } from "@/lib/supabaseClient";
import { UserRole, Payment, AppointmentStatus, AppointmentChannel, ClinicSettings, TreatmentDefinition, TreatmentPlan, TreatmentPlanItem, PatientAnamnesis } from "@/types/database";

// ─── Inline types ──────────────────────────────────────────────────────────────

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

// ─── JOIN-based appointment row (single query) ─────────────────────────────────

interface JoinedAppointmentRow {
    id: string;
    starts_at: string;
    ends_at: string;
    patient_id: string;
    doctor_id: string | null;
    channel: AppointmentChannel | null;
    treatment_type: string | null;
    status: AppointmentStatus;
    patient_note: string | null;
    internal_note: string | null;
    treatment_note: string | null;
    tags: string[] | null;
    source_conversation_id: string | null;
    source_message_id: string | null;
    estimated_amount: number | null;
    patient: { full_name: string; phone: string | null; email: string | null; birth_date: string | null; allergies: string | null; medical_alerts: string | null } | { full_name: string; phone: string | null; email: string | null; birth_date: string | null; allergies: string | null; medical_alerts: string | null }[] | null;
    doctor: { full_name: string } | { full_name: string }[] | null;
}

// ─── API functions ──────────────────────────────────────────────────────────────

export async function getClinicBySlug(slug: string) {
    const { data } = await supabase.from("clinics").select("id, name, slug").eq("slug", slug).maybeSingle();
    return data;
}

export async function getAppointmentsForDate(date: string, clinicId: string): Promise<CalendarAppointment[]> {
    if (!clinicId) return [];

    // N+1 fix: tek SELECT sorgusuyla randevu + hasta + hekim verisi çekiliyor
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id, starts_at, ends_at, patient_id, doctor_id, channel, treatment_type, status,
            patient_note, internal_note, treatment_note, tags, source_conversation_id,
            source_message_id, estimated_amount,
            patient:patients!patient_id(
                full_name, phone, email, birth_date, allergies, medical_alerts
            ),
            doctor:users!doctor_id(full_name)
        `)
        .eq("clinic_id", clinicId)
        .gte("starts_at", `${date}T00:00:00+03:00`)
        .lte("starts_at", `${date}T23:59:59+03:00`)
        .order("starts_at", { ascending: true });

    if (error || !data) {
        console.error("getAppointmentsForDate error:", error);
        return [];
    }

    // Formatter'ları döngü dışında bir kez oluştur
    const timeFmt = new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Asia/Istanbul",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    });
    const dateFmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return (data as unknown as JoinedAppointmentRow[]).map((row): CalendarAppointment => {
        const startDate = new Date(row.starts_at);
        const endDate   = new Date(row.ends_at);
        const durationMinutes = Math.max(10, Math.round((endDate.getTime() - startDate.getTime()) / 60000) || 30);

        const patient = Array.isArray(row.patient) ? row.patient[0] ?? null : row.patient;
        const doctor  = Array.isArray(row.doctor)  ? row.doctor[0]  ?? null : row.doctor;

        const trTime = timeFmt.formatToParts(startDate);
        const hour   = parseInt(trTime.find((p) => p.type === "hour")?.value   ?? "0");
        const minute = parseInt(trTime.find((p) => p.type === "minute")?.value ?? "0");

        const localDate = dateFmt.format(startDate);

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
            doctor: doctor?.full_name ?? "",
            doctorId: row.doctor_id,
            channel: row.channel ?? "",
            treatmentType: row.treatment_type ?? "",
            status: row.status,
            dbStatus: row.status,
            patientNote: row.patient_note ?? undefined,
            internalNote: row.internal_note ?? undefined,
            treatmentNote: row.treatment_note ?? undefined,
            patientAllergies: patient?.allergies ?? undefined,
            patientMedicalAlerts: patient?.medical_alerts ?? undefined,
            tags: row.tags ?? [],
            sourceConversationId: row.source_conversation_id ?? undefined,
            sourceMessageId: row.source_message_id ?? undefined,
            estimatedAmount: row.estimated_amount?.toString(),
            patientId: row.patient_id,
        };
    });
}

export async function getDoctors(clinicId: string) {
    if (!clinicId) return [];
    const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("clinic_id", clinicId)
        .eq("role", UserRole.DOKTOR);
    return (data ?? []) as { id: string; full_name: string }[];
}

export async function getAllPatients(clinicId: string, page: number = 1, pageSize: number = 50, search?: string) {
    if (!clinicId) return [];
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let query = supabase
        .from("patients")
        .select("id, full_name, phone, email, birth_date, tc_identity_no, gender, blood_group, address, occupation, allergies, medical_alerts, notes, created_at")
        .eq("clinic_id", clinicId);

    if (search && search.trim().length >= 2) {
        const term = search.trim();
        query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("getAllPatients error:", error);
        return [];
    }
    return data ?? [];
}

interface DashboardAppointmentRow {
    id: string;
    starts_at: string;
    ends_at: string;
    patient_id: string;
    doctor_id: string | null;
    channel: AppointmentChannel;
    status: AppointmentStatus;
    treatment_type: string | null;
    estimated_amount: number | null;
    patients: { full_name: string; phone: string | null } | null;
    doctor: { full_name: string } | null;
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

    return (data as unknown as DashboardAppointmentRow[]).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        patientName: row.patients?.full_name ?? "İsimsiz Hasta",
        patientPhone: row.patients?.phone ?? null,
        doctorName: row.doctor?.full_name ?? "Hekim atanmadı",
        doctorId: row.doctor_id,
        channel: row.channel,
        status: row.status,
        treatmentType: row.treatment_type ?? null,
        estimatedAmount: row.estimated_amount !== null ? Number(row.estimated_amount) : null,
    }));
}

interface ChecklistItemRow {
    id: string;
    status: string;
    appointment_id: string;
    definition_id: string;
    appointments: {
        id: string;
        starts_at: string;
        ends_at: string;
        treatment_type: string | null;
        status: AppointmentStatus;
        clinic_id: string;
        patient_id: string;
        estimated_amount: number | null;
        patients: { full_name: string };
    };
    checklist_definitions: { code: string; title: string; tone: string };
}

export async function getChecklistItems(clinicId: string, date: string) {
    if (!clinicId) return [];

    const { error: rpcError } = await supabase.rpc("refresh_checklist_items", { p_clinic_id: clinicId });
    if (rpcError) console.error("refresh_checklist_items rpc error:", rpcError);

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

    return (data as unknown as ChecklistItemRow[]).map((row) => ({
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
        appointmentStatus: row.appointments.status,
    }));
}

export async function updateChecklistItemStatus(itemId: string, status: string, clinicId: string) {
    const { error } = await supabase
        .from("checklist_items")
        .update({
            status,
            completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", itemId)
        .eq("clinic_id", clinicId);
    return { error };
}

export async function getChecklistConfigs(clinicId: string) {
    const [defsRes, rolesRes] = await Promise.all([
        supabase.from("checklist_definitions").select("id, code, title, tone"),
        supabase.from("checklist_clinic_roles").select("definition_id, role").eq("clinic_id", clinicId),
    ]);

    const mapping: Record<string, { roles: string[]; enabled: boolean }> = {};

    defsRes.data?.forEach((def) => {
        const rolesForDef = rolesRes.data?.filter((r) => r.definition_id === def.id).map((r) => r.role) ?? [];
        mapping[def.code] = { roles: rolesForDef, enabled: true };
    });

    return mapping;
}

export async function getTaskConfigs(clinicId: string) {
    const configs = await getChecklistConfigs(clinicId);
    const legacyMapping: Record<string, { role: string; enabled: boolean }> = {};
    Object.entries(configs).forEach(([code, data]) => {
        legacyMapping[code] = { role: data.roles[0] ?? "", enabled: data.roles.length > 0 };
    });
    return legacyMapping;
}

function generateReceiptBase(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `FIS-${y}${m}${d}-${rand}`;
}

export async function createPayments(payments: Partial<Payment>[]) {
    // Taksitli ödemelerde aynı baz numarayı paylaşır: FIS-YYYYMMDD-XXXX-1, -2, -3...
    // Tek ödeme ise suffix olmadan kullanılır: FIS-YYYYMMDD-XXXX
    const base = generateReceiptBase();
    const isMulti = payments.length > 1;
    const { data, error } = await supabase
        .from("payments")
        .insert(payments.map((p, i) => ({
            ...p,
            clinic_id: p.clinic_id ?? payments[0]?.clinic_id,
            receipt_number: p.receipt_number ?? (isMulti ? `${base}-${i + 1}` : base),
        })))
        .select("id, amount, status");
    return { data, error };
}

export async function getPaymentsForAppointments(appointmentIds: string[]) {
    if (!appointmentIds.length) return {};
    const { data } = await supabase
        .from("payments")
        .select("id, appointment_id")
        .in("appointment_id", appointmentIds);
    return Object.fromEntries((data ?? []).map((p: { appointment_id: string }) => [p.appointment_id, true]));
}

interface PatientAppointmentRow {
    id: string;
    starts_at: string;
    ends_at: string;
    status: AppointmentStatus;
    treatment_type: string | null;
    doctor: { full_name: string } | { full_name: string }[] | null;
    patient_note: string | null;
    internal_note: string | null;
    treatment_note: string | null;
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
        appointments: ((apptRes.data ?? []) as PatientAppointmentRow[]).map((row) => {
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
        payments: ((payRes.data ?? []) as Partial<Payment>[]).map((row) => ({
            id: row.id!,
            amount: Number(row.amount),
            method: row.method ?? null,
            status: row.status ?? null,
            due_date: row.due_date ?? null,
            appointment_id: row.appointment_id ?? null,
            installment_count: row.installment_count ?? null,
            installment_number: row.installment_number ?? null,
            parent_payment_id: row.parent_payment_id ?? null,
        })),
    };
}

interface TodayPaymentRow {
    id: string;
    amount: number;
    status: string | null;
    due_date: string | null;
    patient_id: string;
    appointment_id: string;
    patients: { full_name: string; phone: string | null } | null;
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

    return (data as unknown as TodayPaymentRow[]).map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        status: row.status,
        dueDate: row.due_date,
        patientName: row.patients?.full_name ?? "İsimsiz",
        patientPhone: row.patients?.phone ?? null,
        patientId: row.patient_id,
        appointmentId: row.appointment_id,
    }));
}

export async function getClinicSettings(clinicId: string): Promise<ClinicSettings | null> {
    if (!clinicId) return null;
    const { data, error } = await supabase
        .from("clinic_settings")
        .select("id, clinic_id, message_templates, notification_settings, assistant_timings, appointment_channels, created_at, updated_at")
        .eq("clinic_id", clinicId)
        .maybeSingle();

    if (error) {
        console.error("getClinicSettings error:", error);
        return null;
    }
    if (data && !data.appointment_channels) data.appointment_channels = [];
    return data;
}

export async function updateClinicSettings(clinicId: string, settings: Partial<ClinicSettings>) {
    if (!clinicId) return { error: "Clinic ID is required" };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, clinic_id: _cid, created_at: _ca, updated_at: _ua, ...updateData } = settings as ClinicSettings & { id?: string };

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
        .select("id, clinic_id, name, default_duration, color, material_cost, doctor_prim_percent, recall_interval_days, created_at, updated_at")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });

    if (error) {
        console.error("getTreatmentDefinitions error:", error);
        return [];
    }
    return data ?? [];
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

// ─── Treatment Plans ────────────────────────────────────────────────────────

export interface TreatmentPlanItemWithDoctor extends TreatmentPlanItem {
    assigned_doctor?: { full_name: string } | null;
}

export interface TreatmentPlanWithItems extends TreatmentPlan {
    items: TreatmentPlanItemWithDoctor[];
    patient?: { full_name: string; phone: string | null };
    doctor?: { full_name: string } | null;
}

export async function getTreatmentPlans(clinicId: string, patientId?: string): Promise<TreatmentPlanWithItems[]> {
    if (!clinicId) return [];
    let query = supabase
        .from("treatment_plans")
        .select(`
            id, clinic_id, patient_id, appointment_id, next_appointment_id,
            doctor_id, created_by, status, title, note, total_estimated_amount,
            created_at, updated_at,
            patient:patients(full_name, phone),
            doctor:users!doctor_id(full_name),
            items:treatment_plan_items(
                id, clinic_id, treatment_plan_id, patient_id, tooth_no,
                procedure_name, description, quantity, unit_price, total_price,
                assigned_doctor_id, status, sort_order, created_at, updated_at,
                assigned_doctor:users!assigned_doctor_id(full_name)
            )
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

    if (patientId) query = query.eq("patient_id", patientId);

    const { data, error } = await query;
    if (error) { console.error("getTreatmentPlans error:", error); return []; }

    return (data ?? []).map((plan) => ({
        ...plan,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patient: Array.isArray(plan.patient) ? plan.patient[0] : (plan.patient as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doctor: Array.isArray(plan.doctor) ? plan.doctor[0] : (plan.doctor as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: ((plan.items as any[]) ?? []).map((item: any) => ({
            ...item,
            assigned_doctor: Array.isArray(item.assigned_doctor) ? item.assigned_doctor[0] ?? null : item.assigned_doctor ?? null,
        })).sort((a: TreatmentPlanItem, b: TreatmentPlanItem) => a.sort_order - b.sort_order),
    })) as TreatmentPlanWithItems[];
}

export async function createTreatmentPlan(
    clinicId: string,
    plan: {
        patient_id: string;
        appointment_id?: string | null;
        doctor_id?: string | null;
        created_by?: string | null;
        status?: TreatmentPlan["status"];
        title?: string | null;
        note?: string | null;
        total_estimated_amount?: number | null;
    }
): Promise<{ data: TreatmentPlan | null; error: unknown }> {
    const { data, error } = await supabase
        .from("treatment_plans")
        .insert({ ...plan, clinic_id: clinicId, status: plan.status ?? "planned" })
        .select("id, clinic_id, patient_id, appointment_id, next_appointment_id, doctor_id, created_by, status, title, note, total_estimated_amount, created_at, updated_at")
        .single();
    return { data, error };
}

export async function updateTreatmentPlan(
    id: string,
    clinicId: string,
    updates: Partial<Pick<TreatmentPlan, "status" | "title" | "note" | "total_estimated_amount" | "next_appointment_id">>
): Promise<{ error: unknown }> {
    const { error } = await supabase
        .from("treatment_plans")
        .update(updates)
        .eq("id", id)
        .eq("clinic_id", clinicId);
    return { error };
}

export async function deleteTreatmentPlan(id: string, clinicId: string): Promise<{ error: unknown }> {
    const { error } = await supabase
        .from("treatment_plans")
        .delete()
        .eq("id", id)
        .eq("clinic_id", clinicId);
    return { error };
}

export async function upsertTreatmentPlanItem(
    clinicId: string,
    item: Omit<Partial<TreatmentPlanItem>, "total_price" | "created_at" | "updated_at"> & {
        treatment_plan_id: string;
        patient_id: string;
        procedure_name: string;
        quantity: number;
        unit_price: number;
    }
): Promise<{ data: TreatmentPlanItem | null; error: unknown }> {
    const { data, error } = await supabase
        .from("treatment_plan_items")
        // total_price: DB'de GENERATED ALWAYS AS (quantity * unit_price) — elle yazılmaz
        .upsert({ ...item, clinic_id: clinicId })
        .select("id, clinic_id, treatment_plan_id, patient_id, tooth_no, procedure_name, description, quantity, unit_price, total_price, assigned_doctor_id, status, sort_order, created_at, updated_at")
        .single();
    return { data, error };
}

export async function deleteTreatmentPlanItem(id: string, clinicId: string): Promise<{ error: unknown }> {
    const { error } = await supabase
        .from("treatment_plan_items")
        .delete()
        .eq("id", id)
        .eq("clinic_id", clinicId);
    return { error };
}

/** Tedavi planı + isteğe bağlı sonraki randevuyu tek seferde oluşturur */
export async function createTreatmentPlanWithAppointment(
    clinicId: string,
    plan: {
        patient_id: string;
        appointment_id?: string | null;
        doctor_id?: string | null;
        created_by?: string | null;
        title?: string | null;
        note?: string | null;
        total_estimated_amount?: number | null;
        items: Array<{
            procedure_name: string;
            tooth_no?: string | null;
            description?: string | null;
            quantity: number;
            unit_price: number;
            assigned_doctor_id?: string | null;
            sort_order?: number;
        }>;
    },
    nextAppointment?: {
        starts_at: string;       // ISO string
        ends_at: string;
        treatment_type?: string | null;
        doctor_id?: string | null;
        channel?: AppointmentChannel;
    } | null
): Promise<{ planId: string | null; appointmentId: string | null; error: unknown }> {
    // 1. Planı oluştur
    const { data: planData, error: planError } = await createTreatmentPlan(clinicId, {
        patient_id: plan.patient_id,
        appointment_id: plan.appointment_id ?? null,
        doctor_id: plan.doctor_id ?? null,
        created_by: plan.created_by ?? null,
        title: plan.title ?? null,
        note: plan.note ?? null,
        total_estimated_amount: plan.total_estimated_amount ?? null,
        status: "planned",
    });

    if (planError || !planData) return { planId: null, appointmentId: null, error: planError };

    // 2. Plan itemlarını ekle
    if (plan.items.length > 0) {
        const itemRows = plan.items.map((item, idx) => ({
            clinic_id: clinicId,
            treatment_plan_id: planData.id,
            patient_id: plan.patient_id,
            procedure_name: item.procedure_name,
            tooth_no: item.tooth_no ?? null,
            description: item.description ?? null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            // total_price: DB'de GENERATED ALWAYS AS (quantity * unit_price) — elle yazılmaz
            assigned_doctor_id: item.assigned_doctor_id ?? null,
            sort_order: item.sort_order ?? idx,
            status: "planned",
        }));

        const { error: itemsError } = await supabase.from("treatment_plan_items").insert(itemRows);
        if (itemsError) return { planId: planData.id, appointmentId: null, error: itemsError };
    }

    // 3. Sonraki randevuyu oluştur (isteğe bağlı)
    let appointmentId: string | null = null;
    if (nextAppointment) {
        const { data: apptData, error: apptError } = await supabase
            .from("appointments")
            .insert({
                clinic_id: clinicId,
                patient_id: plan.patient_id,
                doctor_id: nextAppointment.doctor_id ?? plan.doctor_id ?? null,
                starts_at: nextAppointment.starts_at,
                ends_at: nextAppointment.ends_at,
                treatment_type: nextAppointment.treatment_type ?? null,
                channel: nextAppointment.channel ?? "phone",
                status: "confirmed",
            })
            .select("id")
            .single();

        if (apptError) return { planId: planData.id, appointmentId: null, error: apptError };
        appointmentId = apptData?.id ?? null;

        // Planı next_appointment_id ile güncelle
        if (appointmentId) {
            await supabase
                .from("treatment_plans")
                .update({ next_appointment_id: appointmentId })
                .eq("id", planData.id)
                .eq("clinic_id", clinicId);
        }
    }

    return { planId: planData.id, appointmentId, error: null };
}

// ─── Dental Chart ─────────────────────────────────────────────────────────────

import type { DentalChart, TeethData } from "@/types/database";

export async function getDentalChart(
    patientId: string,
    clinicId: string
): Promise<DentalChart | null> {
    if (!patientId || !clinicId) return null;
    const { data, error } = await supabase
        .from("dental_charts")
        .select("id, clinic_id, patient_id, teeth_data, updated_at, updated_by")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .maybeSingle();
    if (error) {
        console.error("getDentalChart error:", error);
        return null;
    }
    return data as DentalChart | null;
}

export async function saveDentalChart(
    patientId: string,
    clinicId: string,
    updatedBy: string,
    teethData: TeethData
): Promise<{ data: DentalChart | null; error: unknown }> {
    const { data, error } = await supabase
        .from("dental_charts")
        .upsert(
            {
                patient_id: patientId,
                clinic_id: clinicId,
                updated_by: updatedBy,
                teeth_data: teethData,
            },
            { onConflict: "clinic_id,patient_id" }
        )
        .select("id, clinic_id, patient_id, teeth_data, updated_at, updated_by")
        .single();
    return { data: data as DentalChart | null, error };
}

// ─── Patient Anamnesis ─────────────────────────────────────────────────────────

export async function getAnamnesis(
    patientId: string,
    clinicId: string
): Promise<PatientAnamnesis | null> {
    if (!patientId || !clinicId) return null;
    const { data, error } = await supabase
        .from("patient_anamnesis")
        .select("*")
        .eq("patient_id", patientId)
        .eq("clinic_id", clinicId)
        .maybeSingle();
    if (error) {
        console.error("getAnamnesis error:", error);
        return null;
    }
    return data as PatientAnamnesis | null;
}

export async function saveAnamnesis(
    patientId: string,
    clinicId: string,
    updatedBy: string,
    anamnesis: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">
): Promise<{ data: PatientAnamnesis | null; error: unknown }> {
    const { data, error } = await supabase
        .from("patient_anamnesis")
        .upsert(
            {
                patient_id: patientId,
                clinic_id: clinicId,
                updated_by: updatedBy,
                ...anamnesis,
            },
            { onConflict: "clinic_id,patient_id" }
        )
        .select("*")
        .single();

    // Geriye dönük uyumluluk: patients.allergies ve medical_alerts alanlarını güncelle
    if (!error) {
        const allergyText = [
            ...(anamnesis.allergies_list ?? []),
            anamnesis.allergies_other,
        ].filter(Boolean).join(", ");
        const conditionText = [
            ...(anamnesis.systemic_conditions ?? []),
            anamnesis.systemic_other,
        ].filter(Boolean).join(", ");
        await supabase
            .from("patients")
            .update({
                allergies: allergyText || null,
                medical_alerts: conditionText || null,
            })
            .eq("id", patientId)
            .eq("clinic_id", clinicId);
    }

    return { data: data as PatientAnamnesis | null, error };
}
