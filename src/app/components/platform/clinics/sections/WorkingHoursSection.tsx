import React from "react";
import { DayOfWeek, WorkingHours } from "@/types/database";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";

interface WorkingHoursSectionProps {
    workingHours: WorkingHours;
    updateDaySchedule: (day: DayOfWeek, field: string, value: string | boolean) => void;
}

export function WorkingHoursSection({ workingHours, updateDaySchedule }: WorkingHoursSectionProps) {
    return (
        <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-800">
                Çalışma Günleri ve Saatleri
            </label>
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {ORDERED_DAYS.map((day) => {
                    const schedule = workingHours[day];
                    return (
                        <div
                            key={day}
                            className={[
                                "flex items-center gap-2 px-3 py-2 text-[11px]",
                                schedule.enabled ? "" : "opacity-50 bg-slate-50",
                            ].join(" ")}
                        >
                            <label className="flex items-center gap-2 w-24 shrink-0 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={schedule.enabled}
                                    onChange={(e) => updateDaySchedule(day, "enabled", e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-medium text-slate-800">{DAY_LABELS[day]}</span>
                            </label>
                            <input
                                type="time"
                                value={schedule.open}
                                onChange={(e) => updateDaySchedule(day, "open", e.target.value)}
                                disabled={!schedule.enabled}
                                className="rounded-md border px-1.5 py-0.5 text-[11px] w-20 px-2"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="time"
                                value={schedule.close}
                                onChange={(e) => updateDaySchedule(day, "close", e.target.value)}
                                disabled={!schedule.enabled}
                                className="rounded-md border px-1.5 py-0.5 text-[11px] w-20 px-2"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
