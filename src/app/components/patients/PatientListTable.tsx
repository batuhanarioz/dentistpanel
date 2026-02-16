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
        <div className="italic-none">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b bg-slate-50/50 text-[11px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-6 py-4">Hasta</th>
                            <th className="px-6 py-4">İletişim Bilgileri</th>
                            <th className="px-6 py-4">Kayıt Tarihi</th>
                            <th className="px-6 py-4 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {patients.map((p) => (
                            <tr key={p.id} className="group transition-colors hover:bg-slate-50/80">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-black text-white shadow-sm shadow-emerald-100 uppercase">
                                            {p.full_name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                                                {p.full_name}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {p.birth_date ? p.birth_date.slice(0, 10) : "Doğum tarihi yok"}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-xs font-medium">
                                    <div className="space-y-0.5">
                                        <div className="text-slate-700 font-bold">{p.phone || "Telefon yok"}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{p.email || "E-posta yok"}</div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-slate-500 text-[11px] font-bold">
                                    {p.created_at ? new Date(p.created_at).toLocaleDateString("tr-TR") : "-"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                    <button
                                        onClick={() => onSelectPatient(p)}
                                        className="rounded-xl border bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                                    >
                                        Detayları Gör
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
                {patients.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => onSelectPatient(p)}
                        className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-slate-50"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-black text-white shadow-sm shadow-emerald-100 uppercase">
                                {p.full_name[0]}
                            </div>
                            <div className="min-w-0">
                                <div className="font-black text-slate-900 truncate">
                                    {p.full_name}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 tracking-tight flex items-center gap-1">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                    {p.phone || "-"}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border text-slate-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Detay</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
