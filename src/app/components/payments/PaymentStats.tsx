import React from "react";

interface PaymentStatsProps {
    stats: { total: number; paid: number; planned: number; count: number };
}

export function PaymentStats({ stats }: PaymentStatsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Toplam Tutar" value={stats.total} color="text-slate-900" bg="from-emerald-500 to-teal-500" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
            <StatCard label="Tahsil Edilen" value={stats.paid} color="text-emerald-700" bg="from-emerald-400 to-green-500" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="m4.5 12.75 6 6 9-13.5" /></svg>} />
            <StatCard label="Bekleyen" value={stats.planned} color="text-amber-700" bg="from-amber-400 to-orange-500" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
            <StatCard label="Kayıt Sayısı" value={stats.count} color="text-slate-900" bg="from-slate-500 to-slate-600" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" /></svg>} isNumber />
        </div>
    );
}

function StatCard({ label, value, color, bg, icon, isNumber }: any) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ${bg}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[11px] text-slate-500 font-medium">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value.toLocaleString("tr-TR")} {!isNumber && <span className="text-sm font-semibold">₺</span>}</p>
                </div>
            </div>
        </div>
    );
}
