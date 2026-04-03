"use client";

import { useRef, useState, useMemo } from "react";
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

    // ── Overlap Layout Algorithm ──────────────────────────────────────────────
    const eventLayouts = useMemo(() => {
        // 1. Sort by start time
        const sorted = [...events].sort((a, b) => {
            const aStart = a.startHour * 60 + a.startMinute;
            const bStart = b.startHour * 60 + b.startMinute;
            return aStart - bStart || a.durationMinutes - b.durationMinutes;
        });

        const layouts = new Map<string, { top: number; height: number; left: number; width: number }>();

        // Helper to check if event overlaps with any in a column
        function overlaps(e: AppEvent, col: AppEvent[]) {
            const eStart = e.startHour * 60 + e.startMinute;
            const eEnd = eStart + e.durationMinutes;
            return col.some(c => {
                const cStart = c.startHour * 60 + c.startMinute;
                const cEnd = cStart + c.durationMinutes;
                // Small buffer to avoid overlap when one ends exactly when another starts
                return eStart < (cEnd - 0.5) && (eEnd - 0.5) > cStart;
            });
        }

        // Group events into overlapping clusters
        const clusters: AppEvent[][] = [];
        let currentCluster: AppEvent[] = [];
        let clusterEnd = 0;

        for (const e of sorted) {
            const eStart = e.startHour * 60 + e.startMinute;
            if (eStart >= (clusterEnd - 0.5) && currentCluster.length > 0) {
                clusters.push(currentCluster);
                currentCluster = [];
                clusterEnd = 0;
            }
            currentCluster.push(e);
            clusterEnd = Math.max(clusterEnd, eStart + e.durationMinutes);
        }
        if (currentCluster.length > 0) clusters.push(currentCluster);

        // For each cluster, assign columns
        for (const cluster of clusters) {
            const clusterColumns: AppEvent[][] = [];
            for (const e of cluster) {
                let placed = false;
                for (let i = 0; i < clusterColumns.length; i++) {
                    if (!overlaps(e, clusterColumns[i])) {
                        clusterColumns[i].push(e);
                        placed = true;
                        break;
                    }
                }
                if (!placed) clusterColumns.push([e]);
            }

            const numCols = clusterColumns.length;
            for (let i = 0; i < numCols; i++) {
                for (const e of clusterColumns[i]) {
                    const minutesFromStart = (e.startHour - startHour) * 60 + e.startMinute;
                    const top = (minutesFromStart / SLOT_DURATION) * slotHeight;
                    const height = (e.durationMinutes / SLOT_DURATION) * slotHeight;
                    layouts.set(e.id, {
                        top,
                        height,
                        left: (i / numCols) * 100,
                        width: 100 / numCols
                    });
                }
            }
        }

        return layouts;
    }, [events, startHour, slotHeight, SLOT_DURATION]);

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
        const colRect = columnRef.current!.getBoundingClientRect();
        const rawY = e.clientY - colRect.top;
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

        const colRect = columnRef.current!.getBoundingClientRect();
        // Adjust for where within the card the user grabbed
        const rawY = e.clientY - colRect.top - offsetY;
        
        // Clamp to valid range
        const clampedY = Math.max(0, Math.min(rawY, totalHeight));

        // Snap to slot boundaries
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
                    const layout = eventLayouts.get(event.id);
                    if (!layout) return null;

                    return (
                        <AppointmentCard
                            key={event.id}
                            event={event}
                            top={layout.top}
                            height={layout.height}
                            width={layout.width}
                            left={layout.left}
                            slotHeight={slotHeight}
                            onClick={() => onCardClick(event.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
