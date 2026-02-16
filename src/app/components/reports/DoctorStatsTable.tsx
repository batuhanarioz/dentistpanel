import React from "react";
import { EmptyState } from "./ReportCard";

export interface DoctorStat {
    name: string;
    total: number;
    completed: number;
    noShow: number;
    completePct: number;
}

interface DoctorStatsTableProps {
    data: DoctorStat[];
}

export function DoctorStatsTable({ data }: DoctorStatsTableProps) {
    if (data.length === 0) return <EmptyState />;

    return (
        <div className="italic-none">
            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                        <tr className="border-b bg-slate-50/50 text-slate-500 font-black uppercase tracking-widest">
                            <th className="px-4 py-4">Doktor</th>
                            <th className="px-4 py-4 text-center">Toplam</th>
                            <th className="px-4 py-4 text-center">Tamamlanan</th>
                            <th className="px-4 py-4 text-center">Gelmedi</th>
                            <th className="px-4 py-4 text-right">Başarı Oranı</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((d) => (
                            <tr key={d.name} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 font-bold text-slate-900">{d.name}</td>
                                <td className="px-4 py-4 text-center text-slate-600 font-bold">{d.total}</td>
                                <td className="px-4 py-4 text-center text-emerald-600 font-bold">{d.completed}</td>
                                <td className="px-4 py-4 text-center text-rose-600 font-bold">{d.noShow}</td>
                                <td className="px-4 py-4 text-right">
                                    <span className={`inline-flex items-center px-1.5 py-1 rounded-lg font-black ${d.completePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                        d.completePct >= 60 ? 'bg-amber-100 text-amber-700' :
                                            'bg-rose-100 text-rose-700'
                                        }`}>
                                        %{d.completePct}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-slate-100">
                {data.map((d) => (
                    <div key={d.name} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900">{d.name}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${d.completePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                d.completePct >= 60 ? 'bg-amber-100 text-amber-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>
                                %{d.completePct} Başarı
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Toplam</p>
                                <p className="text-xs font-black text-slate-700">{d.total}</p>
                            </div>
                            <div className="bg-emerald-50/50 rounded-xl p-2 text-center border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mb-0.5">Tamam</p>
                                <p className="text-xs font-black text-emerald-700">{d.completed}</p>
                            </div>
                            <div className="bg-rose-50/50 rounded-xl p-2 text-center border border-rose-100">
                                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter mb-0.5">Gelmedi</p>
                                <p className="text-xs font-black text-rose-700">{d.noShow}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
