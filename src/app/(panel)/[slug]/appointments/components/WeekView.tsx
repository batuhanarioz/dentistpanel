"use client";

import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import type { AppEvent, DoctorOption } from "@/hooks/useAppointments";

interface WeekViewProps {
    weekDays: Date[];
    events: AppEvent[];
    selectedDoctorIds: string[];
    allDoctors: DoctorOption[];
    startHour: number;
    endHour: number;
    onEventClick: (id: string) => void;
    onDayClick?: (date: Date) => void;
}

export function WeekView({
    weekDays,
    events,
    selectedDoctorIds,
    allDoctors,
    startHour,
    endHour,
    onEventClick,
    onDayClick,
}: WeekViewProps) {
    const isSingleDoctor = selectedDoctorIds.length === 1;
    const hourHeight = 60; // 1px per minute
    const totalHours = endHour - startHour;
    const TIME_COL_W = 56; // w-14 = 56px
    const DAY_COL_MIN_W = 130; // minimum day column width
    const totalMinWidth = TIME_COL_W + weekDays.length * DAY_COL_MIN_W;

    const eventsByDay = useMemo(() => {
        const groups: Record<string, AppEvent[]> = {};
        events.forEach(e => {
            if (!groups[e.date]) groups[e.date] = [];
            groups[e.date].push(e);
        });
        return groups;
    }, [events]);

    return (
        <div className="flex-1 overflow-auto custom-scrollbar select-none bg-slate-50">
            <div style={{ minWidth: `${totalMinWidth}px` }}>

                {/* ── Sticky header row ─────────────────────────────────────────── */}
                <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                    {/* Corner cell — sticky left AND top */}
                    <div
                        className="flex-shrink-0 sticky left-0 z-40 bg-white border-r border-slate-100"
                        style={{ width: TIME_COL_W }}
                    />
                    {/* Day headers */}
                    {weekDays.map((day) => {
                        const isToday = isSameDay(day, new Date());
                        const dateKey = format(day, "yyyy-MM-dd");
                        const dayCount = !isSingleDoctor ? (eventsByDay[dateKey]?.length ?? 0) : 0;
                        return (
                            <div
                                key={day.toISOString()}
                                style={{ minWidth: DAY_COL_MIN_W }}
                                className="flex-1 py-3 flex flex-col items-center border-r border-slate-100 relative"
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-teal-600" : "text-slate-400"}`}>
                                    {format(day, "EEE", { locale: tr })}
                                </span>
                                <span className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isToday ? "bg-teal-600 text-white shadow-md shadow-teal-100" : "text-slate-700"}`}>
                                    {format(day, "d")}
                                </span>
                                {dayCount > 0 && (
                                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 leading-none">
                                        {dayCount}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Body ──────────────────────────────────────────────────────── */}
                <div className="flex" style={{ height: `${totalHours * hourHeight + 16}px` }}>

                    {/* Sticky time column */}
                    <div
                        className="flex-shrink-0 sticky left-0 z-20 bg-white border-r border-slate-200 pt-4"
                        style={{ width: TIME_COL_W }}
                    >
                        {Array.from({ length: totalHours + 1 }).map((_, i) => (
                            <div key={i} style={{ height: hourHeight }} className="relative">
                                <span className="absolute -top-2 right-1.5 text-[9px] font-black text-slate-400 tabular-nums bg-white rounded px-0.5">
                                    {String(startHour + i).padStart(2, "0")}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    <div className="flex flex-1 relative pt-4">
                        {/* Horizontal grid lines */}
                        <div className="absolute inset-0 pointer-events-none pt-4">
                            {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="border-b border-slate-100 w-full"
                                    style={{ height: hourHeight }}
                                />
                            ))}
                        </div>

                        {weekDays.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const dayEvents = [...(eventsByDay[dateKey] || [])].sort((a, b) =>
                                (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute)
                            );

                            // Overlap calculation for single-doctor view
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const positionedEvents: any[] = [];
                            if (isSingleDoctor) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const columns: any[][] = [];
                                dayEvents.forEach(event => {
                                    const start = event.startHour * 60 + event.startMinute;
                                    let placed = false;
                                    for (let i = 0; i < columns.length; i++) {
                                        const last = columns[i][columns[i].length - 1];
                                        const lastEnd = last.startHour * 60 + last.startMinute + last.durationMinutes;
                                        if (start >= lastEnd) {
                                            columns[i].push(event);
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            (event as any).colIdx = i;
                                            placed = true;
                                            break;
                                        }
                                    }
                                    if (!placed) {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        (event as any).colIdx = columns.length;
                                        columns.push([event]);
                                    }
                                });
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                dayEvents.forEach(e => { (e as any).totalCols = columns.length; });
                                positionedEvents.push(...dayEvents);
                            }

                            return (
                                <div
                                    key={day.toISOString()}
                                    style={{ minWidth: DAY_COL_MIN_W }}
                                    className={`flex-1 border-r border-slate-100 relative group/col ${onDayClick ? "cursor-pointer" : ""}`}
                                    onClick={onDayClick ? () => onDayClick(day) : undefined}
                                >
                                    {isSingleDoctor ? (
                                        positionedEvents.map(event => {
                                            const top = (event.startHour - startHour) * hourHeight + (event.startMinute / 60) * hourHeight;
                                            const height = Math.max((event.durationMinutes / 60) * hourHeight, 32);
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const colIdx = (event as any).colIdx || 0;
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const totalCols = (event as any).totalCols || 1;
                                            const widthPerc = 100 / totalCols;
                                            const leftPerc = colIdx * widthPerc;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); onEventClick(event.id); }}
                                                    style={{ top, height, left: `${leftPerc}%`, width: `${widthPerc}%`, padding: "0 2px" }}
                                                    className="absolute z-10 p-1 group cursor-pointer"
                                                >
                                                    <div className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-teal-400 hover:scale-[1.02] hover:z-20 active:scale-95 flex">
                                                        <div className="w-1.5 bg-teal-500 shrink-0" />
                                                        <div className="flex-1 p-1.5 flex flex-col leading-tight overflow-hidden">
                                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                                <span className="font-black text-[9px] truncate text-slate-800 group-hover:text-teal-600 transition-colors uppercase tracking-tight">
                                                                    {event.patientName}
                                                                </span>
                                                                <span className="text-[8px] font-black text-white bg-teal-500 px-1 rounded tabular-nums shrink-0">
                                                                    {String(event.startHour).padStart(2, "0")}:{String(event.startMinute).padStart(2, "0")}
                                                                </span>
                                                            </div>
                                                            {height > 35 && (
                                                                <span className="text-[8px] font-bold text-slate-400 truncate mt-0.5">
                                                                    {event.treatmentType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        // Multi-doctor: mini blocks at real positions + tap to open day
                                        <>
                                            {dayEvents.length === 0 ? (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover/col:opacity-20 transition-opacity">
                                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <>
                                                    {dayEvents.map((event) => {
                                                        const top = (event.startHour - startHour) * hourHeight + (event.startMinute / 60) * hourHeight;
                                                        const height = Math.max((event.durationMinutes / 60) * hourHeight, 22);
                                                        return (
                                                            <div
                                                                key={event.id}
                                                                style={{ top, height, left: 3, right: 3 }}
                                                                className="absolute rounded-md border border-teal-200 bg-teal-50 overflow-hidden hover:bg-teal-100 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer px-1.5 py-0.5 z-10"
                                                                onClick={(e) => { e.stopPropagation(); onEventClick(event.id); }}
                                                            >
                                                                <p className="text-[9px] font-black text-teal-900 truncate leading-tight">
                                                                    {event.patientName}
                                                                </p>
                                                                {height > 22 && (
                                                                    <p className="text-[8px] text-teal-600 font-bold tabular-nums truncate">
                                                                        {String(event.startHour).padStart(2, "0")}:{String(event.startMinute).padStart(2, "0")}
                                                                        {event.treatmentType ? ` · ${event.treatmentType}` : ""}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                            {onDayClick && (
                                                <div className="absolute inset-0 bg-teal-500/0 hover:bg-teal-500/5 transition-colors" />
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
