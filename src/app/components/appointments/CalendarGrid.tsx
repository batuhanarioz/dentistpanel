import React from "react";
import { CalendarAppointment } from "@/hooks/useAppointmentManagement";
import { TREATMENTS, STATUS_COLORS } from "@/constants/appointments";

interface CalendarGridProps {
    appointments: CalendarAppointment[];
    workingHourSlots: number[];
    isDayOff: boolean;
    onSlotClick: (hour: number) => void;
    onEditClick: (appt: CalendarAppointment) => void;
}

export function CalendarGrid({
    appointments,
    workingHourSlots,
    isDayOff,
    onSlotClick,
    onEditClick,
}: CalendarGridProps) {
    const now = new Date();

    if (isDayOff && appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="h-20 w-20 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-5 text-slate-300 shadow-sm animate-pulse">
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <h3 className="text-slate-900 font-black text-lg tracking-tight">Klinik Kapalı</h3>
                <p className="text-slate-400 text-sm mt-1.5 font-medium">Bu gün için çalışma saati tanımlanmamış.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {workingHourSlots.map((hour) => {
                const hourAppointments = appointments.filter((a) => a.startHour === hour);
                const hourLabel = `${hour.toString().padStart(2, "0")}:00`;

                return (
                    <div key={hour} className="group relative grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr] gap-4 md:gap-8 items-start">
                        {/* Time Label */}
                        <div className="pt-2 text-right sticky top-0">
                            <span className="text-sm font-black text-slate-400 group-hover:text-indigo-600 transition-all duration-300 uppercase tracking-tighter">
                                {hourLabel}
                            </span>
                            <div className="h-px w-8 bg-slate-100 mt-2 ml-auto group-hover:bg-indigo-200 group-hover:w-12 transition-all" />
                        </div>

                        {/* Slot Container */}
                        <div
                            onClick={() => !isDayOff && onSlotClick(hour)}
                            className={`relative min-h-[110px] rounded-2xl border-2 p-4 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] ${isDayOff
                                    ? "bg-slate-50/50 border-slate-100 cursor-default"
                                    : "bg-white border-slate-50 hover:border-indigo-100 hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.08)] cursor-alias group/slot"
                                }`}
                        >
                            {!isDayOff && hourAppointments.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/slot:translate-y-0">
                                    <div className="px-5 py-2 rounded-full bg-indigo-600 text-[11px] font-black text-white shadow-xl shadow-indigo-200 uppercase tracking-widest">
                                        Randevu Al +
                                    </div>
                                </div>
                            )}

                            {isDayOff && hourAppointments.length === 0 && (
                                <div className="absolute inset-x-0 top-0 h-full flex items-center justify-center pointer-events-none opacity-40">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest select-none">Klinik Kapalı</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {hourAppointments.map((a) => {
                                    const startTime = new Date(
                                        `${a.date}T${a.startHour.toString().padStart(2, "0")}:${(a.startMinute ?? 0).toString().padStart(2, "0")}:00`
                                    );
                                    const endTime = new Date(startTime.getTime() + a.durationMinutes * 60000);
                                    const isPast = endTime < now;

                                    let statusKey = a.dbStatus as string;
                                    if (statusKey === "confirmed" && isPast) statusKey = "past";
                                    else if (statusKey !== "cancelled" && statusKey !== "no_show" && statusKey !== "confirmed" && statusKey !== "completed" && statusKey !== "past") statusKey = "pending";

                                    const colors = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;

                                    return (
                                        <div
                                            key={a.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditClick(a);
                                            }}
                                            className={`group/card relative overflow-hidden rounded-2xl border px-4 py-3.5 text-xs transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-md ${colors.card}`}
                                        >
                                            <div className="flex items-center justify-between gap-4 relative z-10">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 shadow-sm ${colors.dot} ring-4 ring-white/30`} />
                                                    <div className="min-w-0">
                                                        <div className="font-extrabold text-slate-900 truncate tracking-tight text-sm">
                                                            {a.patientName}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-bold tracking-tight mt-0.5">
                                                            {a.startHour.toString().padStart(2, "0")}:{(a.startMinute ?? 0).toString().padStart(2, "0")} – {endTime.getHours().toString().padStart(2, "0")}:{endTime.getMinutes().toString().padStart(2, "0")}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="block text-[10px] text-slate-400 font-black uppercase tracking-tighter">Doktor</span>
                                                    <span className="text-[11px] text-slate-700 font-bold truncate">
                                                        {a.doctor || "Atanmadı"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 text-[10px] relative z-10">
                                                <div className="flex items-center gap-2">
                                                    {a.treatmentType && (
                                                        <span className="inline-flex items-center rounded-lg bg-white/80 border py-1 px-2.5 font-bold text-slate-600 shadow-sm">
                                                            {TREATMENTS.find(t => t.value === a.treatmentType)?.label || a.treatmentType}
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-1 rounded-lg bg-slate-100/50 font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                                                        {a.channel}
                                                    </span>
                                                </div>
                                                {a.phone && (
                                                    <span className="text-slate-400 font-medium tracking-tight">
                                                        {a.phone}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Subtle background decoration */}
                                            <div className={`absolute -right-4 -bottom-4 h-16 w-16 rounded-full opacity-5 transition-transform group-hover/card:scale-150 ${colors.dot}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
