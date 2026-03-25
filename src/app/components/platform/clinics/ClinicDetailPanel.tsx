"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Clinic } from "@/types/database";

interface ClinicStats {
    patientCount: number;
    appointmentCount: number;
    appointmentLast30: number;
    userCount: number;
    paymentTotal: number;
    paymentCount: number;
    lastAppointmentDate: string | null;
}

interface PaymentHistoryRow {
    id: string;
    package_name: string;
    billing_period: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    paytr_order_id: string | null;
}

interface ClinicDetailPanelProps {
    clinic: Clinic | null;
    isOpen: boolean;
    onClose: () => void;
    onClinicUpdated?: (updated: Clinic) => void;
}

export function ClinicDetailPanel({ clinic, isOpen, onClose, onClinicUpdated }: ClinicDetailPanelProps) {
    const [stats, setStats] = useState<ClinicStats | null>(null);
    const [loading, setLoading] = useState(false);

    // Subscription management
    const [subStatus, setSubStatus] = useState("");
    const [billingCycle, setBillingCycle] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Payment history
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !clinic) return;
        setStats(null);
        setLoading(true);
        setSaveMsg(null);
        setShowCancelConfirm(false);

        // Sync subscription fields
        setSubStatus(clinic.subscription_status ?? "trialing");
        setBillingCycle(clinic.billing_cycle ?? "monthly");
        setPeriodEnd(clinic.current_period_end ? new Date(clinic.current_period_end).toISOString().slice(0, 16) : "");

        async function fetchData() {
            if (!clinic) return;
            const clinicId = clinic.id;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            setHistoryLoading(true);

            const [
                { count: patientCount },
                { count: appointmentCount },
                { count: appointmentLast30 },
                { count: userCount },
                { data: paymentsData },
                { data: lastAppt },
                { data: history },
            ] = await Promise.all([
                supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("starts_at", thirtyDaysAgo.toISOString()),
                supabase.from("users").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("payments").select("amount").eq("clinic_id", clinicId).eq("status", "paid"),
                supabase.from("appointments").select("starts_at").eq("clinic_id", clinicId).order("starts_at", { ascending: false }).limit(1),
                supabase.from("payment_history").select("id, package_name, billing_period, amount, currency, status, created_at, paytr_order_id").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(20),
            ]);

            const paymentTotal = (paymentsData || []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
            setStats({
                patientCount: patientCount ?? 0,
                appointmentCount: appointmentCount ?? 0,
                appointmentLast30: appointmentLast30 ?? 0,
                userCount: userCount ?? 0,
                paymentTotal,
                paymentCount: (paymentsData || []).length,
                lastAppointmentDate: lastAppt?.[0]?.starts_at ?? null,
            });
            setPaymentHistory(history ?? []);
            setLoading(false);
            setHistoryLoading(false);
        }

        fetchData();
    }, [isOpen, clinic]);

    if (!isOpen || !clinic) return null;

    const daysUntilExpiry = clinic.current_period_end
        ? Math.ceil((new Date(clinic.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    function adjustPeriod(days: number) {
        const base = periodEnd ? new Date(periodEnd) : new Date();
        base.setDate(base.getDate() + days);
        setPeriodEnd(base.toISOString().slice(0, 16));
        if (days > 0) setSubStatus("active");
        setSaveMsg(null);
    }

    async function handleSaveSubscription() {
        if (!clinic) return;
        setSaving(true);
        setSaveMsg(null);

        const { data, error } = await supabase
            .from("clinics")
            .update({
                subscription_status: subStatus,
                billing_cycle: billingCycle,
                current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
                last_payment_date: subStatus === "active" ? new Date().toISOString() : clinic.last_payment_date,
            })
            .eq("id", clinic.id)
            .select()
            .single();

        setSaving(false);
        if (error) {
            setSaveMsg({ ok: false, text: "Kayıt başarısız: " + error.message });
        } else {
            setSaveMsg({ ok: true, text: "Abonelik bilgileri güncellendi." });
            if (data && onClinicUpdated) onClinicUpdated(data as Clinic);
        }
    }

    async function handleCancelSubscription() {
        if (!clinic) return;
        setSaving(true);
        setSaveMsg(null);
        setShowCancelConfirm(false);

        const { data, error } = await supabase
            .from("clinics")
            .update({
                subscription_status: "canceled",
                current_period_end: new Date().toISOString(),
            })
            .eq("id", clinic.id)
            .select()
            .single();

        setSaving(false);
        if (error) {
            setSaveMsg({ ok: false, text: "İptal başarısız: " + error.message });
        } else {
            setSaveMsg({ ok: true, text: "Abonelik iptal edildi." });
            setSubStatus("canceled");
            setPeriodEnd(new Date().toISOString().slice(0, 16));
            if (data && onClinicUpdated) onClinicUpdated(data as Clinic);
        }
    }

    const statusLabel = (s: string) => {
        if (s === "trialing") return "Deneme";
        if (s === "active") return "Aktif";
        if (s === "past_due") return "Ödeme Gecikti";
        if (s === "canceled") return "İptal Edildi";
        return s;
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[50] bg-black/30 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 z-[51] w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white text-sm font-black">
                            {clinic.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white">{clinic.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/{clinic.slug}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Badges */}
                <div className="px-6 py-3 border-b flex items-center gap-2 flex-wrap shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${clinic.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {clinic.is_active ? "Aktif" : "Pasif"}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        clinic.subscription_status === "trialing" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        clinic.subscription_status === "active" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                        clinic.subscription_status === "canceled" ? "bg-slate-100 text-slate-500 border-slate-200" :
                        "bg-rose-50 text-rose-700 border-rose-100"
                    }`}>
                        {statusLabel(clinic.subscription_status ?? "")}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
                        {clinic.billing_cycle === "annual" ? "Yıllık" : clinic.billing_cycle === "monthly" ? "Aylık" : clinic.billing_cycle ?? "—"}
                    </span>
                    {daysUntilExpiry !== null && (
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${daysUntilExpiry <= 7 ? "bg-rose-50 text-rose-700" : daysUntilExpiry <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry}g kaldı` : "Süresi doldu"}
                        </span>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-4 border-slate-100 border-t-teal-500 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">İstatistikler yükleniyor...</p>
                        </div>
                    ) : stats ? (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Toplam Hasta", value: stats.patientCount, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-blue-600 bg-blue-50" },
                                    { label: "Toplam Randevu", value: stats.appointmentCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-teal-600 bg-teal-50" },
                                    { label: "Son 30 Gün Randevu", value: stats.appointmentLast30, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "text-indigo-600 bg-indigo-50" },
                                    { label: "Ekip Üyesi", value: stats.userCount, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "text-violet-600 bg-violet-50" },
                                ].map(({ label, value, icon, color }) => (
                                    <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 flex flex-col gap-2">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-slate-900">{value.toLocaleString("tr-TR")}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Abonelik Yönetimi ── */}
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Abonelik Yönetimi</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tight">Durum</label>
                                        <select
                                            value={subStatus}
                                            onChange={e => { setSubStatus(e.target.value); setSaveMsg(null); }}
                                            className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                        >
                                            <option value="trialing">Deneme (Trial)</option>
                                            <option value="active">Aktif</option>
                                            <option value="past_due">Ödeme Gecikti</option>
                                            <option value="canceled">İptal Edildi</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tight">Plan</label>
                                        <select
                                            value={billingCycle}
                                            onChange={e => { setBillingCycle(e.target.value); setSaveMsg(null); }}
                                            className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                        >
                                            <option value="monthly">Aylık</option>
                                            <option value="annual">Yıllık</option>
                                            <option value="pilot">Pilot</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Quick adjust buttons */}
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tight">Dönem Sonu Hızlı Ayar</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[
                                            { label: "−30g", days: -30, danger: true },
                                            { label: "−7g", days: -7, danger: true },
                                            { label: "+7g", days: 7, danger: false },
                                            { label: "+30g", days: 30, danger: false },
                                            { label: "+1 Yıl", days: 365, danger: false },
                                        ].map(({ label, days, danger }) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => adjustPeriod(days)}
                                                className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                                                    danger
                                                        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                        : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Period end date picker */}
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tight">Dönem Sonu Tarihi</label>
                                    <input
                                        type="datetime-local"
                                        value={periodEnd}
                                        onChange={e => { setPeriodEnd(e.target.value); setSaveMsg(null); }}
                                        className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                    />
                                </div>

                                {saveMsg && (
                                    <p className={`text-[10px] font-bold ${saveMsg.ok ? "text-emerald-600" : "text-rose-600"}`}>
                                        {saveMsg.text}
                                    </p>
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveSubscription}
                                        disabled={saving}
                                        className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {saving ? "KAYDEDİLİYOR..." : "KAYDET"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCancelConfirm(true)}
                                        disabled={saving || subStatus === "canceled"}
                                        className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                                    >
                                        İPTAL ET
                                    </button>
                                </div>

                                {/* Cancel confirm inline */}
                                {showCancelConfirm && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Aboneliği iptal ediyorsunuz</p>
                                        <p className="text-[10px] text-rose-600 font-medium">Durum &quot;İptal Edildi&quot; olarak işaretlenecek ve dönem sonu bugüne çekilecektir. Kliniğin erişimi kesilebilir.</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancelSubscription}
                                                className="flex-1 rounded-lg bg-rose-600 py-2 text-[9px] font-black uppercase tracking-widest text-white hover:bg-rose-700 active:scale-95 transition-all"
                                            >
                                                EVET, İPTAL ET
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowCancelConfirm(false)}
                                                className="flex-1 rounded-lg border border-rose-200 py-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-100 active:scale-95 transition-all"
                                            >
                                                VAZGEÇ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Summary (clinic internal payments) */}
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Klinik İçi Ödemeler</p>
                                <p className="text-3xl font-black text-slate-900">
                                    {stats.paymentTotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                                </p>
                                <p className="text-xs text-slate-500 font-medium mt-1">{stats.paymentCount} adet ödeme kaydı</p>
                            </div>

                            {/* PayTR Subscription Payment History */}
                            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                                <div className="px-5 py-3.5 border-b bg-slate-50/50 flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Abonelik Ödemeleri</p>
                                    {historyLoading && <div className="w-4 h-4 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin" />}
                                </div>
                                {!historyLoading && paymentHistory.length === 0 ? (
                                    <div className="px-5 py-6 text-center">
                                        <p className="text-xs text-slate-400 font-medium">Henüz abonelik ödemesi yok.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {paymentHistory.map(ph => (
                                            <div key={ph.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{ph.package_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                        {new Date(ph.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                                                        {" · "}
                                                        {ph.billing_period === "annual" ? "Yıllık" : ph.billing_period === "monthly" ? "Aylık" : ph.billing_period}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-sm font-black text-slate-900">
                                                        {ph.amount.toLocaleString("tr-TR")} {ph.currency}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                        ph.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                                    }`}>
                                                        {ph.status === "paid" ? "ÖDENDİ" : "BAŞARISIZ"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Clinic Info */}
                            <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klinik Bilgileri</p>
                                {[
                                    { label: "E-posta", value: clinic.email },
                                    { label: "Telefon", value: clinic.phone },
                                    { label: "Adres", value: clinic.address },
                                    { label: "Kayıt Tarihi", value: new Date(clinic.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) },
                                    { label: "Son Randevu", value: stats.lastAppointmentDate ? new Date(stats.lastAppointmentDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—" },
                                    { label: "Dönem Sonu", value: clinic.current_period_end ? new Date(clinic.current_period_end).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
                                ].map(({ label, value }) => value ? (
                                    <div key={label} className="flex items-start justify-between gap-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight shrink-0">{label}</span>
                                        <span className="text-xs font-bold text-slate-700 text-right">{value}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50/50 shrink-0">
                    <a
                        href={`/${clinic.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-teal-600 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-95 transition-all"
                    >
                        KLİNİK PANELİNE GİT
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </a>
                </div>
            </div>
        </>
    );
}
