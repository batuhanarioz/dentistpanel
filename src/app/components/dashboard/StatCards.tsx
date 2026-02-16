import React from "react";

interface StatCardsProps {
    isToday: boolean;
    totalToday: number;
    confirmedCount: number;
    controlCount: number;
    loading: boolean;
}

export function StatCards({
    isToday,
    totalToday,
    confirmedCount,
    controlCount,
    loading
}: StatCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">{isToday ? "Bugün" : "Yarın"}</p>
                        <p className="text-lg font-bold text-slate-900">
                            {loading ? "..." : totalToday} <span className="text-sm font-normal text-slate-400">randevu</span>
                        </p>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Planlı</p>
                        <p className="text-lg font-bold text-emerald-700">{confirmedCount}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Kontrol Bekleyen</p>
                        <p className="text-lg font-bold text-rose-700">{controlCount}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
