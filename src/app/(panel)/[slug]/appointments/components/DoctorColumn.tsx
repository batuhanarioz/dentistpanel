"use client";

import { useRef, useState } from "react";
import type { AppEvent, DoctorOption, ZoomLevel } from "@/hooks/useAppointments";
import { AppointmentCard } from "./AppointmentCard";

interface DoctorColumnProps {
    doctor: DoctorOption;
    events: AppEvent[];
    date: string;
    startHour: number;
    endHour: number;
    hourHeight: number;
    slotHeight: number;
    zoom: ZoomLevel;
    onCardClick: (id: string) => void;
    onEventDrop: (
        eventId: string,
        durationMinutes: number,
        newHour: number,
        newMinute: number,
        newDoctorId: string
    ) => void;
    onSlotClick?: (hour: number, minute: number, doctorId: string) => void;
}

export function DoctorColumn({
    doctor,
    events,
    startHour,
    endHour,
    hourHeight,
    slotHeight,
    zoom,
    onCardClick,
    onEventDrop,
    onSlotClick,
}: DoctorColumnProps) {
    const columnRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const SLOT_DURATION = zoom; // minutes
    const totalHeight = (endHour - startHour) * hourHeight;
    const slotsPerHour = 60 / SLOT_DURATION;
    const totalSlots = (endHour - startHour) * slotsPerHour;

    // ── Card position calculation ──────────────────────────────────────────────
    function getCardPosition(event: AppEvent): { top: number; height: number } {
        const minutesFromStart = (event.startHour - startHour) * 60 + event.startMinute;
        const slotsFromStart = minutesFromStart / SLOT_DURATION;
        const top = slotsFromStart * slotHeight;
        const height = (event.durationMinutes / SLOT_DURATION) * slotHeight;
        return { top, height };
    }

    // ── Drag & Drop handlers ───────────────────────────────────────────────────
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSlotClick) return;
        const target = e.target as HTMLElement;
        // Only fire for clicks on the column background or grid lines
        if (target !== columnRef.current && target.dataset.slotBg !== "true") return;
        const scrollEl = columnRef.current?.closest("[data-scroll]") as HTMLElement | null;
        const scrollTop = scrollEl?.scrollTop ?? 0;
        const colRect = columnRef.current!.getBoundingClientRect();
        const rawY = e.clientY - colRect.top + scrollTop;
        const clampedY = Math.max(0, Math.min(rawY, totalHeight));
        const slotIdx = Math.floor(clampedY / slotHeight);
        const snappedMinutes = slotIdx * SLOT_DURATION;
        const newHour = startHour + Math.floor(snappedMinutes / 60);
        const newMinute = snappedMinutes % 60;
        if (newHour >= endHour) return;
        onSlotClick(newHour, newMinute, doctor.id);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        const raw = e.dataTransfer.getData("text/plain");
        if (!raw) return;

        let payload: { eventId: string; durationMinutes: number; offsetY: number };
        try { payload = JSON.parse(raw); } catch { return; }

        const { eventId, durationMinutes, offsetY = 0 } = payload;

        // Find scroll container (data-scroll attribute we set in SchedulerGrid)
        const scrollEl = columnRef.current?.closest("[data-scroll]") as HTMLElement | null;
        const scrollTop = scrollEl?.scrollTop ?? 0;

        const colRect = columnRef.current!.getBoundingClientRect();
        // Adjust for where within the card the user grabbed
        const rawY = e.clientY - colRect.top + scrollTop - offsetY;

        // Clamp to valid range
        const clampedY = Math.max(0, Math.min(rawY, totalHeight));

        // Snap to 15m slots
        const slotIdx = Math.round(clampedY / slotHeight);
        const snappedMinutes = slotIdx * SLOT_DURATION;

        const newHour = startHour + Math.floor(snappedMinutes / 60);
        const newMinute = snappedMinutes % 60;

        // Guard bounds
        if (newHour >= endHour) return;

        onEventDrop(eventId, durationMinutes, newHour, newMinute, doctor.id);
    };

    // ── Grid lines ─────────────────────────────────────────────────────────────
    const gridLines = Array.from({ length: totalSlots }, (_, i) => i);

    return (
        <div className="flex-1 min-w-[260px] border-r border-slate-100 flex flex-col shrink-0">

            {/* Schedule Area */}
            <div
                ref={columnRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleColumnClick}
                className={`relative transition-colors duration-150 ${isDragOver ? "bg-teal-50/60" : "bg-white"} ${onSlotClick ? "cursor-crosshair" : ""}`}
                style={{ height: `${totalHeight}px` }}
            >
                {/* Drop indicator overlay */}
                {isDragOver && (
                    <div className="absolute inset-0 border-2 border-dashed border-teal-300 pointer-events-none z-20 rounded-sm" />
                )}

                {/* Background grid lines */}
                {gridLines.map((i) => (
                    <div
                        key={i}
                        data-slot-bg="true"
                        className={`absolute left-0 right-0 border-t ${i % (60 / SLOT_DURATION) === 0
                            ? "border-slate-200/60"
                            : "border-slate-100"
                            }`}
                        style={{ top: `${i * slotHeight}px` }}
                    />
                ))}

                {/* Appointment Cards */}
                {events.map((event) => {
                    const { top, height } = getCardPosition(event);
                    return (
                        <AppointmentCard
                            key={event.id}
                            event={event}
                            top={top}
                            height={height}
                            slotHeight={slotHeight}
                            onClick={() => onCardClick(event.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
