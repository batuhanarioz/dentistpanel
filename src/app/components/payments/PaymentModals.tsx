"use client";
import React, { useState, useEffect, useMemo } from "react";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { AppointmentOption, PaymentRow, UpdatePaymentExtras } from "@/hooks/usePaymentManagement";
import { createPayments } from "@/lib/api";
import { useClinic } from "@/app/context/ClinicContext";
import { localDateStr } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHODS, PaymentStatus, normalizePaymentStatus, isPaid, isCancelled } from "@/constants/payments";

const INSURANCE_COMPANIES = [
    "Allianz", "Axa Sigorta", "Anadolu Sigorta", "Cigna", "Mapfre",
    "Güneş Sigorta", "Aksigorta", "Sompo Japan", "Ergo", "Diğer"
];

// ─── Shared ──────────────────────────────────────────────────────────────────

interface InstallmentRow {
    amount: number;
    method: string;
    dueDate: string;
}

// ─── New Payment Modal ────────────────────────────────────────────────────────
interface NewPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    modalPatientSearch: string;
    setModalPatientSearch: (v: string) => void;
    modalAppointments: AppointmentOption[];
    modalAppointmentsLoading: boolean;
    selectedAppointmentId: string;
    setSelectedAppointmentId: (v: string) => void;
    checklistItemId?: string;
}

export function NewPaymentModal({
    isOpen, onClose, onSuccess,
    modalPatientSearch, setModalPatientSearch,
    modalAppointments, modalAppointmentsLoading,
    selectedAppointmentId, setSelectedAppointmentId,
    checklistItemId
}: NewPaymentModalProps) {
    const clinic = useClinic();
    const [amount, setAmount] = useState<number>(0);
    const [globalMethod, setGlobalMethod] = useState("Nakit");
    const [count, setCount] = useState(1);
    const [installmentList, setInstallmentList] = useState<InstallmentRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Discount
    const [discount, setDiscount] = useState<number>(0);

    // Treatment plan item
    const [treatmentPlanItems, setTreatmentPlanItems] = useState<{ id: string; procedure_name: string; tooth_no: string | null; unit_price: number }[]>([]);
    const [selectedTreatmentItemId, setSelectedTreatmentItemId] = useState<string>("");

    // Insurance
    const [insuranceEnabled, setInsuranceEnabled] = useState(false);
    const [insuranceCompany, setInsuranceCompany] = useState("");
    const [insuranceCustomCompany, setInsuranceCustomCompany] = useState("");
    const [policyNumber, setPolicyNumber] = useState("");
    const [insuranceAmount, setInsuranceAmount] = useState<number>(0);

    const [selectedAppt, setSelectedAppt] = useState<AppointmentOption | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [existingPayments, setExistingPayments] = useState<any[]>([]);
    const [agreedTotal, setAgreedTotal] = useState(0);
    const [loadingExisting, setLoadingExisting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAmount(0); setCount(1); setGlobalMethod("Nakit"); setError(null);
            setExistingPayments([]); setAgreedTotal(0); setSelectedAppt(null);
            setDiscount(0); setInsuranceEnabled(false); setInsuranceCompany("");
            setInsuranceCustomCompany(""); setPolicyNumber(""); setInsuranceAmount(0);
            setTreatmentPlanItems([]); setSelectedTreatmentItemId("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedAppointmentId || !isOpen) { setExistingPayments([]); setAgreedTotal(0); setSelectedAppt(null); return; }
        const found = modalAppointments.find(a => a.id === selectedAppointmentId);
        if (found) setSelectedAppt(found);
        let mounted = true;
        setLoadingExisting(true);
        supabase.from("payments").select("id, amount, status, due_date, agreed_total, installment_number, method, created_at").eq("appointment_id", selectedAppointmentId).eq("clinic_id", clinic.clinicId).order("created_at", { ascending: true })
            .then(({ data }) => {
                if (!mounted) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rows = (data || []) as any[];
                setExistingPayments(rows);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const maxAgreed = rows.reduce((m: number, p: any) => Math.max(m, p.agreed_total || 0), 0);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const totalPaid = rows.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                setAgreedTotal(maxAgreed);
                const remaining = Math.max(0, maxAgreed - totalPaid);
                setAmount(remaining > 0 ? remaining : 0);
                setLoadingExisting(false);
            });
        return () => { mounted = false; };
    }, [selectedAppointmentId, isOpen, modalAppointments]);

    useEffect(() => {
        setSelectedTreatmentItemId("");
        if (!selectedAppt?.patient_id || !clinic.clinicId || !isOpen) { setTreatmentPlanItems([]); return; }
        supabase.from("treatment_plan_items")
            .select("id, procedure_name, tooth_no, unit_price, status")
            .eq("clinic_id", clinic.clinicId)
            .eq("patient_id", selectedAppt.patient_id)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data }) => setTreatmentPlanItems((data || []) as { id: string; procedure_name: string; tooth_no: string | null; unit_price: number }[]));
    }, [selectedAppt?.patient_id, clinic.clinicId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen) return;
        const base = Math.round((amount / count) * 100) / 100;
        const now = new Date();
        const list: InstallmentRow[] = Array.from({ length: count }, (_, i) => {
            const d = new Date(now);
            d.setMonth(now.getMonth() + i);
            return {
                amount: i === count - 1 ? Math.round((amount - base * (count - 1)) * 100) / 100 : base,
                method: globalMethod,
                dueDate: localDateStr(d),
            };
        });
        setInstallmentList(list);
    }, [amount, count, globalMethod, isOpen]);

    const totalInstallments = useMemo(() => installmentList.reduce((s, r) => s + r.amount, 0), [installmentList]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPaid = useMemo(() => existingPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), [existingPayments]);

    const updateInstallment = (idx: number, field: keyof InstallmentRow, value: string | number) => {
        const list = [...installmentList];
        list[idx] = { ...list[idx], [field]: value };
        setInstallmentList(list);
    };

    const effectiveInsuranceCompany = insuranceCompany === "Diğer" ? insuranceCustomCompany : insuranceCompany;

    const handleSave = async () => {
        if (!selectedAppointmentId || !selectedAppt) { setError("Lütfen bir randevu seçin."); return; }
        if (amount <= 0) { setError("Geçerli bir tutar giriniz."); return; }
        if (!clinic.clinicId) { setError("Klinik bilgisi bulunamadı. Lütfen sayfayı yenileyin."); return; }
        if (Math.abs(totalInstallments - amount) > 0.01) {
            setError(`Taksit toplamı (${totalInstallments.toLocaleString()} ₺) girilen tutarla (${amount.toLocaleString()} ₺) eşleşmiyor.`);
            return;
        }
        if (insuranceEnabled && !effectiveInsuranceCompany) { setError("Sigorta şirketini seçiniz."); return; }
        setSaving(true); setError(null);
        try {
            const effectiveAgreedTotal = agreedTotal > 0 ? agreedTotal : amount;
            const todayStr = localDateStr();
            const insPerInstallment = insuranceEnabled && insuranceAmount > 0 && count > 0
                ? Math.round((insuranceAmount / count) * 100) / 100
                : 0;
            const insRemainder = insuranceEnabled && insuranceAmount > 0
                ? Math.round((insuranceAmount - insPerInstallment * (count - 1)) * 100) / 100
                : 0;

            const rows = installmentList.map((item, i) => ({
                appointment_id: selectedAppointmentId,
                patient_id: selectedAppt.patient_id,
                amount: item.amount,
                agreed_total: effectiveAgreedTotal,
                method: item.method,
                status: (i === 0 && item.dueDate === todayStr ? "paid" : "pending") as PaymentStatus,
                due_date: item.dueDate,
                installment_count: count,
                installment_number: i + 1,
                clinic_id: clinic.clinicId || undefined,
                discount_amount: i === 0 ? discount : 0,
                insurance_company: insuranceEnabled ? effectiveInsuranceCompany : null,
                insurance_amount: insuranceEnabled ? (i === count - 1 ? insRemainder : insPerInstallment) : 0,
                insurance_status: insuranceEnabled ? "pending" : "not_applicable",
                policy_number: insuranceEnabled ? policyNumber || null : null,
                treatment_plan_item_id: selectedTreatmentItemId || null,
            }));
            const { error: saveErr } = await createPayments(rows);
            if (saveErr) throw saveErr;

            if (checklistItemId) {
                await supabase.from("checklist_items").update({
                    status: "completed",
                    completed_at: new Date().toISOString()
                }).eq("id", checklistItemId).eq("clinic_id", clinic.clinicId);
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError("Kaydedilemedi: " + ((err as Error)?.message || err));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white shrink-0 relative">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <h2 className="text-xl font-bold">Yeni Ödeme Planı</h2>
                    <p className="text-emerald-100 text-xs mt-0.5">Randevu seçerek taksitli ödeme planı oluşturun</p>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">{error}</div>
                    )}

                    {/* Randevu Seçimi */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Randevu Seç</label>
                        {!selectedAppointmentId ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                    <input
                                        value={modalPatientSearch}
                                        onChange={e => setModalPatientSearch(e.target.value)}
                                        className="w-full h-11 rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Ad soyad veya telefon ile ara..."
                                    />
                                </div>
                                {modalPatientSearch.trim() && (
                                    <div className="rounded-2xl border-2 border-slate-100 bg-white overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                                        {modalAppointmentsLoading && <div className="px-4 py-3 text-xs text-slate-500 font-medium animate-pulse">Randevular aranıyor...</div>}
                                        {!modalAppointmentsLoading && modalAppointments.length === 0 && <div className="px-4 py-3 text-xs text-slate-500 font-medium">Eşleşen randevu bulunamadı.</div>}
                                        {!modalAppointmentsLoading && modalAppointments.map(appt => (
                                            <div
                                                key={appt.id}
                                                onClick={e => { e.preventDefault(); setSelectedAppointmentId(appt.id); setSelectedAppt(appt); setModalPatientSearch(""); }}
                                                className="px-4 py-3 flex flex-col gap-0.5 cursor-pointer hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors"
                                            >
                                                <span className="text-sm font-bold text-slate-900">{appt.patient_full_name}
                                                    {appt.patient_phone && <span className="text-slate-400 font-medium ml-2">· {appt.patient_phone}</span>}
                                                </span>
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {new Date(appt.starts_at).toLocaleDateString("tr-TR")} · {new Date(appt.starts_at).toTimeString().slice(0, 5)} · {appt.treatment_type || "Genel muayene"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400 font-medium">Önce hastayı arayın, ardından listeden randevuyu seçin.</p>
                            </div>
                        ) : selectedAppt ? (
                            <div className="space-y-3">
                                {/* Seçili randevu kartı */}
                                <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200/50 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seçilen Randevu</span>
                                        <button
                                            onClick={() => { setSelectedAppointmentId(""); setModalPatientSearch(""); }}
                                            className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-[9px] font-bold transition-colors"
                                        >
                                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                            Değiştir
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-px bg-slate-100/30">
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Hasta</div>
                                            <div className="text-xs font-bold text-slate-800">{selectedAppt.patient_full_name}</div>
                                        </div>
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">İşlem</div>
                                            <div className="text-xs font-bold text-slate-800">{selectedAppt.treatment_type || "Genel Muayene"}</div>
                                        </div>
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tarih & Saat</div>
                                            <div className="text-xs font-bold text-slate-800">
                                                {new Date(selectedAppt.starts_at).toLocaleDateString("tr-TR")} · {new Date(selectedAppt.starts_at).toTimeString().slice(0, 5)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mevcut ödemeler varsa özet */}
                                {loadingExisting ? (
                                    <div className="text-center py-3 text-xs text-slate-400 animate-pulse font-medium">Önceki ödemeler yükleniyor...</div>
                                ) : existingPayments.length > 0 && (
                                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3">⚠ Bu Randevunun Mevcut Ödeme Planı</p>
                                        <div className="flex gap-3 flex-wrap">
                                            <div className="bg-white px-3 py-2 rounded-xl border border-amber-100 flex-1 min-w-[100px]">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Anlaşılan</div>
                                                <div className="text-sm font-black text-slate-700">{agreedTotal.toLocaleString()} ₺</div>
                                            </div>
                                            <div className="bg-white px-3 py-2 rounded-xl border border-amber-100 flex-1 min-w-[100px]">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Girilen</div>
                                                <div className="text-sm font-black text-emerald-600">{totalPaid.toLocaleString()} ₺</div>
                                            </div>
                                            <div className="bg-white px-3 py-2 rounded-xl border border-rose-100 bg-rose-50/30 flex-1 min-w-[100px]">
                                                <div className="text-[9px] font-black text-rose-400 uppercase mb-0.5">Eksik</div>
                                                <div className="text-sm font-black text-rose-600">{Math.max(0, agreedTotal - totalPaid).toLocaleString()} ₺</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                                            {existingPayments.map((ep, idx) => (
                                                <div key={ep.id} className="flex items-center justify-between text-[10px] font-bold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                                    <span>{isPaid(ep.status) ? "✅" : isCancelled(ep.status) ? "❌" : "⏳"} Taksit {ep.installment_number || idx + 1}: {ep.due_date ? new Date(ep.due_date).toLocaleDateString("tr-TR") : ""}</span>
                                                    <span className={isCancelled(ep.status) ? "line-through text-slate-400" : "text-slate-700"}>{Number(ep.amount).toLocaleString()} ₺</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Taksit Planlayıcı */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {/* Sol: Ayarlar */}
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GİRİLECEK TUTAR</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={amount === 0 ? "" : amount}
                                                    onChange={e => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                                                    className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-emerald-500 transition-colors py-2 focus:outline-none pr-8"
                                                />
                                                <span className="absolute right-0 bottom-3 text-xl font-bold text-slate-300">₺</span>
                                            </div>
                                        </div>

                                        {/* Tedavi Planı Kalemi */}
                                        {treatmentPlanItems.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedavi Planı Kalemi</label>
                                                <select
                                                    value={selectedTreatmentItemId}
                                                    onChange={e => {
                                                        setSelectedTreatmentItemId(e.target.value);
                                                        if (e.target.value) {
                                                            const item = treatmentPlanItems.find(t => t.id === e.target.value);
                                                            if (item && amount === 0) setAmount(item.unit_price);
                                                        }
                                                    }}
                                                    className="w-full h-9 rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-all"
                                                >
                                                    <option value="">— Seçiniz (isteğe bağlı) —</option>
                                                    {treatmentPlanItems.map(item => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.procedure_name}{item.tooth_no ? ` (Diş ${item.tooth_no})` : ""} — {item.unit_price.toLocaleString("tr-TR")} ₺
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* İskonto */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İskonto / İndirim</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={discount === 0 ? "" : discount}
                                                    onChange={e => setDiscount(e.target.value === "" ? 0 : Number(e.target.value))}
                                                    placeholder="0"
                                                    className="w-full h-9 rounded-xl border-2 border-slate-100 bg-slate-50 px-3 pr-7 text-sm font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₺</span>
                                            </div>
                                            {discount > 0 && (
                                                <p className="text-[10px] text-emerald-600 font-bold">{discount.toLocaleString()} ₺ indirim uygulandı</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÖDEME YÖNTEMİ</label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {["Nakit", "Kredi Kartı", "Havale"].map(m => (
                                                    <button key={m} type="button" onClick={() => setGlobalMethod(m)}
                                                        className={`py-1.5 rounded-xl border-2 text-[10px] font-bold transition-all ${globalMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}>
                                                        {m}
                                                    </button>
                                                ))}
                                                {["POS / Taksit", "Çek", "Diğer"].map(m => (
                                                    <button key={m} type="button" onClick={() => setGlobalMethod(m)}
                                                        className={`py-1.5 rounded-xl border-2 text-[10px] font-bold transition-all ${globalMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAKSİT SAYISI</label>
                                                <span className="text-emerald-600 text-[10px] font-black">{count} TAKSİT</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="12" step="1" value={count}
                                                onChange={e => setCount(Number(e.target.value))}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Sağ: Plan Listesi */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ÖDEME PLANI</h3>
                                        <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
                                            {installmentList.map((item, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                                                        <PremiumDatePicker
                                                            value={item.dueDate}
                                                            onChange={(d) => updateInstallment(idx, "dueDate", d)}
                                                            compact
                                                            align="right"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="number" value={item.amount === 0 ? "" : item.amount}
                                                                onChange={e => updateInstallment(idx, "amount", e.target.value === "" ? 0 : Number(e.target.value))}
                                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-emerald-500"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">₺</span>
                                                        </div>
                                                        <select value={item.method} onChange={e => updateInstallment(idx, "method", e.target.value)}
                                                            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-[10px] font-bold focus:outline-none focus:border-emerald-500">
                                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {Math.abs(totalInstallments - amount) > 0.01 && amount > 0 && (
                                            <p className="mt-2 text-[10px] font-bold text-rose-500">
                                                Toplam fark: {(totalInstallments - amount).toLocaleString()} ₺
                                            </p>
                                        )}
                                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Toplam</span>
                                            <span className="text-sm font-black text-slate-900">{totalInstallments.toLocaleString()} ₺ · {count} taksit</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sigorta Bölümü */}
                                <div className={`rounded-2xl border-2 overflow-hidden transition-all ${insuranceEnabled ? "border-blue-200 bg-blue-50/30" : "border-slate-100"}`}>
                                    <button
                                        type="button"
                                        onClick={() => setInsuranceEnabled(v => !v)}
                                        className="w-full px-4 py-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${insuranceEnabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                                </svg>
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black ${insuranceEnabled ? "text-blue-700" : "text-slate-600"}`}>Özel Sağlık Sigortası</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Bu ödeme sigorta kapsamında mı?</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${insuranceEnabled ? "bg-blue-500" : "bg-slate-200"}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${insuranceEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                        </div>
                                    </button>

                                    {insuranceEnabled && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-blue-100">
                                            <div className="pt-3 grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sigorta Şirketi</label>
                                                    <select
                                                        value={insuranceCompany}
                                                        onChange={e => setInsuranceCompany(e.target.value)}
                                                        className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none"
                                                    >
                                                        <option value="">Seçiniz...</option>
                                                        {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    {insuranceCompany === "Diğer" && (
                                                        <input
                                                            value={insuranceCustomCompany}
                                                            onChange={e => setInsuranceCustomCompany(e.target.value)}
                                                            placeholder="Şirket adı..."
                                                            className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none mt-1.5"
                                                        />
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poliçe Numarası</label>
                                                    <input
                                                        value={policyNumber}
                                                        onChange={e => setPolicyNumber(e.target.value)}
                                                        placeholder="Opsiyonel"
                                                        className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sigorta Karşıladığı Tutar (toplam)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={insuranceAmount === 0 ? "" : insuranceAmount}
                                                            onChange={e => setInsuranceAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                                                            placeholder="0"
                                                            className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 pr-7 text-sm font-bold focus:border-blue-400 outline-none"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₺</span>
                                                    </div>
                                                    <p className="text-[9px] text-blue-500 font-medium">Hasta payı: {Math.max(0, amount - insuranceAmount).toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <p className="text-[10px] text-slate-400 font-medium">
                        {selectedAppointmentId ? `Toplam ${count} adet ödeme kaydı oluşturulacak.` : "Ödeme planı oluşturmak için randevu seçin."}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 transition-colors text-xs">Vazgeç</button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !selectedAppointmentId || amount <= 0}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Kaydediliyor...</>
                            ) : (
                                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Tüm Taksitleri Kaydet</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: PaymentRow | null;
    status: PaymentStatus;
    setStatus: (v: PaymentStatus) => void;
    amount: string;
    setAmount: (v: string) => void;
    method: string;
    setMethod: (v: string) => void;
    onUpdate: (extras: UpdatePaymentExtras) => void;
    onCancel: () => void;
    operationError?: string | null;
    onClearError?: () => void;
}

type SiblingPayment = { id: string; amount: number; status: string | null; due_date: string | null; installment_number: number | null; };

export function PaymentDetailModal({ isOpen, onClose, payment, status, setStatus, amount, setAmount, method, setMethod, onUpdate, onCancel, operationError, onClearError }: DetailModalProps) {
    const { clinicId } = useClinic();
    const [saving, setSaving] = React.useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
    const [siblings, setSiblings] = React.useState<SiblingPayment[]>([]);
    const [localDueDate, setLocalDueDate] = React.useState("");
    const [localNote, setLocalNote] = React.useState("");

    // Insurance local state
    const [localInsuranceCompany, setLocalInsuranceCompany] = React.useState("");
    const [localInsuranceAmount, setLocalInsuranceAmount] = React.useState<number>(0);
    const [localInsuranceStatus, setLocalInsuranceStatus] = React.useState<string>("not_applicable");
    const [localPolicyNumber, setLocalPolicyNumber] = React.useState("");
    const [localDiscountAmount, setLocalDiscountAmount] = React.useState<number>(0);
    const [localReceiptNumber, setLocalReceiptNumber] = React.useState("");
    const [showInsuranceSection, setShowInsuranceSection] = React.useState(false);

    React.useEffect(() => {
        if (payment?.status) {
            const normalized = normalizePaymentStatus(payment.status);
            if (status !== normalized) setStatus(normalized);
        }
        setLocalDueDate(payment?.due_date ?? "");
        setLocalNote(payment?.note ?? "");
        setLocalInsuranceCompany(payment?.insurance_company ?? "");
        setLocalInsuranceAmount(payment?.insurance_amount ?? 0);
        setLocalInsuranceStatus(payment?.insurance_status ?? "not_applicable");
        setLocalPolicyNumber(payment?.policy_number ?? "");
        setLocalDiscountAmount(payment?.discount_amount ?? 0);
        setLocalReceiptNumber(payment?.receipt_number ?? "");
        setShowInsuranceSection(!!(payment?.insurance_company));
        setShowCancelConfirm(false);
        setSiblings([]);
        setSaving(false);
    }, [payment, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!isOpen || !payment?.appointment_id || !payment.installment_count || payment.installment_count <= 1 || !clinicId) return;
        supabase.from("payments")
            .select("id, amount, status, due_date, installment_number")
            .eq("appointment_id", payment.appointment_id)
            .eq("clinic_id", clinicId)
            .order("installment_number", { ascending: true })
            .then(({ data }) => setSiblings((data || []) as SiblingPayment[]));
    }, [isOpen, payment?.appointment_id, payment?.installment_count, clinicId]);

    if (!isOpen || !payment) return null;

    const apptDate = payment.appointment?.starts_at ? new Date(payment.appointment.starts_at) : null;
    const agreedTotal = payment.agreed_total;
    const totalSiblingsPaid = siblings.filter(s => isPaid(s.status)).reduce((sum, s) => sum + s.amount, 0);
    const remaining = agreedTotal ? Math.max(0, agreedTotal - totalSiblingsPaid) : null;

    const statusIconMap: Record<string, string> = { paid: "✅", cancelled: "❌", pending: "⏳", planned: "📅" };

    const handleSave = () => {
        if (saving) return;
        if (Number(amount) <= 0) return;
        if (showInsuranceSection && localInsuranceAmount > Number(amount)) {
            setLocalInsuranceAmount(Number(amount));
            return;
        }
        if (localDiscountAmount > Number(amount)) {
            setLocalDiscountAmount(Number(amount));
            return;
        }
        setSaving(true);
        onUpdate({
            dueDate: localDueDate,
            note: localNote,
            insuranceCompany: showInsuranceSection ? localInsuranceCompany : null,
            insuranceAmount: showInsuranceSection ? localInsuranceAmount : null,
            insuranceStatus: showInsuranceSection ? localInsuranceStatus : "not_applicable",
            policyNumber: showInsuranceSection ? localPolicyNumber || null : null,
            discountAmount: localDiscountAmount || null,
            receiptNumber: localReceiptNumber || null,
            treatmentPlanItemId: payment.treatment_plan_item_id ?? null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white relative shrink-0">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black shrink-0">
                            {(payment.patient?.full_name || "H")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold truncate">{payment.patient?.full_name || "Hasta"}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-teal-100 text-xs font-medium">{payment.patient?.phone || "—"}</p>
                                {payment.patient?.phone && (
                                    <a href={`https://wa.me/90${payment.patient.phone.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20bd5a] px-2 py-0.5 rounded-full text-[9px] font-black text-white transition-colors shrink-0">
                                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                        WhatsApp
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">

                    {/* Randevu + Anlaşılan Toplam */}
                    {apptDate && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/60">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İlgili Randevu</span>
                            </div>
                            <div className="grid grid-cols-3 gap-px bg-slate-100/40">
                                <div className="bg-white px-3 py-2.5">
                                    <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tarih</div>
                                    <div className="text-[11px] font-bold text-slate-800">{apptDate.toLocaleDateString("tr-TR")}</div>
                                </div>
                                <div className="bg-white px-3 py-2.5">
                                    <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Saat</div>
                                    <div className="text-[11px] font-bold text-slate-800">{apptDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                                </div>
                                <div className="bg-white px-3 py-2.5">
                                    <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">İşlem</div>
                                    <div className="text-[11px] font-bold text-slate-800 truncate">{payment.appointment?.treatment_type || "—"}</div>
                                </div>
                            </div>
                            {agreedTotal && agreedTotal > 0 && (
                                <div className="grid grid-cols-3 gap-px bg-slate-100/40 border-t border-slate-100">
                                    <div className="bg-white px-3 py-2.5">
                                        <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Anlaşılan</div>
                                        <div className="text-[11px] font-bold text-slate-700">{agreedTotal.toLocaleString("tr-TR")} ₺</div>
                                    </div>
                                    <div className="bg-white px-3 py-2.5">
                                        <div className="text-[8.5px] font-black text-emerald-500 uppercase tracking-wider mb-0.5">Ödenen</div>
                                        <div className="text-[11px] font-bold text-emerald-700">{totalSiblingsPaid.toLocaleString("tr-TR")} ₺</div>
                                    </div>
                                    <div className="bg-white px-3 py-2.5">
                                        <div className="text-[8.5px] font-black text-rose-400 uppercase tracking-wider mb-0.5">Kalan</div>
                                        <div className="text-[11px] font-bold text-rose-600">{remaining?.toLocaleString("tr-TR")} ₺</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Taksit listesi */}
                    {siblings.length > 1 && (
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Taksit Planı ({payment.installment_number}/{payment.installment_count})
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {siblings.map(s => {
                                    const isCurrent = s.id === payment.id;
                                    return (
                                        <div key={s.id} className={`flex items-center justify-between text-[10px] font-bold px-2.5 py-2 rounded-xl border transition-all ${isCurrent ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-white border-slate-100 text-slate-600"}`}>
                                            <span className="flex items-center gap-1">
                                                {statusIconMap[normalizePaymentStatus(s.status)] ?? "⏳"}
                                                <span>{s.due_date ? new Date(s.due_date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) : "—"}</span>
                                            </span>
                                            <span className={isCurrent ? "font-black" : ""}>{s.amount.toLocaleString("tr-TR")} ₺</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Durum */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödeme Durumu</label>
                        <div className="flex rounded-2xl border-2 border-slate-100 bg-slate-50 p-1 gap-1">
                            {(["paid", "partial", "pending", "cancelled"] as PaymentStatus[]).map(s => {
                                const active = status === s;
                                const config = PAYMENT_STATUS_COLORS[s];
                                return (
                                    <button key={s} onClick={() => setStatus(s)}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${active ? `${config.bg.replace("-50", "-500")} text-white shadow` : "text-slate-400 hover:text-slate-700 hover:bg-white"}`}>
                                        {PAYMENT_STATUS_LABELS[s]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tutar, Yöntem, Vade, İskonto */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutar</label>
                            <div className="relative">
                                <input type="number" min="0" value={amount}
                                    onChange={e => setAmount(String(Math.max(0, Number(e.target.value))))}
                                    className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 pr-7 text-sm font-extrabold focus:border-teal-500 outline-none transition-all" />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₺</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yöntem</label>
                            <select value={method} onChange={e => setMethod(e.target.value)}
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all">
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vade Tarihi</label>
                            <PremiumDatePicker value={localDueDate} onChange={setLocalDueDate} compact />
                            {localDueDate && payment.due_date && localDueDate !== payment.due_date && (
                                <p className="text-[9px] font-bold text-amber-500 flex items-center gap-1">
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                                    Vade değiştiğinde kayıt aktif dönem dışına çıkabilir ve listeden kaldırılır.
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İskonto</label>
                            <div className="relative">
                                <input type="number" min="0" max={Number(amount)} value={localDiscountAmount === 0 ? "" : localDiscountAmount}
                                    onChange={e => {
                                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                                        setLocalDiscountAmount(Math.min(val, Number(amount)));
                                    }}
                                    placeholder="0"
                                    className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 pr-7 text-sm font-bold focus:border-teal-500 outline-none transition-all placeholder:text-slate-300" />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₺</span>
                            </div>
                        </div>
                    </div>

                    {/* Tedavi Planı Kalemi (salt okunur) */}
                    {payment.treatment_plan_item && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
                            <svg className="h-3.5 w-3.5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                            </svg>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Tedavi Planı Kalemi</p>
                                <p className="text-xs font-bold text-violet-700 truncate">
                                    {payment.treatment_plan_item.procedure_name}
                                    {payment.treatment_plan_item.tooth_no && <span className="ml-1 font-medium text-violet-500">(Diş {payment.treatment_plan_item.tooth_no})</span>}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Fiş No + Not */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiş / Referans No</label>
                        <input
                            type="text"
                            value={localReceiptNumber}
                            onChange={e => setLocalReceiptNumber(e.target.value)}
                            placeholder="FIS-20260321-XXXX (otomatik)"
                            className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Not</label>
                        <textarea
                            value={localNote}
                            onChange={e => setLocalNote(e.target.value)}
                            rows={2}
                            placeholder="Ödeme ile ilgili not..."
                            className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none transition-all resize-none placeholder:text-slate-300"
                        />
                    </div>

                    {/* Sigorta Bölümü */}
                    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${showInsuranceSection ? "border-blue-200" : "border-slate-100"}`}>
                        <button
                            type="button"
                            onClick={() => setShowInsuranceSection(v => !v)}
                            className="w-full px-4 py-3 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <svg className={`h-4 w-4 ${showInsuranceSection ? "text-blue-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                </svg>
                                <span className={`text-xs font-black ${showInsuranceSection ? "text-blue-700" : "text-slate-500"}`}>
                                    Sigorta Bilgileri
                                    {localInsuranceCompany && <span className="ml-1.5 text-blue-500">· {localInsuranceCompany}</span>}
                                </span>
                            </div>
                            <svg className={`h-4 w-4 text-slate-400 transition-transform ${showInsuranceSection ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {showInsuranceSection && (
                            <div className="px-4 pb-4 space-y-3 border-t border-blue-100 bg-blue-50/20">
                                <div className="pt-3 grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Şirket</label>
                                        <input
                                            value={localInsuranceCompany}
                                            onChange={e => setLocalInsuranceCompany(e.target.value)}
                                            placeholder="Sigorta şirketi..."
                                            className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poliçe No</label>
                                        <input
                                            value={localPolicyNumber}
                                            onChange={e => setLocalPolicyNumber(e.target.value)}
                                            placeholder="Opsiyonel"
                                            className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tutar</label>
                                        <div className="relative">
                                            <input type="number" min="0" max={Number(amount)}
                                                value={localInsuranceAmount === 0 ? "" : localInsuranceAmount}
                                                onChange={e => {
                                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                    setLocalInsuranceAmount(Math.min(val, Number(amount)));
                                                }}
                                                placeholder="0"
                                                className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 pr-7 text-xs font-bold focus:border-blue-400 outline-none placeholder:text-slate-300"
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">₺</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sigorta Durumu</label>
                                        <select
                                            value={localInsuranceStatus}
                                            onChange={e => setLocalInsuranceStatus(e.target.value)}
                                            className="w-full h-9 rounded-xl border-2 border-blue-100 bg-white px-3 text-xs font-bold focus:border-blue-400 outline-none"
                                        >
                                            <option value="not_applicable">Uygulanmıyor</option>
                                            <option value="pending">Beklemede</option>
                                            <option value="received">Tahsil Edildi</option>
                                        </select>
                                    </div>
                                </div>

                                {localInsuranceStatus === "pending" && localInsuranceAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setLocalInsuranceStatus("received")}
                                        className="w-full py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors"
                                    >
                                        ✓ Sigorta Ödemesi Alındı
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Eylemler */}
                    {showCancelConfirm ? (
                        <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 animate-in slide-in-from-bottom-2 duration-200">
                            <p className="text-[11px] font-black text-rose-700">Bu ödeme iptal edilsin mi?</p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowCancelConfirm(false)}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Hayır
                                </button>
                                <button onClick={onCancel}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 transition-colors">
                                    Evet, İptal Et
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pt-1">
                            {operationError && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[10px] font-semibold text-red-700">
                                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    <span className="flex-1">{operationError}</span>
                                    <button onClick={onClearError} className="text-red-400 hover:text-red-600 transition-colors">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="h-11 px-4 rounded-2xl border-2 border-slate-100 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all whitespace-nowrap">
                                Ödemeyi İptal Et
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 h-11 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2">
                                {saving ? (
                                    <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Kaydediliyor...</>
                                ) : "Kaydet & Kapat"}
                            </button>
                        </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
