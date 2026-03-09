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
}

export function WeekView({
    weekDays,
    events,
    selectedDoctorIds,
    allDoctors,
    startHour,
    endHour,
    onEventClick,
}: WeekViewProps) {
    const isSingleDoctor = selectedDoctorIds.length === 1;
    const hourHeight = 60; // 1px per minute
    const totalHours = endHour - startHour;

    // Group events by day for density view
    const eventsByDay = useMemo(() => {
        const groups: Record<string, AppEvent[]> = {};
        events.forEach(e => {
            if (!groups[e.date]) groups[e.date] = [];
            groups[e.date].push(e);
        });
        return groups;
    }, [events]);

    const getDensityColor = (count: number) => {
        if (count === 0) return "bg-transparent text-slate-300";
        if (count < 5) return "bg-indigo-50 text-indigo-600 border-indigo-100";
        if (count < 15) return "bg-indigo-100 text-indigo-700 border-indigo-200";
        if (count < 25) return "bg-indigo-500 text-white border-indigo-400";
        return "bg-indigo-700 text-white border-indigo-600";
    };

    return (
        <div className="flex flex-col flex-1 bg-slate-50 overflow-hidden select-none">
            {/* Week Header */}
            <div className="flex bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
                <div className="w-16 border-r border-slate-100 shrink-0" />
                {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div key={day.toISOString()} className="flex-1 min-w-[120px] py-3 flex flex-col items-center border-r border-slate-100">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-indigo-600" : "text-slate-400"}`}>
                                {format(day, "EEEE", { locale: tr })}
                            </span>
                            <span className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-700"
                                }`}>
                                {format(day, "d")}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid Area */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="flex min-h-full pt-4"> {/* Added padding top for first label */}
                    {/* Time Rail */}
                    <div className="w-16 flex-shrink-0 bg-white border-r border-slate-200 relative z-10">
                        {Array.from({ length: totalHours + 1 }).map((_, i) => (
                            <div key={i} style={{ height: hourHeight }} className="relative">
                                <span className="absolute -top-2 px-1.5 right-2 text-[10px] font-black text-slate-400 tabular-nums bg-white shadow-sm rounded-md border border-slate-100">
                                    {String(startHour + i).padStart(2, "0")}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    <div className="flex flex-1 min-w-max relative">
                        {/* Hour horizontal dividers (grid lines) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    style={{ height: hourHeight, top: i * hourHeight }}
                                    className="border-b border-slate-100 w-full"
                                />
                            ))}
                        </div>

                        {weekDays.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const dayEvents = [...(eventsByDay[dateKey] || [])].sort((a, b) => {
                                const aStart = a.startHour * 60 + a.startMinute;
                                const bStart = b.startHour * 60 + b.startMinute;
                                if (aStart !== bStart) return aStart - bStart;
                                return b.durationMinutes - a.durationMinutes;
                            });

                            // Calculate Overlaps
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const groups: { events: any[], columns: number }[] = [];
                            let lastEventEnd = -1;

                            dayEvents.forEach(event => {
                                const start = event.startHour * 60 + event.startMinute;
                                const end = start + event.durationMinutes;

                                if (start >= lastEventEnd) {
                                    groups.push({ events: [], columns: 0 });
                                }
                                groups[groups.length - 1].events.push(event);
                                lastEventEnd = Math.max(lastEventEnd, end);
                            });

                            const positionedEvents = groups.flatMap(group => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const columns: any[][] = [];
                                group.events.forEach(event => {
                                    const start = event.startHour * 60 + event.startMinute;
                                    let placed = false;
                                    for (let i = 0; i < columns.length; i++) {
                                        const lastInCol = columns[i][columns[i].length - 1];
                                        const lastInColEnd = lastInCol.startHour * 60 + lastInCol.startMinute + lastInCol.durationMinutes;
                                        if (start >= lastInColEnd) {
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
                                group.events.forEach(e => (e as any).totalCols = columns.length);
                                return group.events;
                            });

                            return (
                                <div key={day.toISOString()} className="flex-1 min-w-[140px] border-r border-slate-100 relative group/col">
                                    {isSingleDoctor ? (
                                        positionedEvents.map(event => {
                                            const top = (event.startHour - startHour) * hourHeight + (event.startMinute / 60) * hourHeight;
                                            const height = Math.max((event.durationMinutes / 60) * hourHeight, 32);
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const colIdx = (event as any).colIdx || 0;
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const totalCols = (event as any).totalCols || 1;

                                            // Calculate horizontal position
                                            const widthPerc = 100 / totalCols;
                                            const leftPerc = colIdx * widthPerc;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => onEventClick(event.id)}
                                                    style={{
                                                        top,
                                                        height,
                                                        left: `${leftPerc}%`,
                                                        width: `${widthPerc}%`,
                                                        padding: '0 2px'
                                                    }}
                                                    className="absolute z-10 p-1 group"
                                                >
                                                    <div className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-indigo-400 hover:scale-[1.02] hover:z-20 active:scale-95 cursor-pointer flex">
                                                        <div className="w-1.5 bg-indigo-500 shrink-0" />
                                                        <div className="flex-1 p-1.5 flex flex-col leading-tight overflow-hidden">
                                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                                <span className="font-black text-[9px] truncate text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                                    {event.patientName}
                                                                </span>
                                                                <span className="text-[8px] font-black text-white bg-indigo-500 px-1 rounded tabular-nums shrink-0">
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
                                        // Clinic Overview Mode: Density Indicators
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 hover:bg-indigo-50/5 transition-colors">
                                            {dayEvents.length > 0 ? (
                                                <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-all hover:scale-125 hover:rotate-6 ${getDensityColor(dayEvents.length)}`}>
                                                    <span className="text-lg font-black leading-none">{dayEvents.length}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5 opacity-80">RNDV</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center opacity-10 group-hover/col:opacity-30 transition-opacity">
                                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
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
