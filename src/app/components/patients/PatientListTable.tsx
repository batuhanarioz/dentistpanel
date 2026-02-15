import React from "react";
import { PatientRow } from "@/hooks/usePatients";

interface PatientListTableProps {
    patients: PatientRow[];
    loading: boolean;
    onSelectPatient: (patient: PatientRow) => void;
}

export function PatientListTable({ patients, loading, onSelectPatient }: PatientListTableProps) {
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (patients.length === 0) {
        return (
            <div className="py-20 text-center text-slate-500">
                <p>Henüz hasta kaydı bulunmuyor veya arama ile eşleşen sonuç yok.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Hasta</th>
                        <th className="px-6 py-4">İletişim</th>
                        <th className="px-6 py-4">Kayıt Tarihi</th>
                        <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => (
                        <tr key={p.id} className="group transition-colors hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-sm uppercase">
                                        {p.full_name[0]}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-500 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                                            {p.full_name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {p.birth_date ? p.birth_date.slice(0, 10) : "Doğum tarihi yok"}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                                <div className="space-y-0.5">
                                    <div className="text-slate-700 font-medium">{p.phone || "Telefon yok"}</div>
                                    <div className="text-[11px] text-slate-400">{p.email || "E-posta yok"}</div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-500 text-[11px]">
                                {p.created_at ? new Date(p.created_at).toLocaleDateString("tr-TR") : "-"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                <button
                                    onClick={() => onSelectPatient(p)}
                                    className="rounded-lg border border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
                                >
                                    Detayları Gör
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
