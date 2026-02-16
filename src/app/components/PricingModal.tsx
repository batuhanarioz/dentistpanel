"use client";

import React, { useState } from "react";

interface Plan {
    id: string;
    name: string;
    limit: string;
    price: string;
    details: string[];
    isPopular?: boolean;
}

const planDetails: Plan[] = [
    {
        id: "trial",
        name: "Deneme",
        limit: "100",
        price: "Ücretsiz",
        details: ["7 Günlük Deneme", "Tüm Özellikler Açık", "100 Kredi Hediye"],
    },
    {
        id: "starter",
        name: "Başlangıç",
        limit: "750",
        price: "1.990 ₺",
        details: ["2 Doktor Sınırı", "Standart Destek"],
    },
    {
        id: "pro",
        name: "Profesyonel",
        limit: "2.500",
        price: "3.990 ₺",
        details: ["5 Doktor Sınırı", "Öncelikli Destek"],
        isPopular: true,
    },
    {
        id: "enterprise",
        name: "Kurumsal",
        limit: "7.500",
        price: "8.990 ₺",
        details: ["12 Doktor Sınırı", "Öncelikli Destek (7/24)"],
    },
];

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-slate-50 rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-5xl mx-auto overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col h-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-teal-800 to-emerald-600 px-8 py-10 text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-3xl font-black text-white tracking-tight">Klinik Yönetim Paketleri</h2>
                    <p className="mt-2 text-teal-50 font-medium opacity-90">Kliniğinizin ihtiyacına uygun paketi seçin, profesyonel yönetime başlayın.</p>
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {planDetails.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col bg-white rounded-3xl border-2 p-6 transition-all hover:scale-[1.02] duration-300 ${plan.isPopular
                                    ? "border-teal-500 shadow-xl shadow-teal-500/10 ring-4 ring-teal-500/5 translate-y-[-8px] md:translate-y-[-12px]"
                                    : "border-slate-100 shadow-sm"
                                    }`}
                            >
                                {plan.isPopular && (
                                    <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 px-3 py-1 text-[9px] font-bold text-white uppercase tracking-wider shadow-md ring-2 ring-white">
                                        Popüler
                                    </span>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                                        {plan.id !== "trial" && <span className="text-xs text-slate-400 font-bold">/ aylık</span>}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paket İçeriği</h4>
                                        <ul className="space-y-3">
                                            {plan.details.map((detail, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-xs font-semibold text-slate-600 leading-tight">
                                                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.isPopular ? "bg-teal-500 text-white" : "bg-teal-100 text-teal-600"}`}>
                                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                        </svg>
                                                    </div>
                                                    {detail}
                                                </li>
                                            ))}
                                            <li className="flex items-start gap-3 text-xs font-semibold text-slate-600 leading-tight">
                                                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.isPopular ? "bg-teal-500 text-white" : "bg-teal-100 text-teal-600"}`}>
                                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    </svg>
                                                </div>
                                                {plan.limit} Mesaj/Ay Kota
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <a
                                        href={`https://wa.me/905432934381?text=${encodeURIComponent(`Merhaba, ${plan.name} paketiniz hakkında bilgi almak istiyorum.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg ${plan.isPopular
                                            ? "bg-teal-600 text-white shadow-teal-600/20 hover:bg-teal-700 hover:shadow-teal-700/30 active:scale-95"
                                            : "bg-slate-50 text-slate-900 shadow-slate-200/50 hover:bg-slate-100 active:scale-95"
                                            }`}
                                    >
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.054 3.73 1.612 5.766 1.612h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        {plan.id === "trial" ? "Hemen Başla" : "Bilgi Al"}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-slate-100 px-8 py-6 text-center">
                    <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Fiyatlarımıza KDV dahildir. Memnun kalmazsanız 14 gün içinde sorgusuz iade garantisi.
                    </p>
                </div>
            </div>
        </div>
    );
}
