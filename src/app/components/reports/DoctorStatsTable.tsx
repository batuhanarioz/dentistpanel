import React from "react";
import { EmptyState } from "./ReportCard";

interface DoctorStatsTableProps {
    data: any[];
}

export function DoctorStatsTable({ data }: DoctorStatsTableProps) {
    if (data.length === 0) return <EmptyState />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                    <tr className="border-b bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Doktor</th>
                        <th className="px-4 py-3 text-center">Toplam</th>
                        <th className="px-4 py-3 text-center">Tamanlandı</th>
                        <th className="px-4 py-3 text-center">Gelmedi</th>
                        <th className="px-4 py-3 text-right">Başarı %</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic-none">
                    {data.map((d) => (
                        <tr key={d.name} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">{d.name}</td>
                            <td className="px-4 py-3 text-center text-slate-600 font-medium">{d.total}</td>
                            <td className="px-4 py-3 text-center text-emerald-600 font-bold">{d.completed}</td>
                            <td className="px-4 py-3 text-center text-rose-600 font-bold">{d.noShow}</td>
                            <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold ${d.completePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
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
    );
}
