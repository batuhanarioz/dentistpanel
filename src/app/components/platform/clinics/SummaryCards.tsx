import React from "react";

interface SummaryCardsProps {
    superAdminCount: number;
    clinicCount: number;
    onNewClinicClick: () => void;
}

export function SummaryCards({ superAdminCount, clinicCount, onNewClinicClick }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Super Admin</p>
                        <p className="text-lg font-bold text-slate-900">{superAdminCount}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Toplam Klinik</p>
                        <p className="text-lg font-bold text-slate-900">{clinicCount}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-center">
                <button
                    type="button"
                    onClick={onNewClinicClick}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-600 transition-all"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Yeni Klinik
                </button>
            </div>
        </div>
    );
}
