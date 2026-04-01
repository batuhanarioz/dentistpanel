"use client";

import { format } from "date-fns";
import type { AppEvent, ExtendedStatus } from "@/hooks/useAppointments";

// ─── Color Helpers ────────────────────────────────────────────────────────────

function getTreatmentColors(treatmentType: string): string {
    const t = (treatmentType || "").toLowerCase();
    if (t.includes("kanal") || t.includes("kanal tedavi"))
        return "bg-purple-50 text-purple-900 border-purple-200";
    if (t.includes("implant") || t.includes("cekim") || t.includes("cerrahi") || t.includes("gömük"))
        return "bg-orange-50 text-orange-900 border-orange-200";
    if (t.includes("temizlik") || t.includes("beyazlatma") || t.includes("tartır"))
        return "bg-teal-50 text-teal-900 border-teal-200";
    if (t.includes("protez") || t.includes("ortodonti") || t.includes("veneer") || t.includes("zirkonyum"))
        return "bg-indigo-50 text-indigo-900 border-indigo-200";
    // default — examination / muayene
    return "bg-blue-50 text-blue-900 border-blue-200";
}

function getStatusAccent(status: ExtendedStatus): string {
    switch (status) {
        case "arrived": return "border-l-[3px] border-sky-400";
        case "in_treatment": return "border-l-[3px] border-amber-400 animate-pulse";
        case "completed": return "border-l-[3px] border-emerald-500";
        case "no_show": return "border-l-[3px] border-rose-400 opacity-60 grayscale";
        case "cancelled": return "border-l-[3px] border-slate-300 opacity-40 grayscale";
        default: return "border-l-[3px] border-transparent";
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AppointmentCardProps {
    event: AppEvent;
    top: number;
    height: number;
    slotHeight: number;
    onClick: () => void;
}

export function AppointmentCard({ event, top, height, slotHeight, onClick }: AppointmentCardProps) {
    const isUltraCompact = height < 35;
    const isCompact = height >= 35 && height < 75;

    const colorClass = getTreatmentColors(event.treatmentType);
    const accentClass = getStatusAccent(event.status);

    const startTime = new Date(`${event.date}T${event.startHour.toString().padStart(2, "0")}:${event.startMinute.toString().padStart(2, "0")}:00`);
    const endTime = new Date(startTime.getTime() + event.durationMinutes * 60000);
    const timeStr = `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ eventId: event.id, durationMinutes: event.durationMinutes, offsetY })
        );
        setTimeout(() => {
            target.classList.add("opacity-40");
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove("opacity-40");
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
            className={`absolute left-[2px] right-[2px] rounded-lg border shadow-sm cursor-grab active:cursor-grabbing select-none overflow-hidden group transition-all hover:shadow-lg hover:z-[60] hover:-translate-y-0.5 ${colorClass} ${accentClass}`}
        >
            {/* ── Content ── */}
            {isUltraCompact ? (
                // Single-line ultra compact (15 min)
                <div className="flex items-center gap-1.5 h-full px-2">
                    <span className="font-bold text-[10px] truncate leading-none">
                        {event.patientName}
                    </span>
                    <span className="font-medium tabular-nums text-[8px] opacity-50 shrink-0 ml-auto leading-none">
                        {format(startTime, "HH:mm")}
                    </span>
                </div>
            ) : isCompact ? (
                // Two lines compact (30 min)
                <div className="flex flex-col justify-center h-full px-2 py-1 gap-0">
                    <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-[11px] truncate leading-tight">{event.patientName}</span>
                        <span className="font-medium tabular-nums text-[8px] opacity-40 shrink-0">{format(startTime, "HH:mm")}</span>
                    </div>
                    <span className="text-[10px] opacity-70 truncate leading-tight">{event.treatmentType}</span>
                </div>
            ) : (
                // Full card (45+ min)
                <div className="flex flex-col h-full px-2.5 py-2 gap-1">
                    <div className="flex flex-col leading-tight">
                        <span className="font-bold text-xs truncate text-slate-900">{event.patientName}</span>
                        <span className="text-[10px] font-medium text-slate-500">{timeStr}</span>
                    </div>
                    <div className="flex flex-col mt-0.5">
                        <span className="text-[10px] font-semibold opacity-80 truncate">{event.treatmentType}</span>
                        <span className="text-[9px] font-medium opacity-40 truncate flex items-center gap-1 mt-0.5">
                            <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                            {event.doctorName?.toLowerCase().includes("atanmadı") ? "Atanmamış" : (event.doctorName || "Hekim Seçilmedi")}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Hover Tooltip ── */}
            <div className="hidden group-hover:flex absolute left-[105%] top-0 z-[200] w-52 flex-col bg-slate-800/95 backdrop-blur-sm text-white text-[11px] rounded-xl p-3 shadow-2xl pointer-events-none gap-1.5 border border-slate-700">
                <div className="font-semibold text-sm leading-tight">{event.patientName}</div>
                <div className="text-slate-400 text-[10px]">{event.patientPhone || "Tel yok"}</div>
                <div className="h-px bg-slate-700 my-0.5" />
                <div className="flex justify-between">
                    <span className="text-slate-400">Tedavi:</span>
                    <span className="font-medium truncate ml-2">{event.treatmentType}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Süre:</span>
                    <span className="font-medium">{event.durationMinutes} dk</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Durum:</span>
                    <span className="font-medium capitalize">{event.status?.replace("_", " ")}</span>
                </div>
                {event.patientNote && (
                    <div className="mt-1 pt-1.5 border-t border-slate-700 text-slate-300 italic line-clamp-2 text-[10px]">
                        {event.patientNote}
                    </div>
                )}
            </div>
        </div>
    );
}
