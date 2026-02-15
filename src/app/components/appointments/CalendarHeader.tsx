import React from "react";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

interface CalendarHeaderProps {
    selectedDate: string;
    today: string;
    onDateChange: (date: string) => void;
    onTodayClick: () => void;
    onNewAppointmentClick: () => void;
    appointmentCount?: number;
}

export function CalendarHeader({
    selectedDate,
    today,
    onDateChange,
    onTodayClick,
    onNewAppointmentClick,
    appointmentCount = 0,
}: CalendarHeaderProps) {
    const formattedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-2 border border-indigo-100 shadow-sm transition-all hover:bg-indigo-100/50 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                        <span className="text-sm font-black">{appointmentCount}</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">Toplam Randevu</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{formattedDate}</p>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-2 ml-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-white shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center gap-3 px-1">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Onaylı</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Onay bekliyor</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Tamamlandı</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">İptal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm">
                    <button
                        onClick={() => {
                            const d = new Date(selectedDate + "T12:00:00");
                            d.setDate(d.getDate() - 1);
                            onDateChange(d.toISOString().split("T")[0]);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <button
                        onClick={onTodayClick}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${selectedDate === today ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        Bugün
                    </button>
                    <button
                        onClick={() => {
                            const d = new Date(selectedDate + "T12:00:00");
                            d.setDate(d.getDate() + 1);
                            onDateChange(d.toISOString().split("T")[0]);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>

                <div className="relative">
                    <PremiumDatePicker
                        value={selectedDate}
                        onChange={onDateChange}
                        today={today}
                        compact
                    />
                </div>

                <button
                    onClick={onNewAppointmentClick}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Yeni Randevu
                </button>
            </div>
        </div>
    );
}
