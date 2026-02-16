import React from "react";
import type { Clinic, SubscriptionPlan } from "@/types/database";

interface ClinicListProps {
    clinics: Clinic[];
    plans: SubscriptionPlan[];
    loading: boolean;
    onEditClinic: (clinic: Clinic) => void;
}

export function ClinicList({ clinics, plans, loading, onEditClinic }: ClinicListProps) {
    return (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Klinikler</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Kartı tıklayarak bilgileri görüntüleyip düzenleyebilirsiniz</p>
            </div>
            <div className="p-4 md:p-5">
                {loading && (
                    <div className="py-8 text-center text-slate-500 text-sm">
                        Klinikler yükleniyor...
                    </div>
                )}

                {!loading && clinics.length === 0 && (
                    <div className="py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-3">
                            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600">Henüz klinik yok</p>
                        <p className="text-xs text-slate-400 mt-1">Yeni klinik ekleyerek başlayın</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                    {clinics.map((c, index) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onEditClinic(c)}
                            className={[
                                "w-full min-h-[140px] rounded-xl border-l-4 p-4 text-left transition-all hover:shadow-md flex flex-col",
                                c.is_active
                                    ? index % 2 === 0
                                        ? "bg-gradient-to-br from-white to-teal-50/40 border-slate-200 border-l-teal-500 hover:border-l-teal-600 hover:shadow-teal-100"
                                        : "bg-gradient-to-br from-slate-50/80 to-emerald-50/40 border-slate-200 border-l-emerald-500 hover:border-l-emerald-600 hover:shadow-emerald-100"
                                    : "bg-slate-50/80 border-slate-200 border-l-slate-400 opacity-90",
                            ].join(" ")}
                        >
                            <div className="flex items-start justify-between gap-3 flex-1">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-semibold text-white shadow-sm shrink-0">
                                            {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-slate-900 truncate">{c.name}</h3>
                                            <p className="text-[10px] text-slate-500 truncate">/{c.slug}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2.5 space-y-0.5 text-[11px] text-slate-600">
                                        {c.phone && <p>Tel: {c.phone}</p>}
                                        {c.email && <p className="truncate">E-posta: {c.email}</p>}
                                        {c.address && <p className="truncate text-slate-500">Adres: {c.address}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"].join(" ")}>
                                        {c.is_active ? "Aktif" : "Pasif"}
                                    </span>
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 italic">
                                        {plans.find(p => p.id === c.plan_id)?.name || c.plan_id}
                                    </span>
                                    <span className="text-[10px] text-slate-400">Kayıt: {new Date(c.created_at).toLocaleDateString("tr-TR")}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Detay ve düzenleme için tıklayın</p>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
