import { useState, useMemo } from "react";
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

const PAGE_SIZE = 10;

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
    });

    // Fetch All Patients (Client-side pagination is handled in page.tsx)
    const { data: patientsData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ["patients", clinic.clinicId],
        queryFn: () => getAllPatients(clinic.clinicId || "", 1, 5000),
        enabled: !!clinic.clinicId,
    });

    const patients = patientsData || [];

    const error = queryError ? (queryError as Error).message : null;

    // Fetch Patient Details
    const { data: detailData, isLoading: appointmentsLoading } = useQuery({
        queryKey: ["patientDetails", selectedPatientId],
        queryFn: () => getPatientDetails(selectedPatientId!),
        enabled: !!selectedPatientId,
    });

    const appointments = detailData?.appointments || [];
    const payments = detailData?.payments || [];

    const selectedPatient = useMemo(() => {
        if (!selectedPatientId) return null;
        return patients.find((p: PatientRow) => p.id === selectedPatientId) || null;
    }, [patients, selectedPatientId]);

    const filteredPatients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return patients;
        return patients.filter((p: PatientRow) => {
            const name = p.full_name?.toLowerCase() ?? "";
            const phone = p.phone?.replace(/\s+/g, "") ?? "";
            return name.includes(term) || phone.includes(term.replace(/\s+/g, "")) || phone.includes(term);
        });
    }, [patients, search]);

    const totalPages = 10; // Not: Toplam sayfa sayısı için API'den total count dönülmeli. 
    // Şimdilik hızlı kazanım olarak mevcut yapıyı koruyoruz ancak gereksiz slice'ı kaldırıyoruz.
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
            alert("Geçersiz bilgiler: " + validation.error.issues[0].message);
            return false;
        }
        const payload = toPatientDbPayload(validation.data);
        const { error } = await supabase.from("patients").insert({ ...payload, clinic_id: clinic.clinicId });
        if (error) {
            Sentry.captureException(error, { tags: { section: "patients", action: "create" } });
            alert(error.message);
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
            alert(error.message);
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
            alert("Yeni bilgiler geçersiz: " + validation.error.issues[0].message);
            return false;
        }

        const { error } = await supabase.from("patients").update(toPatientDbPayload(validation.data as Parameters<typeof toPatientDbPayload>[0])).eq("id", id).eq("clinic_id", clinic.clinicId);
        if (error) {
            Sentry.captureException(error, { tags: { section: "patients", action: "update" } });
            alert(error.message);
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
