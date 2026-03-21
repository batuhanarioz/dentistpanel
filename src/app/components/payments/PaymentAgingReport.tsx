"use client";
import React, { useMemo, useState } from "react";
import { PaymentRow } from "@/hooks/usePaymentManagement";
import { isPending, isPartial, isCancelled } from "@/constants/payments";

interface PaymentAgingReportProps {
    payments: PaymentRow[];
    today: string;
}

interface AgingBucket {
    label: string;
    minDays: number;
    maxDays: number | null;
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeColor: string;
}

const BUCKETS: AgingBucket[] = [
    { label: "1–30 Gün", minDays: 1, maxDays: 30, bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-800", badgeColor: "bg-amber-100 text-amber-700" },
    { label: "31–60 Gün", minDays: 31, maxDays: 60, bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-800", badgeColor: "bg-orange-100 text-orange-700" },
    { label: "61–90 Gün", minDays: 61, maxDays: 90, bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-800", badgeColor: "bg-rose-100 text-rose-700" },
    { label: "90+ Gün", minDays: 91, maxDays: null, bgColor: "bg-red-50", borderColor: "border-red-300", textColor: "text-red-900", badgeColor: "bg-red-100 text-red-800" },
];

function daysBetween(dateStr: string, today: string): number {
    const a = new Date(today).getTime();
    const b = new Date(dateStr).getTime();
    return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

export function PaymentAgingReport({ payments, today }: PaymentAgingReportProps) {
    const [expanded, setExpanded] = useState(false);

    const { buckets, totalOverdue, totalPatients } = useMemo(() => {
        const overdue = payments.filter(p =>
            !isCancelled(p.status) &&
            (isPending(p.status) || isPartial(p.status)) &&
            p.due_date &&
            p.due_date < today
        );

        const results = BUCKETS.map(b => {
            const items = overdue.filter(p => {
                const days = daysBetween(p.due_date!, today);
                return days >= b.minDays && (b.maxDays === null || days <= b.maxDays);
            });
            const uniquePatients = new Set(items.map(p => p.patient?.full_name ?? "unknown")).size;
            const total = items.reduce((s, p) => s + p.amount, 0);
            return { ...b, items, total, count: items.length, uniquePatients };
        });

        const allOverdue = overdue;
        const totalAmount = allOverdue.reduce((s, p) => s + p.amount, 0);
        const patientsSet = new Set(allOverdue.map(p => p.patient?.full_name ?? "unknown"));

        return { buckets: results, totalOverdue: totalAmount, totalPatients: patientsSet.size };
    }, [payments, today]);

    if (totalOverdue === 0) return null;

    return (
        <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-sm shrink-0">
                        <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alacak Yaşlandırma Raporu</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {totalOverdue.toLocaleString("tr-TR")} ₺ <span className="text-slate-400 font-medium text-xs">· {totalPatients} hastada gecikmiş alacak</span>
                        </p>
                    </div>
                </div>
                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-3 border-t">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                        {buckets.map(b => (
                            <div key={b.label} className={`rounded-2xl border p-3 ${b.bgColor} ${b.borderColor}`}>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${b.textColor} opacity-70`}>{b.label}</p>
                                <p className={`text-base font-bold mt-1 ${b.textColor}`}>
                                    {b.total.toLocaleString("tr-TR")} <span className="text-xs font-semibold">₺</span>
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${b.badgeColor}`}>{b.count} kayıt</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${b.badgeColor}`}>{b.uniquePatients} hasta</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detay Tablo */}
                    <div className="rounded-2xl border overflow-hidden">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            <span>Hasta</span>
                            <span className="text-right">Tutar</span>
                            <span className="text-right">Vade</span>
                            <span className="text-right">Gecikme</span>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                            {payments
                                .filter(p =>
                                    !isCancelled(p.status) &&
                                    (isPending(p.status) || isPartial(p.status)) &&
                                    p.due_date && p.due_date < today
                                )
                                .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
                                .map(p => {
                                    const days = daysBetween(p.due_date!, today);
                                    const bucket = BUCKETS.find(b => days >= b.minDays && (b.maxDays === null || days <= b.maxDays));
                                    return (
                                        <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 items-center">
                                            <span className="text-xs font-bold text-slate-700 truncate">{p.patient?.full_name ?? "—"}</span>
                                            <span className="text-xs font-extrabold text-slate-900 text-right">{p.amount.toLocaleString("tr-TR")} ₺</span>
                                            <span className="text-[10px] font-bold text-slate-400 text-right">{new Date(p.due_date!).toLocaleDateString("tr-TR")}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md text-right whitespace-nowrap ${bucket?.badgeColor ?? "bg-slate-100 text-slate-600"}`}>
                                                {days} gün
                                            </span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
