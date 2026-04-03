import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllPatients, getPatientDetails } from "@/lib/api";
import { patientSchema, updatePatientSchema, toPatientDbPayload } from "@/lib/validations/patient";
import type { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export type PatientRow = {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    birth_date: string | null;
    tc_identity_no: string | null;
    gender: string | null;
    blood_group: string | null;
    address: string | null;
    occupation: string | null;
    allergies: string | null;
    medical_alerts: string | null;
    notes: string | null;
    created_at: string;
};

export type PatientAppointment = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    treatment_type: string | null;
    doctor_name: string | null;
    patient_note: string | null;
    internal_note: string | null;
    treatment_note: string | null;
};

export type PatientPayment = {
    id: string;
    amount: number;
    method: string | null;
    status: string | null;
    due_date: string | null;
    appointment_id: string | null;
    installment_count: number | null;
    installment_number: number | null;
    parent_payment_id: string | null;
};

const PAGE_SIZE = 50;

export function usePatients() {
    const queryClient = useQueryClient();
    const clinic = useClinic();
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Total count (for stats card)
    const { data: totalCount = 0 } = useQuery({
        queryKey: ["patientsCount", clinic.clinicId],
        queryFn: async () => {
            const { count } = await supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.clinicId!);
            return count ?? 0;
        },
        enabled: !!clinic.clinicId,
        staleTime: 5 * 60 * 1000, // 5 dakika
    });

    // Fetch Patients — server-side search + pagination (50 per page)
    const debouncedSearch = search.trim();
    const { data: patientsData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ["patients", clinic.clinicId, debouncedSearch, currentPage],
        queryFn: () => getAllPatients(clinic.clinicId || "", currentPage, PAGE_SIZE, debouncedSearch || undefined),
        enabled: !!clinic.clinicId,
        staleTime: 5 * 60 * 1000, // 5 dakika
        placeholderData: (prev) => prev,
    });

    const patients = patientsData || [];

    const error = queryError ? (queryError as Error).message : null;

    // Fetch Patient Details (Appointments & Payments)
    const { data: detailData, isLoading: appointmentsLoading } = useQuery({
        queryKey: ["patientDetails", selectedPatientId],
        queryFn: () => getPatientDetails(selectedPatientId!),
        enabled: !!selectedPatientId,
        staleTime: 2 * 60 * 1000,
    });

    // Mevcut listede hasta varsa DB round-trip'ten kaçın
    const patientInList = useMemo(
        () => patients.find((p: PatientRow) => p.id === selectedPatientId) ?? null,
        [patients, selectedPatientId]
    );

    // Fetch Patient Row — sadece hasta aktif listede yoksa çek
    const { data: fetchedPatientRow } = useQuery({
        queryKey: ["patient-row", selectedPatientId],
        queryFn: async () => {
            const { data, error } = await supabase.from("patients").select("*").eq("id", selectedPatientId!).single();
            if (error) throw error;
            return data as PatientRow;
        },
        enabled: !!selectedPatientId && !patientInList,
        staleTime: 5 * 60 * 1000,
    });

    const appointments = detailData?.appointments || [];
    const payments = detailData?.payments || [];

    const selectedPatient = useMemo(() => {
        if (!selectedPatientId) return null;
        if (fetchedPatientRow) return fetchedPatientRow;
        return patientInList;
    }, [selectedPatientId, fetchedPatientRow, patientInList]);

    // Use current search/page results
    const filteredPatients = patients;

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const currentPagePatients = filteredPatients;

    const handleSelectPatient = (patient: PatientRow) => {
        setSelectedPatientId(patient.id);
        setDetailOpen(true);
    };

    const downloadPatientsCsv = () => {
        const escape = (v: string | null | undefined) => {
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return /[",\n\r]/.test(s) ? `"${s}"` : s;
        };
        const rows = [
            ["Ad Soyad", "Telefon", "E-posta", "Doğum Tarihi", "TC Kimlik No", "Cinsiyet", "Kan Grubu", "Adres", "Meslek", "Notlar", "Alerjiler", "Tıbbi Uyarılar", "Kayıt Tarihi"],
            ...filteredPatients.map((p: PatientRow) => [
                escape(p.full_name), escape(p.phone), escape(p.email),
                escape(p.birth_date ? p.birth_date.slice(0, 10) : null),
                escape(p.tc_identity_no), escape(p.gender), escape(p.blood_group),
                escape(p.address), escape(p.occupation), escape(p.notes),
                escape(p.allergies), escape(p.medical_alerts),
                escape(p.created_at ? p.created_at.slice(0, 10) : null),
            ]),
        ];
        const csv = rows.map((r) => r.join(";")).join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(clinic.clinicName || "Klinik").replace(/\s+/g, "_")}_Hastalar.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const createPatient = async (data: z.infer<typeof patientSchema>) => {
        if (!clinic.clinicId) return false;
        const validation = patientSchema.safeParse(data);
        if (!validation.success) {
            toast.error("Geçersiz bilgiler: " + validation.error.issues[0].message);
            return false;
        }
        const payload = toPatientDbPayload(validation.data);
        const { error } = await supabase.from("patients").insert({ ...payload, clinic_id: clinic.clinicId });
        if (error) {
            Sentry.captureException(error, { tags: { section: "patients", action: "create" } });
            toast.error(error.message);
            return false;
        }
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        queryClient.invalidateQueries({ queryKey: ["patientsCount"] });
        return true;
    };

    const deletePatient = async (id: string) => {
        if (!clinic.clinicId) return false;
        const { error } = await supabase.from("patients").delete().eq("id", id).eq("clinic_id", clinic.clinicId);
        if (error) {
            Sentry.captureException(error, { tags: { section: "patients", action: "delete" } });
            toast.error(error.message);
            return false;
        }
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        setDetailOpen(false);
        return true;
    };

    const updatePatient = async (id: string, updates: Partial<PatientRow>) => {
        if (!clinic.clinicId) return false;
        const validation = updatePatientSchema.safeParse(updates);
        if (!validation.success) {
            toast.error("Yeni bilgiler geçersiz: " + validation.error.issues[0].message);
            return false;
        }

        const { error } = await supabase.from("patients").update(toPatientDbPayload(validation.data as Parameters<typeof toPatientDbPayload>[0])).eq("id", id).eq("clinic_id", clinic.clinicId);
        if (error) {
            Sentry.captureException(error, { tags: { section: "patients", action: "update" } });
            toast.error(error.message);
            return false;
        }
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        queryClient.invalidateQueries({ queryKey: ["patientDetails", id] });
        return true;
    };

    return {
        loading, error, search, setSearch, currentPage, setCurrentPage, selectedPatient,
        appointments, payments, appointmentsLoading, detailOpen, setDetailOpen,
        patients, filteredPatients, totalPages, currentPagePatients, handleSelectPatient,
        downloadPatientsCsv, createPatient, deletePatient, updatePatient, totalCount,
        isAdmin: clinic.userRole === UserRole.ADMIN || clinic.userRole === UserRole.SUPER_ADMIN
    };
}
