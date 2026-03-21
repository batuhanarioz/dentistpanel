import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr, paymentDateRange } from "@/lib/dateUtils";
import { Appointment } from "@/types/database";
import { useClinic } from "@/app/context/ClinicContext";
import { updatePaymentSchema } from "@/lib/validations/payment";
import { isPaid, isCancelled, isPending, isPartial, PaymentStatus, normalizePaymentStatus } from "@/constants/payments";

export type Patient = { id: string; full_name: string; phone: string | null; };
export type AppointmentOption = { id: string; starts_at: string; treatment_type: string | null; patient_id: string; patient_full_name: string; patient_phone: string | null; };
export type PaymentRow = {
    id: string;
    amount: number;
    method: string | null;
    status: string | null;
    note: string | null;
    due_date: string | null;
    appointment_id?: string | null;
    agreed_total?: number | null;
    patient: { full_name: string | null; phone: string | null; } | null;
    appointment?: { starts_at: string; treatment_type: string | null; } | null;
    installment_count?: number | null;
    installment_number?: number | null;
    insurance_company?: string | null;
    insurance_amount?: number | null;
    insurance_status?: string | null;
    policy_number?: string | null;
    discount_amount?: number | null;
    receipt_number?: string | null;
    treatment_plan_item_id?: string | null;
    treatment_plan_item?: { id: string; procedure_name: string; tooth_no: string | null } | null;
};

export type UpdatePaymentExtras = {
    dueDate?: string;
    note?: string;
    insuranceCompany?: string | null;
    insuranceAmount?: number | null;
    insuranceStatus?: string | null;
    policyNumber?: string | null;
    discountAmount?: number | null;
    receiptNumber?: string | null;
    treatmentPlanItemId?: string | null;
};

export function usePaymentManagement(appointmentIdParam: string | null) {
    const queryClient = useQueryClient();
    const { clinicId } = useClinic();
    const today = useMemo(() => localDateStr(), []);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [listSearch, setListSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [methodFilter, setMethodFilter] = useState<string>("all");
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
    const [bulkLoading, setBulkLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "range">("month");
    const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailStatus, setDetailStatus] = useState<PaymentStatus>("pending");
    const [detailAmount, setDetailAmount] = useState<string>("");
    const [detailMethod, setDetailMethod] = useState<string>("Nakit");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
                appointment_id, agreed_total,
                installment_count, installment_number,
                insurance_company, insurance_amount, insurance_status, policy_number, discount_amount, receipt_number,
                treatment_plan_item_id,
                patient:patient_id(full_name, phone),
                appointment:appointment_id(starts_at, treatment_type),
                treatment_plan_item:treatment_plan_item_id(id, procedure_name, tooth_no)
            `)
            .eq("clinic_id", clinicId)
            .gte("due_date", startDate).lt("due_date", endDate).order("created_at", { ascending: true });
        if (error) setError(error.message);
        else setPayments((data || []) as unknown as PaymentRow[]);
        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        const { s, e } = paymentDateRange(viewMode, selectedDate, startDate, endDate);
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
        let mounted = true;
        setModalAppointmentsLoading(true);
        supabase.from("appointments")
            .select("id, starts_at, treatment_type, patient_id, patients:patient_id(full_name, phone)")
            .eq("clinic_id", clinicId)
            .in("patient_id", pIds).order("starts_at", { ascending: true }).limit(30)
            .then(
                ({ data }) => {
                    if (!mounted) return;
                    type PaymentModalRow = Pick<Appointment, "id" | "starts_at" | "treatment_type" | "patient_id"> & { patients: { full_name: string; phone: string | null } | null };

                    setModalAppointments(((data as unknown as PaymentModalRow[]) || []).map((r) => ({
                        id: r.id, starts_at: r.starts_at, treatment_type: r.treatment_type, patient_id: r.patient_id,
                        patient_full_name: r.patients?.full_name || "Hasta", patient_phone: r.patients?.phone || null
                    })));
                    setModalAppointmentsLoading(false);
                },
                () => {
                    if (!mounted) return;
                    setModalAppointmentsLoading(false);
                }
            );
        return () => { mounted = false; };
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

    const handleUpdateStatus = async (extras: UpdatePaymentExtras = {}) => {
        if (!selectedPayment || !clinicId) return;

        const { dueDate, note: noteVal, insuranceCompany, insuranceAmount, insuranceStatus, policyNumber, discountAmount, receiptNumber, treatmentPlanItemId } = extras;

        const updates = {
            status: detailStatus,
            amount: Number(detailAmount),
            method: detailMethod,
            due_date: dueDate !== undefined ? (dueDate || null) : undefined,
            note: noteVal || null,
            insurance_company: insuranceCompany ?? undefined,
            insurance_amount: insuranceAmount ?? undefined,
            insurance_status: insuranceStatus ?? undefined,
            policy_number: policyNumber ?? undefined,
            discount_amount: discountAmount ?? undefined,
            receipt_number: receiptNumber ?? undefined,
            treatment_plan_item_id: treatmentPlanItemId ?? undefined,
        };

        const validation = updatePaymentSchema.safeParse(updates);
        if (!validation.success) {
            setError("Yeni bilgiler geçersiz: " + validation.error.issues[0].message);
            return;
        }

        const { error } = await supabase.from("payments").update(validation.data).eq("id", selectedPayment.id).eq("clinic_id", clinicId);
        if (error) {
            setError("Güncelleme başarısız: " + error.message);
        } else {
            // Listeyi yeniden yükle: dönem dışına çıkan kayıtlar otomatik düşer,
            // join verileri (treatment_plan_item vb.) de güncel gelir.
            refresh();
            setIsDetailModalOpen(false);
        }
    };

    const handleQuickCollect = async (paymentId: string) => {
        if (!clinicId) return;
        const { error } = await supabase.from("payments")
            .update({ status: "paid" })
            .eq("id", paymentId)
            .eq("clinic_id", clinicId);
        if (error) {
            setError("Tahsilat başarısız: " + error.message);
        } else {
            setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: "paid" } : p));
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["assistantPayments"] });
        }
    };

    const handleDelete = async () => {
        if (!selectedPayment || !clinicId) return;
        const { error } = await supabase.from("payments").update({ status: "cancelled" }).eq("id", selectedPayment.id).eq("clinic_id", clinicId);
        if (error) {
            setError("İptal işlemi başarısız: " + error.message);
        } else {
            setPayments(prev => prev.map(p => p.id === selectedPayment.id ? { ...p, status: "cancelled" } : p));
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["assistantPayments"] });
            setIsDetailModalOpen(false);
        }
    };

    const toggleSelectId = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const deselectIds = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
        });
    }, []);

    const handleBulkCollect = useCallback(async () => {
        if (!clinicId || selectedIds.size === 0 || bulkLoading) return;
        // Sadece iptal olmayan ödemeleri işleme al
        const ids = Array.from(selectedIds).filter(id => {
            const p = payments.find(r => r.id === id);
            return p && !isCancelled(p.status);
        });
        if (ids.length === 0) return;
        setBulkLoading(true);
        const { error } = await supabase.from("payments")
            .update({ status: "paid" })
            .in("id", ids)
            .eq("clinic_id", clinicId);
        if (!error) {
            setPayments(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "paid" } : p));
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["assistantPayments"] });
            setSelectedIds(new Set());
        }
        setBulkLoading(false);
    }, [clinicId, selectedIds, bulkLoading, payments, queryClient]);

    const filteredPayments = useMemo(() => payments.filter(p => {
        const t = listSearch.trim().toLowerCase();
        if (t && !p.patient?.full_name?.toLowerCase().includes(t) && !p.patient?.phone?.includes(t) && !p.receipt_number?.toLowerCase().includes(t)) return false;
        if (statusFilter !== "all") {
            if (normalizePaymentStatus(p.status) !== statusFilter) return false;
        }
        if (methodFilter !== "all" && p.method !== methodFilter) return false;
        return true;
    }), [payments, listSearch, statusFilter, methodFilter]);

    const stats = useMemo(() => {
        const netAmount = (p: PaymentRow) => p.amount - (p.discount_amount || 0);
        const active = filteredPayments.filter(p => !isCancelled(p.status));
        const total = active.reduce((s, p) => s + netAmount(p), 0);
        const paid = filteredPayments.filter(p => isPaid(p.status)).reduce((s, p) => s + netAmount(p), 0);
        const planned = filteredPayments.filter(p => isPending(p.status) || isPartial(p.status)).reduce((s, p) => s + netAmount(p), 0);
        const insurancePending = filteredPayments
            .filter(p => !isCancelled(p.status) && p.insurance_status === "pending" && p.insurance_amount)
            .reduce((s, p) => s + (p.insurance_amount || 0), 0);
        const overdueCount = filteredPayments.filter(p => {
            if (!isPending(p.status) && !isPartial(p.status)) return false;
            if (!p.due_date) return false;
            return p.due_date < today;
        }).length;
        const methodMap = new Map<string, { amount: number; count: number }>();
        for (const p of active) {
            const m = p.method || "Diğer";
            const cur = methodMap.get(m) ?? { amount: 0, count: 0 };
            methodMap.set(m, { amount: cur.amount + netAmount(p), count: cur.count + 1 });
        }
        const methodBreakdown = Array.from(methodMap.entries())
            .map(([method, d]) => ({ method, amount: d.amount, count: d.count, percent: total > 0 ? Math.round((d.amount / total) * 100) : 0 }))
            .sort((a, b) => b.amount - a.amount);
        const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;
        return { total, paid, planned, count: active.length, insurancePending, overdueCount, methodBreakdown, collectionRate };
    }, [filteredPayments, today]);

    const refresh = useCallback(() => {
        const { s, e } = paymentDateRange(viewMode, selectedDate, startDate, endDate);
        loadPayments(s, e);
    }, [viewMode, selectedDate, startDate, endDate, loadPayments]);

    const openDetail = (p: PaymentRow) => {
        setSelectedPayment(p);
        setDetailStatus(normalizePaymentStatus(p.status));
        setDetailAmount(String(p.amount));
        setDetailMethod(p.method || "Nakit");
        setIsDetailModalOpen(true);
    };

    return {
        today, listSearch, setListSearch, statusFilter, setStatusFilter, methodFilter, setMethodFilter,
        modalPatientSearch, setModalPatientSearch,
        modalAppointments, modalAppointmentsLoading, selectedAppointmentId, setSelectedAppointmentId,
        selectedDate, setSelectedDate, startDate, setStartDate, endDate, setEndDate,
        payments, loading, bulkLoading, error, setError, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
        viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
        detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
        filteredPayments, stats,
        handleUpdateStatus, handleQuickCollect, handleDelete, openDetail, refresh,
        selectedIds, toggleSelectId, selectAll, deselectIds, clearSelection, handleBulkCollect
    };
}
