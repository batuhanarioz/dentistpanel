"use client";

import { useState, useEffect, useMemo } from "react";
import { createPayments } from "@/lib/api";
import { useClinic } from "@/app/context/ClinicContext";
import { localDateStr } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import type { PaymentStatus } from "@/types/database";
import { isPaid, isCancelled } from "@/constants/payments";
import toast from "react-hot-toast";

interface QuickPaymentModalProps {
    open: boolean;
    setValues?: (val: unknown) => void;
    onClose: () => void;
    appointmentId: string;
    patientId?: string;
    patientName: string;
    initialAmount: number;
    onSuccess: () => void;
    checklistItemId?: string;
    code?: string;
}

interface InstallmentRow {
    amount: number;
    method: string;
    dueDate: string;
}

interface ExistingPaymentRow {
    id: string;
    amount: number | string;
    status: string;
    due_date: string;
    agreed_total: number;
    method: string;
    installment_number: number | null;
    clinic_id: string;
}

interface AppointmentInfo {
    id: string;
    clinic_id: string;
    starts_at: string;
    ends_at: string;
    treatment_type: string | null;
    doctor: { full_name: string } | { full_name: string }[] | null;
}

export function QuickPaymentModal({
    open, setValues, onClose, appointmentId, patientId, patientName, initialAmount, onSuccess, checklistItemId, code
}: QuickPaymentModalProps) {
    const clinic = useClinic();
    const [amount, setAmount] = useState<number>(initialAmount);
    const [globalMethod, setGlobalMethod] = useState<string>("Nakit");
    const [count, setCount] = useState<number>(1);
    const [installmentList, setInstallmentList] = useState<InstallmentRow[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [existingPayments, setExistingPayments] = useState<ExistingPaymentRow[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [agreedTotal, setAgreedTotal] = useState<number>(initialAmount);
    const [appointmentDetails, setAppointmentDetails] = useState<AppointmentInfo | null>(null);
    const [matchedPaymentId, setMatchedPaymentId] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !appointmentId) return;
        let isMounted = true;
        setLoadingExisting(true);

        const fetchDetails = async () => {
            const [payRes, appRes] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase.from('payments').select('id, amount, status, due_date, agreed_total, method, installment_number, clinic_id').eq('appointment_id', appointmentId).order('due_date', { ascending: true }),
                supabase.from('appointments').select('id, clinic_id, starts_at, ends_at, treatment_type, doctor:users(full_name)').eq('id', appointmentId).single()
            ]);

            if (!isMounted) return;

            if (!appRes.error && appRes.data) {
                setAppointmentDetails(appRes.data);
            }

            if (!payRes.error && payRes.data) {
                const rows = payRes.data as ExistingPaymentRow[];
                setExistingPayments(rows);

                // Eğer DUE_PAYMENT_FOLLOWUP ise BUGÜNÜN taksitini bulmaya çalış
                const todayStr = localDateStr();
                const todayPayment = rows.find((p) =>
                    p.due_date === todayStr &&
                    p.status !== 'paid' &&
                    p.status !== 'cancelled'
                );

                if (todayPayment && (code === 'DUE_PAYMENT_FOLLOWUP' || code === 'MISSING_PAYMENT')) {
                    setAmount(Number(todayPayment.amount));
                    setGlobalMethod(todayPayment.method || 'Nakit');
                    setMatchedPaymentId(todayPayment.id);
                } else {
                    const maxAgreed = rows.reduce((max, p) => Math.max(max, p.agreed_total || 0), 0);
                    const fetchedAgreed = maxAgreed > 0 ? maxAgreed : initialAmount;
                    setAgreedTotal(fetchedAgreed);
                    const totalPaidCents = rows.reduce((sum, p) => sum + Math.round(Number(p.amount || 0) * 100), 0);
                    const remaining = Math.max(0, fetchedAgreed - totalPaidCents / 100);
                    setAmount(remaining);
                }
            }
            setLoadingExisting(false);
        };

        fetchDetails();

        return () => { isMounted = false; };
    }, [open, appointmentId, initialAmount, code]);

    // Initial load and whenever amount/count changes (if not manually edited)
    useEffect(() => {
        if (!open) return;

        const installmentAmount = Math.round((amount / count) * 100) / 100;
        const newList: InstallmentRow[] = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(now);
            dueDate.setMonth(now.getMonth() + i);

            newList.push({
                amount: i === count - 1 ? (Math.round((amount - (installmentAmount * (count - 1))) * 100) / 100) : installmentAmount,
                method: globalMethod,
                dueDate: localDateStr(dueDate)
            });
        }
        setInstallmentList(newList);
    }, [amount, count, globalMethod, open]);

    const totalInstallmentsAmount = useMemo(() => {
        return installmentList.reduce((sum, item) => sum + item.amount, 0);
    }, [installmentList]);

    const totalPaid = useMemo(() => {
        const cents = existingPayments.reduce((sum, p) => sum + Math.round(Number(p.amount || 0) * 100), 0);
        return cents / 100;
    }, [existingPayments]);

    if (!open) return null;

    const handleUpdateInstallment = <K extends keyof InstallmentRow>(index: number, field: K, value: InstallmentRow[K]) => {
        const newList = [...installmentList];
        newList[index] = { ...newList[index], [field]: value };
        setInstallmentList(newList);
    };

    const handleSave = async () => {
        if (amount <= 0) {
            setError("Geçerli bir tutar giriniz.");
            return;
        }

        if (Math.abs(totalInstallmentsAmount - amount) > 0.01) {
            setError(`Taksitlerin toplamı (${totalInstallmentsAmount.toLocaleString()} ₺) ana tutarla (${amount.toLocaleString()} ₺) aynı olmalıdır.`);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            if (matchedPaymentId && count === 1) {
                // Mevcut kaydı GÜNCELLE
                const { error: updateError } = await supabase
                    .from('payments')
                    .update({
                        amount: amount,
                        method: globalMethod,
                        status: 'paid',
                        paid_at: new Date().toISOString()
                    })
                    .eq('id', matchedPaymentId)
                    .eq('clinic_id', clinic.clinicId);

                if (updateError) throw updateError;
            } else {
                // YENİ KAYITLAR OLUŞTUR
                const paymentsToCreate = installmentList.map((item, i) => ({
                    appointment_id: appointmentId || null,
                    patient_id: patientId,
                    amount: item.amount,
                    agreed_total: agreedTotal > 0 ? agreedTotal : amount,
                    method: item.method,
                    status: (i === 0 && item.dueDate === localDateStr() ? "paid" : "pending") as PaymentStatus,
                    due_date: item.dueDate,
                    installment_count: count,
                    installment_number: i + 1,
                    clinic_id: clinic.clinicId || undefined
                }));

                if (!clinic.clinicId) {
                    setError("Klinik ID bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
                    setSaving(false);
                    return;
                }

                const { error: saveError } = await createPayments(paymentsToCreate);
                if (saveError) throw saveError;
            }

            // Randevuya ait tüm ödeme checklist item'larını tamamlandı olarak işaretle
            await supabase.from("checklist_items")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("appointment_id", appointmentId)
                .eq("clinic_id", clinic.clinicId)
                .in("code", ["MISSING_PAYMENT", "DUE_PAYMENT_FOLLOWUP"]);

            toast.success("Ödeme başarıyla kaydedildi");
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Payment save error:", err);
            const msg = (err as Error).message;
            setError("Ödeme kaydedilemedi: " + msg);
            toast.error("Ödeme kaydedilemedi");
        } finally {
            setSaving(false);
        }
    };

    const handlePostpone = async () => {
        if (!matchedPaymentId) return;
        setSaving(true);
        setError(null);
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { error: updateError } = await supabase
                .from('payments')
                .update({ due_date: localDateStr(tomorrow) })
                .eq('id', matchedPaymentId)
                .eq('clinic_id', clinic.clinicId);

            if (updateError) throw updateError;

            toast.success("Ödeme bir gün ertelendi");
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Postpone error:", err);
            setError("Ertelenemedi: " + (err as Error).message);
            toast.error("Erteleme başarısız");
        } finally {
            setSaving(false);
        }
    };

    const handleMarkAsCancelled = async () => {
        if (!matchedPaymentId) return;
        if (!confirm("Bu ödeme kaydını iptal etmek istediğinize emin misiniz?")) return;

        setSaving(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('payments')
                .update({ status: 'cancelled' })
                .eq('id', matchedPaymentId)
                .eq('clinic_id', clinic.clinicId);

            if (updateError) throw updateError;

            toast.success("Ödeme iptal edildi");
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Cancel payment error:", err);
            setError("İptal edilemedi: " + (err as Error).message);
            toast.error("İptal işlemi başarısız");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Detaylı Tahsilat & Taksit</h2>
                            <p className="text-emerald-100 text-xs mt-1">{patientName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">

                    {/* Mevcut Ödemeler Özeti */}
                    {loadingExisting ? (
                        <div className="text-center p-4 text-xs font-bold text-slate-400 animate-pulse">
                            Önceki ödeme/taksit bilgileri yükleniyor...
                        </div>
                    ) : existingPayments.length > 0 ? (
                        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <h3 className="text-amber-800 font-bold mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Bu Randevunun Devam Eden Bir Ödeme Planı Var
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm mt-3">
                                <div className="bg-white px-4 py-3 rounded-2xl border border-amber-100 flex-1 min-w-[120px] shadow-sm">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Anlaşılan Toplam</div>
                                    <div className="text-lg font-black text-slate-700">{agreedTotal.toLocaleString()} ₺</div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl border border-amber-100 flex-1 min-w-[120px] shadow-sm">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Girilen Toplam</div>
                                    <div className="text-lg font-black text-emerald-600">{totalPaid.toLocaleString()} ₺</div>
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl border border-rose-100 bg-rose-50/30 flex-1 min-w-[120px] shadow-sm">
                                    <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Eksik Bakiye</div>
                                    <div className="text-lg font-black text-rose-600">{Math.max(0, agreedTotal - totalPaid).toLocaleString()} ₺</div>
                                </div>
                            </div>

                            <div className="mt-4 bg-white/60 rounded-2xl p-4 border border-amber-100/50">
                                <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">Sistemde Kayıtlı Olan Taksitler</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {existingPayments.map((ep, idx) => (
                                        <div key={ep.id} className="flex items-center justify-between text-xs font-bold bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span>{isPaid(ep.status) ? '✅' : isCancelled(ep.status) ? '❌' : '⏳'}</span>
                                                <span className={`${isCancelled(ep.status) ? 'line-through text-slate-400' : 'text-slate-700'}`}>Taksit {ep.installment_number || idx + 1}: {ep.due_date ? new Date(ep.due_date).toLocaleDateString('tr-TR') : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`${isCancelled(ep.status) ? 'line-through text-slate-400' : 'text-slate-900'}`}>{Number(ep.amount).toLocaleString()} ₺</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Hızlı Tahsilat Bilgisi */}
                    {matchedPaymentId && (
                        <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-2xl mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-cyan-500 text-white p-2 rounded-xl">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black text-cyan-800 uppercase tracking-tight">Bugün Vadesi Gelen Taksit Tahsilatı</p>
                                <p className="text-[10px] text-cyan-600 font-bold">Bu ödeme planlı bir taksiti kapsar. Kaydettiğinizde taksit &quot;Ödendi&quot; olarak işaretlenecektir.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Global Settings */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GİRİLECEK YENİ TUTAR</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount === 0 ? "" : amount}
                                        onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                                        className="w-full text-4xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-emerald-500 transition-colors py-2 focus:outline-none pr-10"
                                    />
                                    <span className="absolute right-0 bottom-3 text-2xl font-bold text-slate-300">₺</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GENEL ÖDEME YÖNTEMİ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Nakit", "Kredi Kartı", "Havale"].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setGlobalMethod(m)}
                                            className={`py-2 rounded-xl border-2 text-[11px] font-bold transition-all ${globalMethod === m
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                                : "border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!matchedPaymentId && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <label>TAKSİT SAYISI</label>
                                        <span className="text-emerald-600">{count} TAKSİT</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="12"
                                        step="1"
                                        value={count}
                                        onChange={(e) => setCount(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                            )}

                            {/* Randevu Kısa Bilgisi */}
                            {appointmentDetails && (
                                <div className="mt-8 p-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        İlgili Randevu Bilgisi
                                    </h3>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-[0.5]">
                                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Tarih</div>
                                            <div className="text-sm font-bold text-slate-700">{new Date(appointmentDetails.starts_at).toLocaleDateString('tr-TR')}</div>
                                            <div className="text-xs font-semibold text-slate-500">{new Date(appointmentDetails.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200"></div>
                                        <div className="flex-1">
                                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">İşlem Türü & Hekim</div>
                                            <div className="text-sm font-bold text-slate-700">{appointmentDetails.treatment_type || 'Belirtilmemiş'}</div>
                                            <div className="text-xs font-semibold text-slate-500">{(Array.isArray(appointmentDetails.doctor) ? appointmentDetails.doctor[0]?.full_name : appointmentDetails.doctor?.full_name) || 'Hekim Atanmamış'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* List Visualization - Hide for quick followup */}
                        {!matchedPaymentId ? (
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 h-full overflow-hidden flex flex-col">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">ÖDEME PLANI</h3>
                                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                    {installmentList.map((item, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-right-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="date"
                                                        value={item.dueDate}
                                                        onChange={(e) => handleUpdateInstallment(idx, "dueDate", e.target.value)}
                                                        className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={item.amount === 0 ? "" : item.amount}
                                                        onChange={(e) => handleUpdateInstallment(idx, "amount", e.target.value === "" ? 0 : Number(e.target.value))}
                                                        className="w-full text-sm font-bold text-slate-900 p-2 bg-slate-50 rounded-lg border border-transparent focus:border-emerald-500 focus:outline-none"
                                                    />
                                                    <span className="absolute right-2 top-2 text-xs font-bold text-slate-300">₺</span>
                                                </div>
                                                <select
                                                    value={item.method}
                                                    onChange={(e) => handleUpdateInstallment(idx, "method", e.target.value)}
                                                    className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border-none focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value="Nakit">Nakit</option>
                                                    <option value="Kredi Kartı">Kart</option>
                                                    <option value="Havale">Havale</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center font-bold">
                                    <span className={`text-[10px] ${Math.abs(totalInstallmentsAmount - amount) > 0.01 ? 'text-rose-500' : 'text-slate-400'}`}>TOPLAM:</span>
                                    <span className={`text-sm ${Math.abs(totalInstallmentsAmount - amount) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {totalInstallmentsAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 h-full flex flex-col justify-center items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                                    <svg className="w-8 h-8 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-700">Tahsilat Onayı</h4>
                                    <p className="text-[11px] text-slate-400 mt-2">Bu işlem bugün planlanan taksit tahsilatını kapatacaktır. Ödeme tutarı ve yöntemi soldaki panelden değiştirilebilir.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2 animate-shake">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>{matchedPaymentId ? '✅ Tahsilatı Onayla' : 'Tüm İşlemleri Kaydet'}</>
                            )}
                        </button>

                        {matchedPaymentId && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handlePostpone}
                                    disabled={saving}
                                    className="py-3.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all border border-amber-200/50 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Yarına Ertele
                                </button>
                                <button
                                    onClick={handleMarkAsCancelled}
                                    disabled={saving}
                                    className="py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all border border-rose-200/50 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Ödenmedi / İptal
                                </button>
                            </div>
                        )}
                    </div>
                    {!matchedPaymentId && (
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">Toplam {count} adet ödeme kaydı oluşturulacaktır.</p>
                    )}
                    {matchedPaymentId && (
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest font-black opacity-60">Planlı Taksit İşlemi</p>
                    )}
                </div>
            </div>
        </div>
    );
}
