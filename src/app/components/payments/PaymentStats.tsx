"use client";
import React, { useState } from "react";

interface MethodBreakdown {
    method: string;
    amount: number;
    count: number;
    percent: number;
}

interface PaymentStatsProps {
    stats: { total: number; paid: number; planned: number; count: number; insurancePending: number; overdueCount: number; methodBreakdown?: MethodBreakdown[]; collectionRate?: number };
}

export function PaymentStats({ stats }: PaymentStatsProps) {
    const [rateOpen, setRateOpen] = useState(false);
    const [methodOpen, setMethodOpen] = useState(false);

    const showRate = stats.collectionRate !== undefined && stats.total > 0;
    const showMethod = !!(stats.methodBreakdown && stats.methodBreakdown.length > 0);

    return (
        <div className="space-y-3">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
                {/* Toplam Tutar */}
                <StatCard
                    label="Toplam Tutar"
                    description="toplam tutar"
                    value={stats.total}
                    gradient="brand"
                    shadowClass="shadow-indigo-200/40 hover:shadow-indigo-300/50"
                    icon={
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    }
                />
                {/* Tahsil Edilen */}
                <StatCard
                    label="Tahsil Edilen"
                    description="ödeme alındı"
                    value={stats.paid}
                    gradient="brand-alt"
                    shadowClass="shadow-purple-200/40 hover:shadow-purple-300/50"
                    icon={
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    }
                />
                {/* Bekleyen */}
                <StatCard
                    label="Bekleyen"
                    description={stats.overdueCount > 0 ? `${stats.overdueCount} gecikmiş` : "bekleyen ödeme"}
                    value={stats.planned}
                    gradient="from-amber-400 via-amber-500 to-orange-500"
                    shadowClass="shadow-amber-200/60 hover:shadow-amber-300/70"
                    hasAlert={stats.overdueCount > 0}
                    icon={
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    }
                />
                {/* Kayıt Sayısı */}
                <StatCard
                    label="Kayıt Sayısı"
                    description="ödeme kaydı"
                    value={stats.count}
                    gradient="from-slate-500 via-slate-600 to-slate-700"
                    shadowClass="shadow-slate-200/60 hover:shadow-slate-300/70"
                    isNumber
                    icon={
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    }
                />
            </div>

            {(showRate || showMethod) && (
                <div className={`grid gap-3 items-start ${showRate && showMethod ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                    {showRate && (
                        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setRateOpen(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        style={{ background: stats.collectionRate! >= 80 ? `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` : undefined }}
                                        className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-sm shrink-0 ${stats.collectionRate! >= 80 ? "" : stats.collectionRate! >= 50 ? "from-amber-400 to-orange-400 bg-gradient-to-br" : "from-rose-400 to-red-500 bg-gradient-to-br"}`}
                                    >
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tahsilat Oranı</p>
                                        <p
                                            style={{ color: stats.collectionRate! >= 80 ? 'var(--brand-from)' : undefined }}
                                            className={`text-sm font-black ${stats.collectionRate! >= 80 ? "" : stats.collectionRate! >= 50 ? "text-amber-600" : "text-rose-600"}`}
                                        >
                                            %{stats.collectionRate}
                                        </p>
                                    </div>
                                </div>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${rateOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            {rateOpen && (
                                <div className="px-4 pb-4 border-t pt-3 space-y-2">
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${stats.collectionRate! >= 80 ? "" : stats.collectionRate! >= 50 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-rose-400 to-red-500"}`}
                                            style={{
                                                width: `${stats.collectionRate}%`,
                                                background: stats.collectionRate! >= 80 ? `linear-gradient(to right, var(--brand-from), var(--brand-to))` : undefined,
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {stats.paid.toLocaleString("tr-TR")} ₺ tahsil edildi / {stats.total.toLocaleString("tr-TR")} ₺ toplam
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {showMethod && (
                        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setMethodOpen(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 shadow-sm shrink-0">
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tahsilat Yöntemi Dağılımı</p>
                                        <p className="text-sm font-black text-slate-700">{stats.methodBreakdown!.length} yöntem</p>
                                    </div>
                                </div>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${methodOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            {methodOpen && (
                                <div className="px-4 pb-4 border-t pt-3 space-y-2">
                                    {stats.methodBreakdown!.map(({ method, amount, count, percent }) => (
                                        <div key={method} className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold text-slate-600 w-24 shrink-0 truncate">{method}</span>
                                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${percent}%`,
                                                        backgroundColor: 'var(--brand-from)'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 w-8 text-right shrink-0">{percent}%</span>
                                            <span className="text-[10px] font-bold text-slate-400 w-20 text-right shrink-0 hidden sm:block">
                                                {amount.toLocaleString("tr-TR")} ₺
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300 shrink-0 hidden sm:block">({count})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {stats.insurancePending > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm shrink-0">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Sigorta Alacağı</p>
                        <p className="text-lg font-bold text-blue-800">{stats.insurancePending.toLocaleString("tr-TR")} <span className="text-sm font-semibold">₺</span></p>
                    </div>
                    <span className="text-[9px] font-black text-blue-400 bg-blue-100 px-2 py-1 rounded-lg uppercase tracking-wide whitespace-nowrap">Beklemede</span>
                </div>
            )}
        </div>
    );
}

interface StatCardProps {
    label: string;
    description: string;
    value: number;
    gradient: string;
    shadowClass: string;
    icon: React.ReactNode;
    isNumber?: boolean;
    hasAlert?: boolean;
}

function StatCard({ label, description, value, gradient, shadowClass, icon, isNumber, hasAlert }: StatCardProps) {
    const isBrand = gradient === 'brand';
    const isBrandAlt = gradient === 'brand-alt';

    const bgStyle = isBrand
        ? { background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` }
        : isBrandAlt
            ? { background: `linear-gradient(to bottom right, var(--brand-to), var(--brand-from))` }
            : {};

    const gradientClass = (isBrand || isBrandAlt) ? "" : `bg-gradient-to-br ${gradient}`;

    return (
        <div
            style={bgStyle}
            className={`relative rounded-2xl overflow-hidden px-4 py-3.5 ${gradientClass} shadow-lg ${shadowClass} hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-44 md:w-auto`}
        >
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute right-2 bottom-2 opacity-[0.12]">
                {icon}
            </div>
            {hasAlert && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/70 mb-1">{label}</p>
            <p className="text-3xl font-black text-white leading-none">
                {value.toLocaleString("tr-TR")}
                {!isNumber && <span className="text-lg font-semibold"> ₺</span>}
            </p>
            <p className="text-[10px] text-white/70 font-semibold mt-1.5">{description}</p>
        </div>
    );
}
