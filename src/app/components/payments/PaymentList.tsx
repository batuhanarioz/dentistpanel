import React from "react";
import { PaymentRow } from "@/hooks/usePaymentManagement";
import { getPaymentStatusConfig, isCancelled, isPaid, isPending, isPartial, normalizePaymentMethod } from "@/constants/payments";
import { useClinic } from "@/app/context/ClinicContext";
import { printReceipt } from "@/lib/receiptGenerator";

interface PaymentListProps {
    payments: PaymentRow[];
    loading: boolean;
    today: string;
    onPaymentClick: (p: PaymentRow) => void;
    onQuickCollect: (id: string) => void;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
}

export function PaymentList({ payments, loading, today, onPaymentClick, onQuickCollect, selectedIds, onToggleSelect }: PaymentListProps) {
    const { clinicName } = useClinic();
    const selectionMode = !!(selectedIds && onToggleSelect);

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
                const isOverdue = !cancelled && (isPending(p.status) || isPartial(p.status)) && !!p.due_date && p.due_date < today;
                const hasInsurance = !!p.insurance_company;
                const isSelected = selectedIds?.has(p.id) ?? false;
                const hasTreatmentItem = !!p.treatment_plan_item;

                return (
                    <div
                        key={p.id}
                        onClick={() => onPaymentClick(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === "Enter" && onPaymentClick(p)}
                        className={`w-full grid grid-cols-[auto_2fr_1fr_auto] sm:grid-cols-[auto_1fr_1fr_6rem_5.5rem_6rem] gap-2 sm:gap-4 items-center px-4 sm:px-5 py-3.5 text-left transition-all group cursor-pointer ${
                            isSelected ? "bg-teal-50/60 shadow-[inset_2px_0_0_#2dd4bf]"
                            : cancelled ? "opacity-60 hover:bg-slate-50/80"
                            : isOverdue ? "bg-rose-50/40 hover:bg-rose-50/70 shadow-[inset_2px_0_0_#fca5a5]"
                            : "hover:bg-slate-50/80"
                        }`}
                    >
                        {/* Checkbox */}
                        <div className="flex items-center" onClick={e => { e.stopPropagation(); onToggleSelect?.(p.id); }}>
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected ? "bg-teal-500 border-teal-500" : "border-slate-300 bg-white group-hover:border-teal-400"
                            }`}>
                                {isSelected && (
                                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Hasta */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold border shadow-sm uppercase tracking-tighter text-xs ${
                                cancelled ? "bg-slate-50 text-slate-400 border-slate-200"
                                : isOverdue ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-teal-50 text-teal-600 border-teal-100"
                            }`}>
                                {(p.patient?.full_name || "H")[0]}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-bold truncate transition-colors group-hover:text-teal-700 ${cancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                    {p.patient?.full_name || "Hasta"}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 font-medium truncate">{p.patient?.phone || "—"}</span>
                                    {hasInsurance && (
                                        <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-500 border border-blue-100 rounded text-[8px] font-black whitespace-nowrap">
                                            <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                                            Sigortalı
                                        </span>
                                    )}
                                    {hasTreatmentItem && (
                                        <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 bg-violet-50 text-violet-500 border border-violet-100 rounded text-[8px] font-black whitespace-nowrap truncate max-w-[80px]">
                                            {p.treatment_plan_item!.procedure_name}
                                        </span>
                                    )}
                                    {isOverdue && (
                                        <span className="inline-flex items-center px-1 py-0.5 bg-rose-100 text-rose-600 rounded text-[8px] font-black whitespace-nowrap">Gecikmiş</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tutar & Yöntem */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                            <span className={`text-sm font-extrabold whitespace-nowrap ${cancelled ? "text-slate-400 line-through" : isOverdue ? "text-rose-700" : "text-slate-900"}`}>
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

                        {/* Vade + Fiş No */}
                        <div className="hidden sm:block text-right">
                            <span className={`text-[11px] font-bold ${isOverdue ? "text-rose-500" : "text-slate-500"}`}>
                                {p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "—"}
                            </span>
                            {p.receipt_number && (
                                <p className="text-[9px] text-slate-300 font-medium mt-0.5 truncate">{p.receipt_number}</p>
                            )}
                        </div>

                        {/* Aksiyon butonları */}
                        <div className="hidden sm:flex items-center justify-end gap-1">
                            {/* WhatsApp Hatırlatma (gecikmiş) */}
                            {isOverdue && p.patient?.phone && (
                                <a
                                    href={`https://wa.me/90${p.patient.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(`Sayın ${p.patient.full_name || "Hasta"}, ${p.amount.toLocaleString("tr-TR")} ₺ tutarındaki ödemeniz ${p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : ""} vadesiyle gecikmiş durumdadır. Lütfen kliniğimizle iletişime geçiniz.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="WhatsApp hatırlatma gönder"
                                    onClick={e => e.stopPropagation()}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-green-500 hover:bg-green-50 hover:text-green-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                </a>
                            )}
                            {/* Hızlı Tahsil Et */}
                            {!cancelled && !isPaid(p.status) && (
                                <button
                                    type="button"
                                    title="Tahsil Et"
                                    onClick={e => {
                                        e.stopPropagation();
                                        onQuickCollect(p.id);
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </button>
                            )}
                            {/* Makbuz */}
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
