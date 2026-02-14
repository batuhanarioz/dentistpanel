"use client";

import { useState } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";

export default function SubscriptionPage() {
    const clinic = useClinic();
    usePageHeader("Abonelik & Kullanım", "Paket yönetimi ve mesaj kotası takibi");

    const [activePlanInfo, setActivePlanInfo] = useState<string | null>(null);

    const planDetails: Record<string, { name: string; limit: string; price: string; details: string[] }> = {
        starter: {
            name: "Starter",
            limit: "1.000",
            price: "499₺",
            details: ["1 Doktor Sınırı", "Temel Raporlama", "Haftalık Analiz", "Standart Destek"]
        },
        pro: {
            name: "Pro",
            limit: "5.000",
            price: "999₺",
            details: ["5 Doktor Sınırı", "Gelişmiş Raporlar", "WhatsApp Hatırlatıcılar", "AI Destekli Analizler"]
        },
        enterprise: {
            name: "Enterprise",
            limit: "25.000",
            price: "2.499₺",
            details: ["Sınırsız Doktor", "Tam Raporlama", "Özel Entegrasyonlar", "Öncelikli Destek (7/24)"]
        },
        trial: {
            name: "Deneme (Trial)",
            limit: "1.000",
            price: "Ücretsiz",
            details: ["7 Günlük Deneme", "Tüm Özellikler Açık", "100 Kredi Hediye"]
        },
    };

    const currentPlan = planDetails[clinic.planId || "starter"] || planDetails.starter;

    function stats_credits_calculation(credits: number, limitStr: string) {
        const limit = parseInt(limitStr.replace(".", ""));
        return Math.max(0, limit - credits);
    }

    const stats = {
        monthlyMessages: parseInt(currentPlan.limit.replace(".", "")),
        usedMessages: stats_credits_calculation(clinic.credits, currentPlan.limit),
        planName: currentPlan.name,
        expiryDate: clinic.trialEndsAt || "2025-12-31",
        status: clinic.trialEndsAt ? (new Date(clinic.trialEndsAt) > new Date() ? "active" : "expired") : "active",
    };

    const usagePercent = Math.min(100, (stats.usedMessages / stats.monthlyMessages) * 100);

    if (!clinic.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
                    <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-900">Yetkisiz Erişim</p>
                <p className="text-xs text-slate-500">Bu sayfayı yalnızca yönetici yetkisine sahip kullanıcılar görüntüleyebilir.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6" onClick={() => setActivePlanInfo(null)}>
            <div className="grid gap-6 md:grid-cols-2">
                {/* Sol Kolon: Mevcut Durum */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 -m-4 h-24 w-24 rounded-full bg-teal-50/50 blur-2xl group-hover:bg-teal-100/50 transition-colors" />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Mevcut Plan</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-2xl font-bold text-slate-900">{stats.planName}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${stats.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {stats.status === 'active' ? 'Aktif' : 'Süresi Doldu'}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                    </svg>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-600">Mesaj Kullanımı</span>
                                    <span className="text-slate-900 font-bold">{stats.usedMessages.toLocaleString()} / {stats.monthlyMessages.toLocaleString()}</span>
                                </div>
                                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-[2px] border">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                                    * {clinic.planId === 'trial' ? 'Deneme süreniz bittiğinde hesabınız duraklatılır.' : 'Mesaj kotanız her ayın 1\'inde otomatik olarak yenilenir.'}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{clinic.planId === 'trial' ? 'Deneme Bitiş' : 'Yenileme Tarihi'}</p>
                                    <p className="text-sm font-semibold text-slate-800">{new Date(stats.expiryDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kalan Kredi</p>
                                    <p className="text-sm font-semibold text-slate-800">{clinic.credits} Kredi</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-6">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Otomasyon Durumu</h4>
                                <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                                    {clinic.automationsEnabled
                                        ? "Otomasyon modülü kliniğiniz için aktif edildi. Aşağıdaki listeden aktif servislerinizi görebilirsiniz."
                                        : "Otomasyon modülü şu an pasif. Etkinleştirmek için lütfen sistem yöneticisi ile iletişime geçin."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Kolon: Paket Yükseltme */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden relative">
                    <div className="p-8 border-b bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-900">Paket Detayları</h3>
                        <p className="text-sm text-slate-500 mt-1">Paketinize dahil olan özellikler ve limitler.</p>
                    </div>

                    <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[460px] scrollbar-hide">
                        {Object.entries(planDetails).filter(([id]) => id !== 'trial').map(([id, plan]) => (
                            <div
                                key={id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePlanInfo(activePlanInfo === id ? null : id);
                                }}
                                className={`relative rounded-2xl border-2 p-4 transition-all cursor-pointer ${clinic.planId === id ? 'border-teal-500 bg-teal-50/10' : 'border-teal-500/30'}`}
                            >
                                {clinic.planId === id && (
                                    <span className="absolute -top-2.5 right-4 rounded-full bg-teal-500 px-3 py-1 text-[9px] font-bold text-white uppercase tracking-wider">Mevcut Paketiniz</span>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900">{plan.name}</h4>
                                        <div className="text-teal-500">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-900">{plan.price}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">aylık</p>
                                    </div>
                                </div>

                                {/* Popover Detail */}
                                {activePlanInfo === id && (
                                    <div className="mt-3 p-3 rounded-xl bg-white border border-slate-100 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Paket Özellikleri</h5>
                                        <ul className="space-y-1.5">
                                            {plan.details.map((d, i) => (
                                                <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                                                    <svg className="h-3 w-3 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    </svg>
                                                    {d}
                                                </li>
                                            ))}
                                            <li className="flex items-center gap-2 text-[11px] text-slate-600">
                                                <svg className="h-3 w-3 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                                {plan.limit} Mesaj/Ay
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t bg-slate-50/50 text-center">
                        <p className="text-[11px] text-slate-500">Paket değişikliği talepleriniz için sistem yöneticisine başvurabilirsiniz.</p>
                    </div>
                </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100">
                            <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455-2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">Aktif Otomasyonlar</h3>
                                <span className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">n8n Engine</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Sistem yöneticisi tarafından kliniğinize atanan akıllı servisler</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    {clinic.n8nWorkflows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">Henüz atanmış otomasyon bulunmuyor.</p>
                            <p className="text-xs text-slate-400 mt-1">Gerekli otomasyonlar için merkez yönetim ile iletişime geçin.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {clinic.n8nWorkflows.map(wf => (
                                <AutomationCard
                                    key={wf.id}
                                    icon={<svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                    iconBg="bg-indigo-50"
                                    title={wf.name}
                                    desc=""
                                    enabled={wf.enabled}
                                    schedule="Real-time"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AutomationCard({
    icon,
    iconBg,
    title,
    desc,
    enabled,
    schedule,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    desc: string;
    enabled: boolean;
    schedule: string;
}) {
    return (
        <div className={`rounded-2xl border bg-white p-5 transition-all group overflow-hidden relative ${enabled ? 'border-slate-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5' : 'border-slate-100 opacity-75'}`}>
            <div className="absolute top-0 right-0 -m-8 h-24 w-24 rounded-full bg-slate-50/50 group-hover:bg-indigo-50/50 transition-colors -z-0" />
            <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-sm`}>
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 leading-tight">{title}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={`flex h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>
                    </div>
                </div>
                {desc && <p className="text-[10px] text-slate-400 font-mono truncate bg-slate-50 p-1 rounded border border-slate-100">{desc}</p>}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Durum</span>
                        <span className={`text-[11px] font-semibold ${enabled ? 'text-emerald-600' : 'text-slate-500'}`}>{enabled ? 'Çalışıyor' : 'Durduruldu'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Zamanlama</span>
                        <span className="text-[11px] font-semibold text-indigo-600">{schedule}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
