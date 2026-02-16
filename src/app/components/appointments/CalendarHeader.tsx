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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="flex items-center gap-3 rounded-xl md:rounded-2xl bg-indigo-50 px-3 md:px-4 py-1.5 md:py-2 border border-indigo-100 shadow-sm transition-all hover:bg-indigo-100/50 group">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <span className="text-xs md:text-sm font-black">{appointmentCount}</span>
                        </div>
                        <div>
                            <h1 className="text-[10px] md:text-sm font-extrabold text-slate-900 tracking-tight">Toplam Randevu</h1>
                            <p className="text-[9px] md:text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-tight">{formattedDate}</p>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 ml-2">
                        <div className="flex items-center gap-2 md:gap-3 px-2.5 py-1.5 rounded-xl border bg-white shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Planlandı</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Tamamlandı</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">İptal Edildi</span>
                            </div>
                            <div className="h-3 w-px bg-slate-100" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Gelmedi</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Legend - Compact Dots */}
                <div className="flex lg:hidden items-center justify-center gap-4 py-1 bg-white/50 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.3)]" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">PLANLANDI</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">TAMAMLANDI</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.3)]" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">İPTAL EDİLDİ</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-500 shadow-[0_0_4px_rgba(100,116,139,0.3)]" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">GELMEDİ</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center rounded-xl border bg-white p-1 shadow-sm shrink-0">
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate + "T12:00:00");
                                d.setDate(d.getDate() - 1);
                                onDateChange(d.toISOString().split("T")[0]);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button
                            onClick={onTodayClick}
                            className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all uppercase tracking-tight ${selectedDate === today ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
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
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <PremiumDatePicker
                            value={selectedDate}
                            onChange={onDateChange}
                            today={today}
                            compact
                        />
                    </div>
                </div>

                <button
                    onClick={onNewAppointmentClick}
                    className="w-full md:w-auto h-11 md:h-10 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-[11px] font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Yeni Randevu</span>
                </button>
            </div>
        </div>
    );
}
