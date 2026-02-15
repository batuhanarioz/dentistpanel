import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";

export type PatientRow = {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    birth_date: string | null;
    tc_identity_no: string | null;
    allergies: string | null;
    medical_alerts: string | null;
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
};

const PAGE_SIZE = 10;

export function usePatients() {
    const clinic = useClinic();
    const [patients, setPatients] = useState<PatientRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
    const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
    const [payments, setPayments] = useState<PatientPayment[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);

    useEffect(() => {
        const loadPatients = async () => {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from("patients")
                .select("id, full_name, phone, email, birth_date, tc_identity_no, allergies, medical_alerts, created_at")
                .order("created_at", { ascending: false });

            if (error) {
                setError(error.message || "Hastalar yüklenemedi.");
                setLoading(false);
                return;
            }
            setPatients(data || []);
            setLoading(false);
        };
        loadPatients();
    }, []);

    useEffect(() => {
        const loadPatientDetail = async () => {
            if (!selectedPatient) {
                setAppointments([]);
                setPayments([]);
                return;
            }
            setAppointmentsLoading(true);
            const [apptRes, payRes] = await Promise.all([
                supabase.from("appointments").select("id, starts_at, ends_at, status, treatment_type, doctor:doctor_id(full_name), patient_note, internal_note, treatment_note").eq("patient_id", selectedPatient.id).order("starts_at", { ascending: false }),
                supabase.from("payments").select("id, amount, method, status, due_date").eq("patient_id", selectedPatient.id).order("due_date", { ascending: false }),
            ]);

            setAppointments((apptRes.data || []).map((row: any) => ({
                id: row.id,
                starts_at: row.starts_at,
                ends_at: row.ends_at,
                status: row.status,
                treatment_type: row.treatment_type,
                doctor_name: row.doctor?.full_name ?? null,
                patient_note: row.patient_note,
                internal_note: row.internal_note,
                treatment_note: row.treatment_note,
            })));
            setPayments((payRes.data || []).map((row: any) => ({
                id: row.id,
                amount: Number(row.amount),
                method: row.method,
                status: row.status,
                due_date: row.due_date,
            })));
            setAppointmentsLoading(false);
        };
        loadPatientDetail();
    }, [selectedPatient]);

    const filteredPatients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return patients;
        return patients.filter((p) => {
            const name = p.full_name?.toLowerCase() ?? "";
            const phone = p.phone?.replace(/\s+/g, "") ?? "";
            return name.includes(term) || phone.includes(term.replace(/\s+/g, "")) || phone.includes(term);
        });
    }, [patients, search]);

    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
    const currentPagePatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleSelectPatient = (patient: PatientRow) => {
        setSelectedPatient(patient);
        setDetailOpen(true);
    };

    const downloadPatientsCsv = () => {
        const escape = (v: string | null | undefined) => {
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return /[",\n\r]/.test(s) ? `"${s}"` : s;
        };
        const rows = [
            ["Ad Soyad", "Telefon", "E-posta", "Doğum Tarihi", "TC Kimlik No", "Alerjiler", "Tıbbi Uyarılar", "Kayıt Tarihi"],
            ...filteredPatients.map((p) => [
                escape(p.full_name), escape(p.phone), escape(p.email),
                escape(p.birth_date ? p.birth_date.slice(0, 10) : null),
                escape(p.tc_identity_no), escape(p.allergies), escape(p.medical_alerts),
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

    const deletePatient = async (id: string) => {
        const { error } = await supabase.from("patients").delete().eq("id", id);
        if (error) {
            setError(error.message);
            return false;
        }
        setPatients(prev => prev.filter(p => p.id !== id));
        setDetailOpen(false);
        return true;
    };

    const updatePatient = async (id: string, updates: Partial<PatientRow>) => {
        const { error } = await supabase.from("patients").update(updates).eq("id", id);
        if (error) {
            setError(error.message);
            return false;
        }
        setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        if (selectedPatient?.id === id) {
            setSelectedPatient(prev => prev ? { ...prev, ...updates } : null);
        }
        return true;
    };

    return {
        loading, error, search, setSearch, currentPage, setCurrentPage, selectedPatient,
        appointments, payments, appointmentsLoading, detailOpen, setDetailOpen,
        patients, filteredPatients, totalPages, currentPagePatients, handleSelectPatient,
        downloadPatientsCsv, deletePatient, updatePatient,
        isAdmin: clinic.userRole === UserRole.ADMIN || clinic.userRole === UserRole.SUPER_ADMIN
    };
}
