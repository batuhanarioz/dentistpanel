"use client";

import { useState } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";

export default function SubscriptionPage() {
    usePageHeader("Abonelik & Kullanım", "Paket yönetimi ve mesaj kotası takibi");
    const clinic = useClinic();

    // Mock veriler (Daha sonra veritabanından gelecek)
    const stats = {
        monthlyMessages: 5000,
        usedMessages: 1240,
        planName: "Professional",
        expiryDate: "2024-03-24",
        status: "active",
    };

    const usagePercent = (stats.usedMessages / stats.monthlyMessages) * 100;

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
        <div className="max-w-5xl mx-auto space-y-6">
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
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">Aktif</span>
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
                                    * Mesaj kotanız her ayın 1'inde otomatik olarak yenilenir.
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Yenileme Tarihi</p>
                                    <p className="text-sm font-semibold text-slate-800">{new Date(stats.expiryDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tahmini Kalan</p>
                                    <p className="text-sm font-semibold text-slate-800">{stats.monthlyMessages - stats.usedMessages} Mesaj</p>
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
                                <h4 className="text-sm font-bold text-blue-900">Otomatik Yükleme Aktif Değil</h4>
                                <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                                    Mesaj kotanız bittiğinde randevu hatırlatıcıları gönderilmez. Kotanız azaldığında otomatik ek paket almak için ödeme yöntemlerinizi güncelleyebilirsiniz.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Kolon: Paket Yükseltme */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
                    <div className="p-8 border-b bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-900">Paketini Yükselt</h3>
                        <p className="text-sm text-slate-500 mt-1">Daha fazla mesaj hakkı ve premium özellikler için planını seç.</p>
                    </div>

                    <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[460px] scrollbar-hide">
                        {[
                            { name: "Starter", price: "499₺", limit: "1.000", color: "slate" },
                            { name: "Professional", price: "999₺", limit: "5.000", color: "teal", popular: true },
                            { name: "Enterprise", price: "2.499₺", limit: "25.000", color: "indigo" },
                        ].map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative rounded-2xl border-2 p-4 transition-all hover:scale-[1.01] ${plan.popular ? 'border-teal-500 bg-teal-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                {plan.popular && (
                                    <span className="absolute -top-2.5 right-4 rounded-full bg-teal-500 px-3 py-1 text-[9px] font-bold text-white uppercase tracking-wider">En Çok Tercih Edilen</span>
                                )}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{plan.name}</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{plan.limit} Mesaj / Ay</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-900">{plan.price}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">aylık</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t bg-slate-50/50">
                        <button className="w-full rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 py-3.5 text-xs font-bold text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all">
                            Ödeme Yöntemi Ekle & Yükselt
                        </button>
                        <div className="flex items-center justify-center mt-4 gap-2 opacity-30 grayscale">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="Paypal" className="h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
