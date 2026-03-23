"use client";
import React, { useMemo } from "react";
import { PaymentRow } from "@/hooks/usePaymentManagement";
import { isPending, isPartial, isCancelled } from "@/constants/payments";

interface PaymentProjectionProps {
    payments: PaymentRow[];
    today: string;
}

interface Window {
    label: string;
    days: number;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}

const WINDOWS: Window[] = [
    { label: "0–30 Gün", days: 30, color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-100", textColor: "text-emerald-700" },
    { label: "31–60 Gün", days: 60, color: "from-amber-400 to-orange-400", bgColor: "bg-amber-50", borderColor: "border-amber-100", textColor: "text-amber-700" },
    { label: "61–90 Gün", days: 90, color: "from-violet-400 to-purple-500", bgColor: "bg-violet-50", borderColor: "border-violet-100", textColor: "text-violet-700" },
];

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export function PaymentProjection({ payments, today }: PaymentProjectionProps) {
    const projection = useMemo(() => {
        const pending = payments.filter(p =>
            !isCancelled(p.status) &&
            (isPending(p.status) || isPartial(p.status)) &&
            p.due_date &&
            p.due_date >= today
        );

        const results = WINDOWS.map((w, i) => {
            const from = i === 0 ? today : addDays(today, WINDOWS[i - 1].days);
            const to = addDays(today, w.days);
            const inWindow = pending.filter(p => p.due_date! >= from && p.due_date! < to);
            const total = inWindow.reduce((s, p) => s + p.amount, 0);
            return { ...w, total, count: inWindow.length };
        });

        const grandTotal = results.reduce((s, r) => s + r.total, 0);
        return { results, grandTotal };
    }, [payments, today]);

    if (projection.grandTotal === 0) return null;

    const maxTotal = Math.max(...projection.results.map(r => r.total), 1);

    return (
        <div className="rounded-3xl border bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-sm shrink-0">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gelecek Tahsilat Projeksiyonu</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Bekleyen ve kısmi ödemelerden beklenen nakit akışı</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">90 Günlük Toplam</p>
                    <p className="text-lg font-bold text-slate-900">{projection.grandTotal.toLocaleString("tr-TR")} <span className="text-sm font-semibold text-slate-400">₺</span></p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {projection.results.map((r) => (
                    <div key={r.label} className={`relative rounded-2xl overflow-hidden p-3.5 bg-gradient-to-br ${r.color} shadow-sm`}>
                        <div className="absolute -right-3 -top-3 h-14 w-14 rounded-full bg-white/10" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/70">{r.label}</p>
                        <p className="text-base font-bold mt-1 text-white">
                            {r.total.toLocaleString("tr-TR")} <span className="text-xs font-semibold">₺</span>
                        </p>
                        <p className="text-[9px] font-bold mt-0.5 text-white/60">{r.count} ödeme</p>
                        <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-white/50 transition-all duration-700"
                                style={{ width: `${r.total > 0 ? Math.round((r.total / maxTotal) * 100) : 0}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
