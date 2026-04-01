import React from "react";
import { DashboardAppointment } from "@/hooks/useDashboard";
import { formatTime } from "@/lib/dateUtils";
import { SectionEmptyState } from "./SectionEmptyState";

interface AppointmentsSectionProps {
    isToday: boolean;
    appointments: DashboardAppointment[];
    loading: boolean;
    onOffsetChange: () => void;
    onReminderClick: (id: string) => void;
    onAppointmentClick?: (id: string) => void;
    doctors: Array<{ id: string; full_name: string }>;
    onAssignDoctor: (id: string, docId: string) => void;
}

function getStatusStyles(status: string) {
    switch (status) {
        case "confirmed":
            return { row: "hover:bg-indigo-50/40", border: "border-l-2 border-l-indigo-400", badge: "bg-indigo-50 text-indigo-600" };
        case "completed":
            return { row: "hover:bg-emerald-50/40 opacity-80", border: "border-l-2 border-l-emerald-400", badge: "bg-emerald-50 text-emerald-600" };
        case "cancelled":
            return { row: "hover:bg-rose-50/30 opacity-60", border: "border-l-2 border-l-rose-400", badge: "bg-rose-50 text-rose-600" };
        case "no_show":
            return { row: "hover:bg-slate-50/40 opacity-70", border: "border-l-2 border-l-slate-300", badge: "bg-slate-100 text-slate-500" };
        case "arrived":
            return { row: "hover:bg-blue-50/40", border: "border-l-2 border-l-blue-400", badge: "bg-blue-50 text-blue-600" };
        case "in_treatment":
            return { row: "hover:bg-amber-50/40", border: "border-l-2 border-l-amber-400", badge: "bg-amber-50 text-amber-600" };
        default:
            return { row: "hover:bg-indigo-50/40", border: "border-l-2 border-l-slate-100", badge: "bg-slate-100 text-slate-500" };
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "confirmed": return "Planlı";
        case "completed": return "Tamamlandı";
        case "cancelled": return "İptal";
        case "no_show": return "Gelmedi";
        case "arrived": return "Geldi";
        case "in_treatment": return "Tedavide";
        default: return "Planlı";
    }
}


function WhatsAppIcon() {
    return (
        <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12.04 2C6.59 2 2.18 6.41 2.18 11.86c0 2.09.61 4.02 1.78 5.71L2 22l4.57-1.91a9.8 9.8 0 0 0 5.47 1.61h.01c5.45 0 9.86-4.41 9.86-9.86C21.91 6.41 17.5 2 12.04 2Zm5.8 13.77c-.24.68-1.18 1.29-1.93 1.46-.52.11-1.2.2-3.48-.75-2.92-1.21-4.8-4.18-4.95-4.38-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.51.24.58.82 2.01.89 2.15.07.14.11.3.02.48-.09.19-.14.3-.29.46-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12.99 2.07 1.3 2.38 1.45.31.15.49.13.67-.08.18-.21.77-.9.98-1.21.21-.31.41-.26.69-.16.29.1 1.8.85 2.11 1.01.31.16.52.24.6.38.08.14.08.8-.16 1.48Z" />
        </svg>
    );
}

export function AppointmentsSection({
    isToday,
    appointments,
    loading,
    onOffsetChange,
    onReminderClick,
    onAppointmentClick,
    doctors,
    onAssignDoctor,
}: AppointmentsSectionProps) {
    return (
        <section className="group/card rounded-[28px] border border-slate-100 bg-white shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col relative" style={{ height: '416px' }}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-indigo-100 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200/60 shrink-0">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            {isToday ? "Bugünün Randevuları" : "Yarının Randevuları"}
                        </h2>
                        <p className="text-[11px] text-slate-400">{loading ? "Yükleniyor..." : `${appointments.length} randevu listeleniyor`}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOffsetChange}
                    className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                    {isToday ? "Yarın →" : "← Bugün"}
                </button>
            </div>

            {/* Mobile View */}
            <div className="space-y-2 md:hidden px-4 pb-4 text-xs h-[320px] overflow-y-auto relative z-10">
                {loading && (
                    <div className="space-y-2 pt-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 p-3 flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-28 rounded-full bg-slate-100" />
                                    <div className="h-2.5 w-20 rounded-full bg-slate-100" />
                                </div>
                                <div className="h-7 w-7 rounded-xl bg-slate-100" />
                            </div>
                        ))}
                    </div>
                )}
                {!loading && appointments.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <SectionEmptyState
                            gradient="from-indigo-400 to-violet-500"
                            shadow="shadow-indigo-200/60"
                            title="Randevu bulunmuyor"
                            description="Bu gün için planlanmış randevu yok."
                            icon={
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                            }
                        />
                    </div>
                )}
                {!loading && appointments.map((appt) => {
                    const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
                    const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
                    const ss = getStatusStyles(appt.status);
                    return (
                        <div
                            key={appt.id}
                            onClick={() => onAppointmentClick?.(appt.id)}
                            className={`rounded-2xl border bg-white p-3 select-none cursor-pointer hover:shadow-lg hover:shadow-indigo-100/60 hover:border-indigo-200 transition-all duration-200 ${ss.border}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-md shadow-indigo-200/50 uppercase">
                                    {appt.patientName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-900">{appt.patientName}</span>
                                        {appt.status !== "confirmed" && (
                                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black ${ss.badge}`}>{getStatusLabel(appt.status)}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-black text-indigo-500">{timeRange}</span>
                                        <span className="text-[10px] text-slate-300">·</span>
                                        <span className="text-[10px] text-slate-400">{treatmentLabel}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onReminderClick(appt.id); }}
                                    className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm shadow-emerald-200/60 active:scale-95 transition-all shrink-0"
                                >
                                    <WhatsAppIcon /><span>İletişim</span>
                                </button>
                            </div>
                            {appt.doctorName && (
                                <div className="mt-2 ml-11 flex items-center gap-1">
                                    <svg className="h-3 w-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-slate-400">{appt.doctorName}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block relative z-10">
                <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-3 items-center px-5 py-2.5 bg-gradient-to-r from-indigo-50/70 via-violet-50/40 to-transparent border-y border-indigo-100/60">
                            {["Saat / İşlem", "Hasta", "Hekim", "İletişim"].map((label) => (
                                <span key={label} className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400/80">{label}</span>
                            ))}
                        </div>
                        <div className="h-[320px] overflow-y-auto">
                            {loading && (
                                <div className="space-y-0">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="animate-pulse grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-3 items-center px-5 py-3.5 border-b border-slate-50">
                                            <div className="space-y-1.5">
                                                <div className="h-3 w-16 rounded-full bg-slate-100" />
                                                <div className="h-2.5 w-20 rounded-full bg-slate-100" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                                                <div className="h-3 w-20 rounded-full bg-slate-100" />
                                            </div>
                                            <div className="h-3 w-16 rounded-full bg-slate-100" />
                                            <div className="h-7 w-7 rounded-xl bg-slate-100" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!loading && appointments.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                        <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">Randevu bulunmuyor</p>
                                </div>
                            )}
                            {appointments.map((appt) => {
                                const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
                                const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
                                const ss = getStatusStyles(appt.status);
                                return (
                                    <div
                                        key={appt.id}
                                        onClick={() => onAppointmentClick?.(appt.id)}
                                        className={`grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-3 items-center px-5 py-3 select-none cursor-pointer border-b border-slate-50/80 transition-all duration-200 ${ss.row} ${ss.border}`}
                                    >
                                        {/* Saat / İşlem */}
                                        <div>
                                            <div className="text-sm font-black text-slate-900 tracking-tight">{timeRange}</div>
                                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{treatmentLabel}</div>
                                        </div>

                                        {/* Hasta */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-md shadow-indigo-200/50 shrink-0 uppercase">
                                                {appt.patientName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold text-slate-900 truncate block">{appt.patientName}</span>
                                                {appt.status !== "confirmed" && (
                                                    <span className={`inline-flex text-[9px] px-2 py-0.5 rounded-lg font-black ${ss.badge}`}>{getStatusLabel(appt.status)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hekim */}
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <div className="relative group/select">
                                                <select
                                                    value={appt.doctorId || ""}
                                                    onChange={(e) => onAssignDoctor(appt.id, e.target.value)}
                                                    className={`w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-[11px] font-bold text-slate-600 outline-none hover:bg-white hover:border-indigo-300 transition-all cursor-pointer ${!appt.doctorId ? 'text-rose-500 bg-rose-50/30 border-rose-100 hover:bg-rose-50' : ''}`}
                                                >
                                                    <option value="">Hekim Atanmadı</option>
                                                    {doctors.map(d => (
                                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400 group-hover/select:text-indigo-500">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* İletişim */}
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => onReminderClick(appt.id)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md shadow-emerald-200/60 hover:shadow-emerald-300/70 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 whitespace-nowrap"
                                            >
                                                <WhatsAppIcon />
                                                <span>İletişime Geç</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
