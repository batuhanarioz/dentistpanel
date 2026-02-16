import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { Appointment } from "@/types/database";
import { paymentSchema, updatePaymentSchema } from "@/lib/validations/payment";
import * as Sentry from "@sentry/nextjs";

export type Patient = { id: string; full_name: string; phone: string | null; };
export type AppointmentOption = { id: string; starts_at: string; treatment_type: string | null; patient_id: string; patient_full_name: string; patient_phone: string | null; };
export type PaymentRow = { id: string; amount: number; method: string | null; status: string | null; note: string | null; due_date: string | null; patient: { full_name: string | null; phone: string | null; } | null; };

export function usePaymentManagement(appointmentIdParam: string | null) {
    const today = useMemo(() => localDateStr(), []);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [listSearch, setListSearch] = useState("");
    const [modalPatientSearch, setModalPatientSearch] = useState("");
    const [modalAppointments, setModalAppointments] = useState<AppointmentOption[]>([]);
    const [modalAppointmentsLoading, setModalAppointmentsLoading] = useState(false);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState(today);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<string>("Nakit");
    const [note, setNote] = useState("");
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
    const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailStatus, setDetailStatus] = useState<string>("planned");
    const [detailAmount, setDetailAmount] = useState<string>("");
    const [detailMethod, setDetailMethod] = useState<string>("Nakit");
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (appointmentIdParam && !isModalOpen) {
            setSelectedAppointmentId(appointmentIdParam);
            setIsModalOpen(true);
        }
    }, [appointmentIdParam, isModalOpen]);

    useEffect(() => {
        supabase.from("patients").select("id, full_name, phone").order("full_name", { ascending: true })
            .then(({ data }) => setPatients(data as Patient[] || []));
    }, []);

    const loadPayments = useCallback(async (startDate: string, endDate: string) => {
        setLoading(true);
        const { data, error } = await supabase.from("payments").select("id, amount, method, status, note, due_date, patient:patient_id(full_name, phone)")
            .gte("due_date", startDate).lt("due_date", endDate).order("created_at", { ascending: true });
        if (error) setError(error.message);
        else setPayments((data || []) as unknown as PaymentRow[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        const baseDate = new Date(selectedDate);
        let start = new Date(baseDate); let end = new Date(baseDate);
        if (viewMode === "day") end.setDate(end.getDate() + 1);
        else if (viewMode === "week") {
            const d = baseDate.getDay(); const diff = (d + 6) % 7;
            start.setDate(start.getDate() - diff); end = new Date(start); end.setDate(end.getDate() + 7);
        } else { start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1); end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1); }
        loadPayments(localDateStr(start), localDateStr(end));
    }, [selectedDate, viewMode, loadPayments]);

    useEffect(() => {
        const term = modalPatientSearch.trim().toLowerCase();
        if (!isModalOpen || !term) { setModalAppointments([]); return; }
        const pIds = patients.filter(p => p.full_name?.toLowerCase().includes(term) || p.phone?.includes(term)).map(p => p.id);
        if (pIds.length === 0) { setModalAppointments([]); return; }
        setModalAppointmentsLoading(true);
        supabase.from("appointments").select("id, starts_at, treatment_type, patient_id, patients:patient_id(full_name, phone)").in("patient_id", pIds).order("starts_at", { ascending: true }).limit(30)
            .then(({ data }) => {
                type PaymentModalRow = Pick<Appointment, "id" | "starts_at" | "treatment_type" | "patient_id"> & { patients: { full_name: string; phone: string | null } | null };

                setModalAppointments(((data as unknown as PaymentModalRow[]) || []).map((r) => ({
                    id: r.id, starts_at: r.starts_at, treatment_type: r.treatment_type, patient_id: r.patient_id,
                    patient_full_name: r.patients?.full_name || "Hasta", patient_phone: r.patients?.phone || null
                })));
                setModalAppointmentsLoading(false);
            });
    }, [modalPatientSearch, isModalOpen, patients]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setModalPatientSearch("");
        setSelectedAppointmentId("");
        setAmount("");
        setMethod("Nakit");
        setNote("");
        setError(null);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAppointmentId || !amount) return;
        const appt = modalAppointments.find(a => a.id === selectedAppointmentId);
        if (!appt) return;
        setSaving(true);
        const paymentData = {
            appointment_id: selectedAppointmentId,
            patient_id: appt.patient_id,
            amount: Number(amount),
            method,
            status: "planned",
            note: note || null,
            due_date: selectedDate
        };

        const validation = paymentSchema.safeParse(paymentData);
        if (!validation.success) {
            setError("Ödeme bilgileri geçersiz: " + validation.error.issues[0].message);
            setSaving(false);
            return;
        }

        const { error } = await supabase.from("payments").insert(validation.data);
        if (error) {
            Sentry.captureException(error, { tags: { section: "payments", action: "insert" } });
            setError(error.message);
        }
        else {
            closeModal();
            const baseDate = new Date(selectedDate);
            let start = new Date(baseDate);
            let end = new Date(baseDate);
            if (viewMode === "day") end.setDate(end.getDate() + 1);
            else if (viewMode === "week") {
                const d = baseDate.getDay(); const diff = (d + 6) % 7;
                start.setDate(start.getDate() - diff); end = new Date(start); end.setDate(end.getDate() + 7);
            } else { start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1); end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1); }
            await loadPayments(localDateStr(start), localDateStr(end));
        }
        setSaving(false);
    };

    const handleUpdateStatus = async () => {
        if (!selectedPayment) return;

        const updates = {
            status: detailStatus,
            amount: Number(detailAmount),
            method: detailMethod
        };

        const validation = updatePaymentSchema.safeParse(updates);
        if (!validation.success) {
            alert("Yeni bilgiler geçersiz: " + validation.error.issues[0].message);
            return;
        }

        const { error } = await supabase.from("payments").update(validation.data).eq("id", selectedPayment.id);
        if (!error) {
            setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: detailStatus, amount: Number(detailAmount), method: detailMethod } : p));
            setIsDetailModalOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPayment) return;
        const { error } = await supabase.from("payments").delete().eq("id", selectedPayment.id);
        if (!error) { setPayments(prev => prev.filter(p => p.id !== selectedPayment.id)); setIsDetailModalOpen(false); setIsDeleteConfirmOpen(false); }
    };

    const filteredPayments = useMemo(() => payments.filter(p => {
        const t = listSearch.trim().toLowerCase(); if (!t) return true;
        return p.patient?.full_name?.toLowerCase().includes(t) || p.patient?.phone?.includes(t);
    }), [payments, listSearch]);

    const stats = useMemo(() => {
        const total = filteredPayments.reduce((s, p) => s + p.amount, 0);
        const paid = filteredPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
        const planned = filteredPayments.filter(p => p.status === "planned" || p.status === "partial").reduce((s, p) => s + p.amount, 0);
        return { total, paid, planned, count: filteredPayments.length };
    }, [filteredPayments]);

    const openDetail = (p: PaymentRow) => {
        setSelectedPayment(p); setDetailStatus(p.status || "planned"); setDetailAmount(String(p.amount)); setDetailMethod(p.method || "Nakit"); setIsDetailModalOpen(true);
    };

    return {
        today, patients, listSearch, setListSearch, modalPatientSearch, setModalPatientSearch,
        modalAppointments, modalAppointmentsLoading, selectedAppointmentId, setSelectedAppointmentId,
        selectedDate, setSelectedDate, amount, setAmount, method, setMethod, note, setNote,
        payments, loading, saving, error, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
        viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
        detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
        isDeleteConfirmOpen, setIsDeleteConfirmOpen, filteredPayments, stats,
        handleSave, handleUpdateStatus, handleDelete, openDetail
    };
}
