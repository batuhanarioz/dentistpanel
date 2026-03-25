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

interface ClinicDetailPanelProps {
    clinic: Clinic | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ClinicDetailPanel({ clinic, isOpen, onClose }: ClinicDetailPanelProps) {
    const [stats, setStats] = useState<ClinicStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !clinic) return;
        setStats(null);
        setLoading(true);

        async function fetchStats() {
            if (!clinic) return;
            const clinicId = clinic.id;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

            const [
                { count: patientCount },
                { count: appointmentCount },
                { count: appointmentLast30 },
                { count: userCount },
                { data: paymentsData },
                { data: lastAppt },
            ] = await Promise.all([
                supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("starts_at", thirtyDaysAgoStr),
                supabase.from("users").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
                supabase.from("payments").select("amount").eq("clinic_id", clinicId).eq("status", "paid"),
                supabase.from("appointments").select("starts_at").eq("clinic_id", clinicId).order("starts_at", { ascending: false }).limit(1),
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
            setLoading(false);
        }

        fetchStats();
    }, [isOpen, clinic]);

    if (!isOpen || !clinic) return null;

    const daysUntilExpiry = clinic.current_period_end
        ? Math.ceil((new Date(clinic.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[50] bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 z-[51] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
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
                <div className="px-6 py-3 border-b flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${clinic.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {clinic.is_active ? "Aktif" : "Pasif"}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${clinic.subscription_status === "trialing" ? "bg-amber-50 text-amber-700 border-amber-100" : clinic.subscription_status === "active" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                        {clinic.subscription_status === "trialing" ? "Deneme" : clinic.subscription_status === "active" ? "Abone" : clinic.subscription_status}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
                        {clinic.billing_cycle === "annual" ? "Yıllık" : clinic.billing_cycle === "monthly" ? "Aylık" : clinic.billing_cycle}
                    </span>
                    {daysUntilExpiry !== null && (
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${daysUntilExpiry <= 7 ? "bg-rose-50 text-rose-700" : daysUntilExpiry <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry}g kaldı` : "Süresi doldu"}
                        </span>
                    )}
                </div>

                {/* Content */}
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
                                            <svg className="h-4.5 w-4.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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

                            {/* Payment Summary */}
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Tahsil Edilen Ödemeler</p>
                                <p className="text-3xl font-black text-slate-900">
                                    {stats.paymentTotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                                </p>
                                <p className="text-xs text-slate-500 font-medium mt-1">{stats.paymentCount} adet ödeme kaydı</p>
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
