import React from "react";
import { PaymentRow } from "@/hooks/usePaymentManagement";
import { getPaymentStatusConfig, isCancelled, normalizePaymentMethod } from "@/constants/payments";
import { useClinic } from "@/app/context/ClinicContext";
import { printReceipt } from "@/lib/receiptGenerator";

interface PaymentListProps {
    payments: PaymentRow[];
    loading: boolean;
    onPaymentClick: (p: PaymentRow) => void;
}

// DB'de eski snake_case veya farklı yazılmış değerleri düzelt

export function PaymentList({ payments, loading, onPaymentClick }: PaymentListProps) {
    const { clinicName } = useClinic();


    if (loading) {
        return (
            <div className="divide-y divide-slate-100">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-slate-100 rounded w-1/3" />
                            <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                        </div>
                        <div className="h-3 bg-slate-100 rounded w-16" />
                        <div className="h-6 bg-slate-100 rounded-full w-16" />
                        <div className="h-3 bg-slate-100 rounded w-14" />
                    </div>
                ))}
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="px-5 py-14 text-center flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border shadow-sm">
                    <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75" />
                    </svg>
                </div>
                <p className="text-sm font-bold text-slate-400">Bu dönemde ödeme kaydı bulunmuyor</p>
                <p className="text-xs text-slate-300 font-medium">Farklı bir zaman aralığı seçin veya yeni kayıt ekleyin.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-50">
            {payments.map((p) => {
                const sc = getPaymentStatusConfig(p.status);
                const isInstallment = p.installment_count && p.installment_count > 1;
                const cancelled = isCancelled(p.status);

                return (
                    <div
                        key={p.id}
                        onClick={() => onPaymentClick(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && onPaymentClick(p)}
                        className={`w-full grid grid-cols-[2fr_1fr_auto_auto] sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 sm:gap-4 items-center px-4 sm:px-5 py-3.5 text-left transition-all hover:bg-slate-50/80 group cursor-pointer ${cancelled ? "opacity-60" : ""}`}
                    >
                        {/* Hasta */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold border shadow-sm uppercase tracking-tighter text-xs ${cancelled ?"bg-slate-50 text-slate-400 border-slate-200" : "bg-teal-50 text-teal-600 border-teal-100"}`}>
                                {(p.patient?.full_name || "H")[0]}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-bold truncate transition-colors group-hover:text-teal-700 ${cancelled ?"text-slate-400 line-through" : "text-slate-900"}`}>
                                    {p.patient?.full_name || "Hasta"}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-medium truncate">{p.patient?.phone || "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tutar & Yöntem */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                            <span className={`text-sm font-extrabold whitespace-nowrap ${cancelled ?"text-slate-400 line-through" : "text-slate-900"}`}>
                                {p.amount.toLocaleString("tr-TR")} ₺
                            </span>
                            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                                {isInstallment && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[9px] font-black whitespace-nowrap">
                                        Taksit {p.installment_number}/{p.installment_count}
                                    </span>
                                )}
                                {p.method && (
                                    <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200 whitespace-nowrap">
                                        {normalizePaymentMethod(p.method)}
                                    </span>
                                )}
                            </div>
                        </div>


                        {/* Durum Badge */}
                        <div className="flex flex-col items-end gap-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-black border ${sc.colors.bg} ${sc.colors.text}`}>
                                {sc.label}
                            </span>
                            {isInstallment && (
                                <span className="sm:hidden text-[8px] font-black text-indigo-500">T{p.installment_number}/{p.installment_count}</span>
                            )}
                        </div>

                        {/* Vade */}
                        <div className="hidden sm:block text-right">
                            <span className="text-[11px] text-slate-500 font-bold">
                                {p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "—"}
                            </span>
                        </div>

                        {/* Makbuz butonu */}
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                title="Makbuz yazdır"
                                onClick={e => {
                                    e.stopPropagation();
                                    printReceipt({
                                        clinicName: clinicName || "Klinik",
                                        patient: {
                                            name: p.patient?.full_name || "Hasta",
                                            phone: p.patient?.phone,
                                        },
                                        payments: [{
                                            id: p.id,
                                            amount: p.amount,
                                            method: p.method,
                                            status: p.status,
                                            due_date: p.due_date,
                                            note: p.note,
                                            installment_number: p.installment_number,
                                            installment_count: p.installment_count,
                                            treatment_type: p.appointment?.treatment_type,
                                        }],
                                    });
                                }}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
