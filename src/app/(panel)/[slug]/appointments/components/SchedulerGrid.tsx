"use client";

import { useMemo } from "react";
import type { AppEvent, DoctorOption, ZoomLevel } from "@/hooks/useAppointments";
import { TimeColumn } from "./TimeColumn";
import { DoctorColumn } from "./DoctorColumn";

const START_HOUR = 8;
const END_HOUR = 19;

// px per hour at each zoom level
const HOUR_HEIGHT_MAP: Record<ZoomLevel, number> = {
    15: 160,
    30: 120,
    60: 80,
};

interface SchedulerGridProps {
    dateStr: string;
    visibleDoctors: DoctorOption[];
    events: AppEvent[];
    zoom: ZoomLevel;
    startHour: number;
    endHour: number;
    onEventClick: (id: string) => void;
    onEventDrop: (
        eventId: string,
        durationMinutes: number,
        newHour: number,
        newMinute: number,
        newDoctorId: string
    ) => void;
    onSlotClick?: (hour: number, minute: number, doctorId: string) => void;
}

export function SchedulerGrid({
    dateStr,
    visibleDoctors,
    events,
    zoom,
    startHour,
    endHour,
    onEventClick,
    onEventDrop,
    onSlotClick,
}: SchedulerGridProps) {
    const SLOT_HEIGHT = 40;
    const SLOT_DURATION = zoom; // minutes (15, 30, or 60)
    const HOUR_HEIGHT = SLOT_HEIGHT * (60 / SLOT_DURATION);
    const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

    // Group events per doctor
    const eventsByDoctor = useMemo(() => {
        const map: Record<string, AppEvent[]> = {};
        for (const doctor of visibleDoctors) {
            map[doctor.id] = events.filter((e) => {
                const effectiveDoctorId = e.doctorId || "unassigned";
                return effectiveDoctorId === doctor.id;
            });
        }
        return map;
    }, [events, visibleDoctors]);

    if (visibleDoctors.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50/50">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                <p className="text-sm font-medium text-center">
                    Görüntülenecek hekim bulunamadı.<br />
                    <span className="text-xs text-slate-300">Kliniğe hekim ekleyin veya filtreyi değiştirin.</span>
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar relative">
            <div className="flex min-w-full relative" style={{ minHeight: `${totalHeight + 50}px` }}>
                {/* LEFT: sticky time column */}
                <div className="flex-shrink-0 w-16 sticky left-0 z-30 bg-white border-r border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.03)]" data-scroll>
                    {/* Header spacer */}
                    <div className="h-12 border-b border-slate-200 bg-slate-50/90 flex items-center justify-center sticky top-0 z-40">
                        <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    {/* Time labels area */}
                    <div className="relative">
                        <TimeColumn
                            startHour={startHour}
                            endHour={endHour}
                            hourHeight={HOUR_HEIGHT}
                            slotHeight={SLOT_HEIGHT}
                            zoom={zoom}
                        />
                    </div>
                </div>

                {/* DOCTOR COLUMNS */}
                <div className="flex flex-col flex-1">
                    {/* Sticky Doctor Header Row */}
                    <div className="sticky top-0 z-20 flex bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm min-w-full">
                        {visibleDoctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="flex-1 min-w-[260px] h-12 flex items-center justify-center border-r border-slate-100 px-3 shrink-0"
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="h-7 w-7 rounded-full bg-teal-50 flex items-center justify-center text-[10px] font-bold text-teal-600 border border-teal-100 shrink-0 uppercase">
                                        {doctor.full_name?.toLowerCase().includes("atanmadı") ? '?' : (doctor.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'H')}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 truncate">
                                        {doctor.full_name?.toLowerCase().includes("atanmadı") ? "Atanmamış" : doctor.full_name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Columns Row */}
                    <div
                        className="flex flex-1 relative bg-[linear-gradient(to_bottom,transparent_39px,#f1f5f9_40px)] bg-[length:100%_40px]"
                        style={{ height: `${totalHeight}px` }}
                    >
                        {visibleDoctors.map((doctor) => (
                            <DoctorColumn
                                key={doctor.id}
                                doctor={doctor}
                                events={eventsByDoctor[doctor.id] || []}
                                date={dateStr}
                                startHour={startHour}
                                endHour={endHour}
                                hourHeight={HOUR_HEIGHT}
                                slotHeight={SLOT_HEIGHT}
                                zoom={zoom}
                                onCardClick={onEventClick}
                                onEventDrop={onEventDrop}
                                onSlotClick={onSlotClick}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
