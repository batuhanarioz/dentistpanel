import React from "react";

interface SummaryCardsProps {
    superAdminCount: number;
    clinicCount: number;
    onNewClinicClick: () => void;
    compact?: boolean;
}

export function SummaryCards({ superAdminCount, clinicCount, onNewClinicClick, compact }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500">
                <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Üst Yöneticiler</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{superAdminCount}</p>
                    </div>
                </div>
            </div>

            <div className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-teal-100/50 transition-all duration-500">
                <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-emerald-100 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Kayıtlı Klinikler</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">{clinicCount}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
