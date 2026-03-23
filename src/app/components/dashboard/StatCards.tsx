import React from "react";

interface StatCardsProps {
    isToday: boolean;
    totalToday: number;
    confirmedCount: number;
    completedCount: number;
    noShowCount: number;
    controlCount: number;
    paidTotal: number;
    pendingTotal: number;
    loading: boolean;
}

export function StatCards({
    isToday,
    totalToday,
    confirmedCount,
    completedCount,
    noShowCount,
    controlCount,
    paidTotal,
    pendingTotal,
    loading
}: StatCardsProps) {
    const fmt = (n: number) =>
        n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const num = loading ? "—" : String(totalToday);

    return (
        <div className="space-y-3">
            {/* Mobilde yatay scroll, md+ grid */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0">

                {/* Bugün / Toplam */}
                <div className="relative rounded-2xl overflow-hidden px-4 py-3.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-200/60 hover:shadow-indigo-300/70 hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-36 md:w-auto">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="absolute right-2 bottom-2 opacity-[0.12]">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-200 mb-1">{isToday ? "Bugün" : "Yarın"}</p>
                    <p className="text-3xl font-black text-white leading-none">{loading ? "—" : totalToday}</p>
                    <p className="text-[10px] text-indigo-200 font-semibold mt-1.5">randevu</p>
                </div>

                {/* Planlı */}
                <div className="relative rounded-2xl overflow-hidden px-4 py-3.5 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/60 hover:shadow-emerald-300/70 hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-36 md:w-auto">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="absolute right-2 bottom-2 opacity-[0.12]">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-100 mb-1">Planlı</p>
                    <p className="text-3xl font-black text-white leading-none">{loading ? "—" : confirmedCount}</p>
                    <p className="text-[10px] text-emerald-100 font-semibold mt-1.5">onaylı randevu</p>
                </div>

                {/* Tamamlandı */}
                <div className="relative rounded-2xl overflow-hidden px-4 py-3.5 bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 shadow-lg shadow-teal-200/60 hover:shadow-teal-300/70 hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-36 md:w-auto">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="absolute right-2 bottom-2 opacity-[0.12]">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-100 mb-1">Tamamlandı</p>
                    <p className="text-3xl font-black text-white leading-none">{loading ? "—" : completedCount}</p>
                    <p className="text-[10px] text-teal-100 font-semibold mt-1.5">tedavi bitti</p>
                </div>

                {/* Gelmedi */}
                <div className="relative rounded-2xl overflow-hidden px-4 py-3.5 bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 shadow-lg shadow-slate-200/60 hover:shadow-slate-300/70 hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-36 md:w-auto">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="absolute right-2 bottom-2 opacity-[0.12]">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 mb-1">Gelmedi</p>
                    <p className="text-3xl font-black text-white leading-none">{loading ? "—" : noShowCount}</p>
                    <p className="text-[10px] text-slate-300 font-semibold mt-1.5">gelmedi / iptal</p>
                </div>

                {/* Kontrol */}
                <div className="relative rounded-2xl overflow-hidden px-4 py-3.5 bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600 shadow-lg shadow-rose-200/60 hover:shadow-rose-300/70 hover:-translate-y-0.5 transition-all duration-300 cursor-default shrink-0 w-36 md:w-auto">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                    {controlCount > 0 && (
                        <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                    )}
                    <div className="absolute right-2 bottom-2 opacity-[0.12]">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-100 mb-1">Kontrol</p>
                    <p className="text-3xl font-black text-white leading-none">{loading ? "—" : controlCount}</p>
                    <p className="text-[10px] text-rose-100 font-semibold mt-1.5">bekleyen kontrol</p>
                </div>
            </div>

            {/* Finansal Mini Widget */}
            {isToday && (paidTotal > 0 || pendingTotal > 0) && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 p-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 shadow-sm shrink-0">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-emerald-600 font-semibold">Bugün Tahsilat</p>
                            <p className="text-base font-bold text-emerald-800">{fmt(paidTotal)} ₺</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 p-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-sm shrink-0">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-amber-600 font-semibold">Bekleyen Ödeme</p>
                            <p className="text-base font-bold text-amber-800">{fmt(pendingTotal)} ₺</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
