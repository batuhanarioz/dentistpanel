import React from "react";
import { PaymentRow } from "@/hooks/usePaymentManagement";

interface PaymentListProps {
    payments: PaymentRow[];
    loading: boolean;
    onPaymentClick: (p: PaymentRow) => void;
}

export function PaymentList({ payments, loading, onPaymentClick }: PaymentListProps) {
    const statusBadge = (s: string | null) => {
        switch (s) {
            case "paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "partial": return "bg-amber-100 text-amber-700 border-amber-200";
            case "cancelled": return "bg-rose-100 text-rose-700 border-rose-200";
            default: return "bg-slate-100 text-slate-600 border-slate-200";
        }
    };

    const statusLabel = (s: string | null) => {
        switch (s) {
            case "paid": return "Ödendi";
            case "partial": return "Kısmi";
            case "cancelled": return "İptal";
            default: return "Planlandı";
        }
    };

    if (loading) {
        return (
            <div className="px-5 py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Ödemeler yükleniyor...
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="px-5 py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border shadow-sm">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75" />
                    </svg>
                </div>
                <p className="text-sm font-medium">Bu dönemde ödeme bulunmuyor</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 italic-none">
            {payments.map((p) => (
                <button
                    key={p.id}
                    onClick={() => onPaymentClick(p)}
                    className="w-full grid grid-cols-[2fr_1fr_auto] sm:grid-cols-[1fr_1fr_auto_auto] gap-2 sm:gap-4 items-center px-4 sm:px-5 py-3.5 text-left transition-all hover:bg-slate-50/80 group"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 font-bold border border-teal-100 shadow-sm uppercase tracking-tighter text-[10px] sm:text-xs">
                            {(p.patient?.full_name || "H")[0]}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[13px] sm:text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                {p.patient?.full_name || "Hasta"}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                                {p.patient?.phone || "-"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0 sm:justify-start">
                        <span className="text-[13px] sm:text-sm font-extrabold text-slate-900 whitespace-nowrap text-center sm:text-left">
                            {p.amount.toLocaleString("tr-TR")} ₺
                        </span>
                        {p.method && (
                            <span className="inline-flex sm:hidden items-center text-[8px] font-bold text-slate-400 uppercase tracking-tight text-center justify-center">
                                {p.method}
                            </span>
                        )}
                        {p.method && (
                            <span className="hidden sm:inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200">
                                {p.method}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border ${statusBadge(p.status)}`}>
                            {statusLabel(p.status)}
                        </span>
                        <span className="sm:hidden text-[9px] text-slate-400 font-bold">
                            {p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR", { day: '2-digit', month: '2-digit' }) : "-"}
                        </span>
                    </div>

                    <div className="hidden sm:block text-right">
                        <span className="text-[11px] text-slate-500 font-bold">
                            {p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "-"}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
}
