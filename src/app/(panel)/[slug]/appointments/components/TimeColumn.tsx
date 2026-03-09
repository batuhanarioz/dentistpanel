"use client";

import type { ZoomLevel } from "@/hooks/useAppointments";

interface TimeColumnProps {
    startHour: number;
    endHour: number;
    hourHeight: number;
    slotHeight: number;
    zoom: ZoomLevel;
}

export function TimeColumn({ startHour, endHour, slotHeight, zoom }: TimeColumnProps) {
    const slots: { label: string; isHour: boolean }[] = [];
    const SLOT_DURATION = zoom;

    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += SLOT_DURATION) {
            slots.push({
                label: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
                isHour: m === 0,
            });
        }
    }

    return (
        <div className="relative select-none">
            {slots.map((slot, idx) => (
                <div
                    key={idx}
                    style={{ height: `${slotHeight}px` }}
                    className="relative flex items-center justify-end pr-2"
                >
                    {slot.isHour ? (
                        <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                            {slot.label}
                        </span>
                    ) : (
                        <span className="text-[10px] font-medium text-slate-400 tabular-nums opacity-60">
                            {slot.label.split(":")[1]}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
