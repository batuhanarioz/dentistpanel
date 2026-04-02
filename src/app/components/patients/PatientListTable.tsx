import React, { useMemo } from "react";
import { PatientRow } from "@/hooks/usePatients";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";

type SortKey = "name" | "date";
type SortDir = "asc" | "desc";

interface PatientListTableProps {
    patients: PatientRow[];
    loading: boolean;
    onSelectPatient: (patient: PatientRow) => void;
    sortKey?: SortKey;
    sortDir?: SortDir;
    onSort?: (key: SortKey) => void;
}

const AVATAR_GRADIENTS = [
    "from-indigo-500 to-violet-500",
    "from-purple-500 to-indigo-500",
    "from-violet-500 to-fuchsia-500",
    "from-slate-500 to-slate-700",
    "from-blue-500 to-indigo-600",
    "from-indigo-400 to-purple-500",
];

export function PatientListTable({ patients, loading, onSelectPatient, sortKey, sortDir, onSort }: PatientListTableProps) {
    const rowColors = useMemo(() => {
        const colors: string[] = [];
        let prevIndex = -1;
        patients.forEach((p) => {
            let code = 0;
            const name = p.full_name || "";
            for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);

            let colorIdx = code % AVATAR_GRADIENTS.length;
            if (colorIdx === prevIndex) {
                colorIdx = (colorIdx + 1) % AVATAR_GRADIENTS.length;
            }
            colors.push(AVATAR_GRADIENTS[colorIdx]);
            prevIndex = colorIdx;
        });
        return colors;
    }, [patients]);

    const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
        <svg className={`h-3 w-3 ml-1 transition-transform ${active ? "text-[var(--brand-from)]" : "text-slate-300"} ${active && dir === "desc" ? "rotate-180" : ""}`} 
             style={{ '--brand-from': 'var(--brand-from)' } as React.CSSProperties}
             fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
    );
    if (loading) {
        return (
            <div className="divide-y divide-slate-100">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-slate-100 rounded-lg w-1/3" />
                            <div className="h-2.5 bg-slate-100 rounded-lg w-1/4" />
                        </div>
                        <div className="hidden lg:block space-y-1.5 w-32">
                            <div className="h-3 bg-slate-100 rounded-lg w-24" />
                            <div className="h-2.5 bg-slate-100 rounded-lg w-16" />
                        </div>
                        <div className="hidden lg:block h-3 bg-slate-100 rounded-lg w-20" />
                    </div>
                ))}
            </div>
        );
    }

    if (patients.length === 0) {
        return (
            <div className="py-16 text-center flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-200/60">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-700">Hasta kaydı bulunamadı</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Arama kriterini değiştirin veya yeni hasta ekleyin.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Responsive Table View */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-6 py-3.5">
                                <button onClick={() => onSort?.("name")} className="flex items-center hover:text-teal-600 transition-colors">
                                    HASTA ADI
                                    <SortIcon active={sortKey === "name"} dir={sortDir ?? "asc"} />
                                </button>
                            </th>
                            <th className="px-6 py-3.5">İLETİŞİM</th>
                            <th className="px-6 py-3.5">
                                <button onClick={() => onSort?.("date")} className="flex items-center hover:text-teal-600 transition-colors">
                                    KAYIT TARİHİ
                                    <SortIcon active={sortKey === "date"} dir={sortDir ?? "desc"} />
                                </button>
                            </th>
                            <th className="px-6 py-3.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {patients.map((p, index) => {
                            const age = p.birth_date
                                ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                                : null;
                            const gradient = rowColors[index];
                            const waPhone = p.phone ? formatPhoneForWhatsApp(p.phone) : null;

                            return (
                                <tr
                                    key={p.id}
                                    onClick={() => onSelectPatient(p)}
                                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                                >
                                    <td className="whitespace-nowrap px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs font-black text-white shadow-sm uppercase shrink-0`}>
                                                {p.full_name[0]}
                                            </div>
                                            <div>
                                                <div 
                                                    style={{ color: 'var(--brand-from)' }}
                                                    className="font-bold group-hover:text-[var(--brand-from)] transition-colors"
                                                >
                                                    {p.full_name}
                                                </div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                    {p.birth_date
                                                        ? `${new Date(p.birth_date).toLocaleDateString("tr-TR")} · ${age} yaş`
                                                        : "Doğum tarihi yok"}
                                                    {p.gender && (
                                                        <span className="ml-1.5 px-1 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">
                                                            {p.gender === "male" || p.gender === "Erkek" ? "E" : p.gender === "female" || p.gender === "Kadın" ? "K" : p.gender[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3.5">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-bold text-slate-700">{p.phone || <span className="text-slate-300 font-medium">Telefon yok</span>}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{p.email || <span className="text-slate-300">E-posta yok</span>}</div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3.5 text-[11px] font-bold text-slate-500">
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString("tr-TR") : "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3.5">
                                        <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {waPhone && (
                                                <a
                                                    href={`https://wa.me/${waPhone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                    title="WhatsApp ile mesaj gönder"
                                                >
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                    </svg>
                                                </a>
                                            )}
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-slate-200 transition-colors">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>


        </div>
    );
}
