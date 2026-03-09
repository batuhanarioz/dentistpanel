import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr } from "@/lib/dateUtils";
import { Appointment } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { paymentSchema, updatePaymentSchema } from "@/lib/validations/payment";
import * as Sentry from "@sentry/nextjs";

export type Patient = { id: string; full_name: string; phone: string | null; };
export type AppointmentOption = { id: string; starts_at: string; treatment_type: string | null; patient_id: string; patient_full_name: string; patient_phone: string | null; };
export type PaymentRow = {
    id: string;
    amount: number;
    method: string | null;
    status: string | null;
    note: string | null;
    due_date: string | null;
    patient: { full_name: string | null; phone: string | null; } | null;
    appointment?: { starts_at: string; treatment_type: string | null; } | null;
    installment_count?: number | null;
    installment_number?: number | null;
};

export function usePaymentManagement(appointmentIdParam: string | null) {
    const queryClient = useQueryClient();
    const { clinicId } = useClinic();
    const today = useMemo(() => localDateStr(), []);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [listSearch, setListSearch] = useState("");
    const [modalPatientSearch, setModalPatientSearch] = useState("");
    const [modalAppointments, setModalAppointments] = useState<AppointmentOption[]>([]);
    const [modalAppointmentsLoading, setModalAppointmentsLoading] = useState(false);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState(today);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<string>("Nakit");
    const [status, setStatus] = useState<string>("pending");
    const [note, setNote] = useState("");
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "range">("month");
    const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailStatus, setDetailStatus] = useState<string>("pending");
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
        if (!clinicId) return;
        supabase.from("patients").select("id, full_name, phone")
            .eq("clinic_id", clinicId)
            .order("full_name", { ascending: true })
            .then(({ data }) => setPatients(data as Patient[] || []));
    }, [clinicId]);

    const loadPayments = useCallback(async (startDate: string, endDate: string) => {
        if (!clinicId) return;
        setLoading(true);
        const { data, error } = await supabase.from("payments")
            .select(`
                id, amount, method, status, note, due_date, 
                installment_count, installment_number,
                patient:patient_id(full_name, phone),
                appointment:appointment_id(starts_at, treatment_type)
            `)
            .eq("clinic_id", clinicId)
            .gte("due_date", startDate).lt("due_date", endDate).order("created_at", { ascending: true });
        if (error) setError(error.message);
        else setPayments((data || []) as unknown as PaymentRow[]);
        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        let s = "";
        let e = "";

        if (viewMode === "range") {
            s = startDate;
            // endDate inclusive olması için +1 gün eklemeliyiz sorguda
            const d = new Date(endDate);
            d.setDate(d.getDate() + 1);
            e = localDateStr(d);
        } else {
            const baseDate = new Date(selectedDate);
            let start = new Date(baseDate);
            let end = new Date(baseDate);

            if (viewMode === "day") {
                end.setDate(end.getDate() + 1);
            } else if (viewMode === "week") {
                const d = baseDate.getDay();
                const diff = (d + 6) % 7;
                start.setDate(start.getDate() - diff);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
            } else {
                start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
            }
            s = localDateStr(start);
            e = localDateStr(end);
        }

        loadPayments(s, e);
    }, [selectedDate, viewMode, startDate, endDate, loadPayments]);

    useEffect(() => {
        const term = modalPatientSearch.trim().toLowerCase();
        if (!isModalOpen || !term || !clinicId) {
            if (!selectedAppointmentId) setModalAppointments([]);
            return;
        }
        const pIds = patients.filter(p => p.full_name?.toLowerCase().includes(term) || p.phone?.includes(term)).map(p => p.id);
        if (pIds.length === 0) { setModalAppointments([]); return; }
        setModalAppointmentsLoading(true);
        supabase.from("appointments")
            .select("id, starts_at, treatment_type, patient_id, patients:patient_id(full_name, phone)")
            .eq("clinic_id", clinicId)
            .in("patient_id", pIds).order("starts_at", { ascending: true }).limit(30)
            .then(({ data }) => {
                type PaymentModalRow = Pick<Appointment, "id" | "starts_at" | "treatment_type" | "patient_id"> & { patients: { full_name: string; phone: string | null } | null };

                setModalAppointments(((data as unknown as PaymentModalRow[]) || []).map((r) => ({
                    id: r.id, starts_at: r.starts_at, treatment_type: r.treatment_type, patient_id: r.patient_id,
                    patient_full_name: r.patients?.full_name || "Hasta", patient_phone: r.patients?.phone || null
                })));
                setModalAppointmentsLoading(false);
            });
    }, [modalPatientSearch, isModalOpen, patients, selectedAppointmentId, clinicId]);


    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setModalPatientSearch("");
        setSelectedAppointmentId("");
        setAmount("");
        setMethod("Nakit");
        setStatus("pending");
        setNote("");
        setError(null);
    }, []);

    const handleUpdateStatus = async () => {
        if (!selectedPayment || !clinicId) return;

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

        const { error } = await supabase.from("payments").update(validation.data).eq("id", selectedPayment.id).eq("clinic_id", clinicId);
        if (!error) {
            setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: detailStatus, amount: Number(detailAmount), method: detailMethod } : p));
            setIsDetailModalOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPayment || !clinicId) return;
        // Fiziksel silme yerine durumu "cancelled" yapıyoruz
        const { error } = await supabase.from("payments").update({ status: "cancelled" }).eq("id", selectedPayment.id).eq("clinic_id", clinicId);
        if (!error) {
            setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: "cancelled" } : p));
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["assistantPayments"] });
            setIsDetailModalOpen(false);
            setIsDeleteConfirmOpen(false);
        }
    };

    const filteredPayments = useMemo(() => payments.filter(p => {
        const t = listSearch.trim().toLowerCase(); if (!t) return true;
        return p.patient?.full_name?.toLowerCase().includes(t) || p.patient?.phone?.includes(t);
    }), [payments, listSearch]);

    const stats = useMemo(() => {
        const total = filteredPayments.filter(p => p.status !== 'cancelled' && p.status !== 'İptal').reduce((s, p) => s + p.amount, 0);
        const paid = filteredPayments.filter(p => p.status === "paid" || p.status === "Ödendi").reduce((s, p) => s + p.amount, 0);
        const planned = filteredPayments.filter(p => p.status === "pending" || p.status === "partial" || p.status === "Beklemede" || p.status === "planned" || p.status === "Kısmi").reduce((s, p) => s + p.amount, 0);
        return { total, paid, planned, count: filteredPayments.filter(p => p.status !== 'cancelled' && p.status !== 'İptal').length };
    }, [filteredPayments]);

    const openDetail = (p: PaymentRow) => {
        setSelectedPayment(p); setDetailStatus(p.status || "pending"); setDetailAmount(String(p.amount)); setDetailMethod(p.method || "Nakit"); setIsDetailModalOpen(true);
    };

    return {
        today, patients, listSearch, setListSearch, modalPatientSearch, setModalPatientSearch,
        modalAppointments, modalAppointmentsLoading, selectedAppointmentId, setSelectedAppointmentId,
        selectedDate, setSelectedDate, startDate, setStartDate, endDate, setEndDate,
        amount, setAmount, method, setMethod, status, setStatus, note, setNote,
        payments, loading, saving, error, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
        viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
        detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
        isDeleteConfirmOpen, setIsDeleteConfirmOpen, filteredPayments, stats,
        handleUpdateStatus, handleDelete, openDetail
    };
}
