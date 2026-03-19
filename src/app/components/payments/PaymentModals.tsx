"use client";
import React, { useState, useEffect, useMemo } from "react";
import { AppointmentOption, PaymentRow } from "@/hooks/usePaymentManagement";
import { createPayments } from "@/lib/api";
import { useClinic } from "@/app/context/ClinicContext";
import { localDateStr } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHODS, PaymentStatus, normalizePaymentStatus, isPaid, isCancelled } from "@/constants/payments";

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
    today: string;
    checklistItemId?: string;
}

export function NewPaymentModal({
    isOpen, onClose, onSuccess,
    modalPatientSearch, setModalPatientSearch,
    modalAppointments, modalAppointmentsLoading,
    selectedAppointmentId, setSelectedAppointmentId,
    today, checklistItemId
}: NewPaymentModalProps) {
    const clinic = useClinic();
    const [amount, setAmount] = useState<number>(0);
    const [globalMethod, setGlobalMethod] = useState("Nakit");
    const [count, setCount] = useState(1);
    const [installmentList, setInstallmentList] = useState<InstallmentRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Seçili randevuyu lokal state'te tut — modalAppointments temizlense bile bilgi kaybolmaz
    const [selectedAppt, setSelectedAppt] = useState<AppointmentOption | null>(null);

    // Var olan ödemeleri çek
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [existingPayments, setExistingPayments] = useState<any[]>([]);
    const [agreedTotal, setAgreedTotal] = useState(0);
    const [loadingExisting, setLoadingExisting] = useState(false);

    useEffect(() => {
        if (!isOpen) { setAmount(0); setCount(1); setGlobalMethod("Nakit"); setError(null); setExistingPayments([]); setAgreedTotal(0); setSelectedAppt(null); return; }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedAppointmentId || !isOpen) { setExistingPayments([]); setAgreedTotal(0); setSelectedAppt(null); return; }
        // Seçilen randevuyu bul ve lokal state'e kaydet (onClick'ten zaten set edilmiş olabilir; burası fallback)
        const found = modalAppointments.find(a => a.id === selectedAppointmentId);
        if (found) setSelectedAppt(found);
        let mounted = true;
        setLoadingExisting(true);
        supabase.from("payments").select("id, amount, status, due_date, agreed_total, installment_number, method, created_at").eq("appointment_id", selectedAppointmentId).order("created_at", { ascending: true })
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


    // Taksit listesini yeniden oluştur
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

    const handleSave = async () => {
        if (!selectedAppointmentId || !selectedAppt) { setError("Lütfen bir randevu seçin."); return; }
        if (amount <= 0) { setError("Geçerli bir tutar giriniz."); return; }
        if (!clinic.clinicId) { setError("Klinik bilgisi bulunamadı. Lütfen sayfayı yenileyin."); return; }

        if (Math.abs(totalInstallments - amount) > 0.01) {
            setError(`Taksit toplamı (${totalInstallments.toLocaleString()} ₺) girilen tutarla (${amount.toLocaleString()} ₺) eşleşmiyor.`);
            return;
        }
        setSaving(true); setError(null);
        try {
            const effectiveAgreedTotal = agreedTotal > 0 ? agreedTotal : amount;
            const todayStr = localDateStr();
            const rows = installmentList.map((item, i) => ({
                appointment_id: selectedAppointmentId,
                patient_id: selectedAppt.patient_id,
                amount: item.amount,
                agreed_total: effectiveAgreedTotal,
                method: item.method,
                // İlk taksit bugün tarihliyse direkt ödendi yap, değilse beklemede
                status: (i === 0 && item.dueDate === todayStr ? "paid" : "pending") as PaymentStatus,
                due_date: item.dueDate,
                installment_count: count,
                installment_number: i + 1,
                clinic_id: clinic.clinicId || undefined,
            }));
            const { error: saveErr } = await createPayments(rows);
            if (saveErr) throw saveErr;

            // Eğer checklist görevi varsa onu da tamamla
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
                                                        <input
                                                            type="date" value={item.dueDate}
                                                            onChange={e => updateInstallment(idx, "dueDate", e.target.value)}
                                                            className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
    onUpdate: (dueDate: string, note: string) => void;
    onCancel: () => void;
}

type SiblingPayment = { id: string; amount: number; status: string | null; due_date: string | null; installment_number: number | null; };

export function PaymentDetailModal({ isOpen, onClose, payment, status, setStatus, amount, setAmount, method, setMethod, onUpdate, onCancel }: DetailModalProps) {
    const { clinicId } = useClinic();
    const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
    const [siblings, setSiblings] = React.useState<SiblingPayment[]>([]);
    const [localDueDate, setLocalDueDate] = React.useState("");
    const [localNote, setLocalNote] = React.useState("");

    React.useEffect(() => {
        if (payment?.status) {
            const normalized = normalizePaymentStatus(payment.status);
            if (status !== normalized) setStatus(normalized);
        }
        setLocalDueDate(payment?.due_date ?? "");
        setLocalNote(payment?.note ?? "");
        setShowCancelConfirm(false);
        setSiblings([]);
    }, [payment, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Taksit kardeşlerini çek
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
                                    <a href={`https://wa.me/90${payment.patient.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
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
                            {(["paid", "pending", "cancelled"] as PaymentStatus[]).map(s => {
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

                    {/* Tutar, Yöntem, Vade */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutar</label>
                            <div className="relative">
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
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
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vade Tarihi</label>
                            <input type="date" value={localDueDate} onChange={e => setLocalDueDate(e.target.value)}
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all" />
                        </div>
                    </div>

                    {/* Not (düzenlenebilir) */}
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
                        <div className="flex gap-2.5 pt-1">
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="h-11 px-4 rounded-2xl border-2 border-slate-100 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all whitespace-nowrap">
                                Ödemeyi İptal Et
                            </button>
                            <button onClick={() => onUpdate(localDueDate, localNote)}
                                className="flex-1 h-11 bg-slate-900 text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all">
                                Kaydet & Kapat
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
