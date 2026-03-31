"use client";

import { useState, useMemo } from "react";
import type { AppEvent } from "@/hooks/useAppointments";
import { STATUS_LABELS, STATUS_BADGE_COLORS } from "@/hooks/useAppointments";

interface AppointmentListViewProps {
    events: AppEvent[];
    onCardClick: (id: string) => void;
}

type SortKey = "time" | "patient" | "doctor" | "treatment" | "status";
type SortDir = "asc" | "desc";

function StatusBadge({ status }: { status: string }) {
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
    const color = STATUS_BADGE_COLORS[status as keyof typeof STATUS_BADGE_COLORS] ?? "bg-slate-100 text-slate-600";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
            {label}
        </span>
    );
}

function TreatmentBadge({ treatment }: { treatment: string }) {
    const t = (treatment || "").toLowerCase();
    let color = "bg-blue-50 text-blue-700";
    if (t.includes("kanal")) color = "bg-purple-50 text-purple-700";
    else if (t.includes("implant") || t.includes("cekim")) color = "bg-orange-50 text-orange-700";
    else if (t.includes("temizlik") || t.includes("beyazlatma")) color = "bg-teal-50 text-teal-700";
    else if (t.includes("protez") || t.includes("ortodonti")) color = "bg-indigo-50 text-indigo-700";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
            {treatment}
        </span>
    );
}

export function AppointmentListView({ events, onCardClick }: AppointmentListViewProps) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("time");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = q
            ? events.filter(
                (e) =>
                    e.patientName.toLowerCase().includes(q) ||
                    e.doctorName.toLowerCase().includes(q) ||
                    e.treatmentType.toLowerCase().includes(q) ||
                    e.status.toLowerCase().includes(q)
            )
            : events;

        rows = [...rows].sort((a, b) => {
            let av = "", bv = "";
            if (sortKey === "time") {
                av = `${a.startHour}:${a.startMinute.toString().padStart(2, "0")}`;
                bv = `${b.startHour}:${b.startMinute.toString().padStart(2, "0")}`;
            } else if (sortKey === "patient") { av = a.patientName; bv = b.patientName; }
            else if (sortKey === "doctor") { av = a.doctorName; bv = b.doctorName; }
            else if (sortKey === "treatment") { av = a.treatmentType; bv = b.treatmentType; }
            else if (sortKey === "status") { av = a.status; bv = b.status; }
            return sortDir === "asc" ? av.localeCompare(bv, "tr") : bv.localeCompare(av, "tr");
        });

        return rows;
    }, [events, search, sortKey, sortDir]);

    const SortIcon = ({ col }: { col: SortKey }) => (
        <span className="inline-flex flex-col ml-1 opacity-40 group-hover:opacity-70">
            {sortKey === col ? (
                sortDir === "asc"
                    ? <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4l4 6H4z" /></svg>
                    : <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12l4-6H4z" /></svg>
            ) : (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 4l3 4H5zm0 8l3-4H5z" />
                </svg>
            )}
        </span>
    );

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-white">
            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="relative max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Hasta, hekim veya tedavi ara..."
                        className="w-full h-8 pl-9 pr-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />
                        </svg>
                        <p className="text-sm font-medium">
                            {search ? "Arama sonucu bulunamadı" : "Bu gün için randevu bulunmuyor"}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                            <tr>
                                {(
                                    [
                                        { key: "time" as SortKey, label: "Saat" },
                                        { key: "patient" as SortKey, label: "Hasta" },
                                        { key: "doctor" as SortKey, label: "HEKİM" },
                                        { key: "treatment" as SortKey, label: "Tedavi" },
                                        { key: "status" as SortKey, label: "Durum" },
                                    ] as { key: SortKey; label: string }[]
                                ).map(({ key, label }) => (
                                    <th
                                        key={key}
                                        onClick={() => handleSort(key)}
                                        className="group text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                                    >
                                        {label}
                                        <SortIcon col={key} />
                                    </th>
                                ))}
                                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((event) => {
                                const startH = event.startHour.toString().padStart(2, "0");
                                const startM = event.startMinute.toString().padStart(2, "0");
                                const timeStr = `${startH}:${startM}`;

                                const endMinTotal = event.startHour * 60 + event.startMinute + event.durationMinutes;
                                const endH = Math.floor(endMinTotal / 60) % 24;
                                const endM = endMinTotal % 60;
                                const endStr = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

                                return (
                                    <tr
                                        key={event.id}
                                        onClick={() => onCardClick(event.id)}
                                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                    >
                                        {/* Time */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-semibold text-slate-900 tabular-nums text-xs">
                                                {timeStr} <span className="text-slate-300 font-normal mx-1">—</span> {endStr}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">{event.durationMinutes} dk</div>
                                        </td>

                                        {/* Patient */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                                                    {event.patientName[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800 text-xs">{event.patientName}</div>
                                                    <div className="text-[10px] text-slate-400">{event.patientPhone || "—"}</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                            {event.doctorName?.toLowerCase().includes("atanmadı") ? "Atanmamış" : (event.doctorName || "—")}
                                        </td>

                                        {/* Treatment */}
                                        <td className="px-4 py-3">
                                            <TreatmentBadge treatment={event.treatmentType} />
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <StatusBadge status={event.status} />
                                        </td>

                                        {/* Notes preview */}
                                        <td className="px-4 py-3 max-w-[160px]">
                                            <span className="text-[10px] text-slate-400 italic line-clamp-1">
                                                {event.patientNote || event.treatmentNote || "—"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                    {filtered.length} randevu {search && `("${search}" için)`}
                </span>
            </div>
        </div>
    );
}
