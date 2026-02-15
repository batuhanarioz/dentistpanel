import React from "react";
import { DashboardAppointment, DoctorOption } from "@/hooks/useDashboard";
import { STATUS_LABEL_MAP, STATUS_BADGE_CLASS } from "@/constants/dashboard";

interface AppointmentsSectionProps {
    isToday: boolean;
    appointments: DashboardAppointment[];
    loading: boolean;
    doctors: DoctorOption[];
    onOffsetChange: () => void;
    onStatusChange: (id: string, status: DashboardAppointment["status"]) => void;
    onAssignDoctor: (appointmentId: string, doctorId: string) => void;
    onReminderClick: (id: string) => void;
    onAppointmentClick: (id: string) => void;
}

function formatTime(dateString: string) {
    const d = new Date(dateString);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
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
    doctors,
    onOffsetChange,
    onStatusChange,
    onAssignDoctor,
    onReminderClick,
    onAppointmentClick
}: AppointmentsSectionProps) {
    return (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            {isToday ? "Bugünkü Randevular" : "Yarının Randevuları"}
                        </h2>
                        <p className="text-[11px] text-slate-400">{loading ? "Yükleniyor..." : `${appointments.length} randevu listeleniyor`}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOffsetChange}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                >
                    {isToday ? "Yarın →" : "← Bugün"}
                </button>
            </div>

            {/* Mobile View */}
            <div className="space-y-2 md:hidden px-5 pb-5 text-xs h-[320px] overflow-y-auto">
                {loading && (
                    <div className="py-6 text-center text-slate-400">Yükleniyor...</div>
                )}
                {!loading && appointments.length === 0 && (
                    <div className="py-8 text-center text-slate-500">Randevu bulunmuyor</div>
                )}
                {!loading && appointments.map((appt) => {
                    const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
                    const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
                    return (
                        <div key={appt.id} onClick={() => onAppointmentClick(appt.id)} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[9px] font-bold text-white uppercase">{appt.patientName[0]}</div>
                                    <div>
                                        <span className="text-xs font-semibold text-slate-900">{appt.patientName}</span>
                                        <div className="text-[10px] text-slate-400">{timeRange} · {treatmentLabel}</div>
                                    </div>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); onReminderClick(appt.id); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                                    <WhatsAppIcon /><span>Hatırlat</span>
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                {appt.status === "pending" ? (
                                    <select
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                                        value={appt.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onStatusChange(appt.id, e.target.value as any)}
                                    >
                                        <option value="pending">Onay bekliyor</option>
                                        <option value="confirmed">Onaylandı</option>
                                        <option value="cancelled">İptal</option>
                                    </select>
                                ) : (
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${STATUS_BADGE_CLASS[appt.status]}`}>
                                        {STATUS_LABEL_MAP[appt.status]}
                                    </span>
                                )}
                                <div>
                                    {appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                                        <span className="text-[11px] text-slate-600">{appt.doctorName}</span>
                                    ) : doctors.length > 0 ? (
                                        <select
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                                            defaultValue=""
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => onAssignDoctor(appt.id, e.target.value)}
                                        >
                                            <option value="">Doktor atanmadı</option>
                                            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                        </select>
                                    ) : <span className="text-[11px] text-slate-400">Doktor atanmadı</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                        <div className="grid grid-cols-[1fr_1.2fr_1fr_1.5fr] gap-3 items-center px-5 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-y text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span>Saat / İşlem</span>
                            <span>Hasta</span>
                            <span>Doktor</span>
                            <span>Durum & Aksiyonlar</span>
                        </div>
                        <div className="divide-y divide-slate-100 h-[320px] overflow-y-auto">
                            {!loading && appointments.length === 0 && (
                                <div className="px-5 py-10 text-center text-slate-500">Randevu bulunmuyor</div>
                            )}
                            {appointments.map((appt) => {
                                const timeRange = `${formatTime(appt.startsAt)} - ${formatTime(appt.endsAt)}`;
                                const treatmentLabel = appt.treatmentType?.trim() || "Genel muayene";
                                return (
                                    <div key={appt.id} onClick={() => onAppointmentClick(appt.id)} className="grid grid-cols-[1fr_1.2fr_1fr_1.5fr] gap-3 items-center px-5 py-3 transition-all hover:bg-slate-50/80 group text-xs cursor-pointer">
                                        <div>
                                            <div className="font-semibold text-slate-900">{timeRange}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{treatmentLabel}</div>
                                        </div>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white shadow-sm shrink-0 uppercase">{appt.patientName[0]}</div>
                                            <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{appt.patientName}</span>
                                        </div>
                                        <div>
                                            {appt.doctorId && appt.doctorName !== "Doktor atanmadı" ? (
                                                <span className="text-sm text-slate-700">{appt.doctorName}</span>
                                            ) : (
                                                <select
                                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] w-full"
                                                    defaultValue=""
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => onAssignDoctor(appt.id, e.target.value)}
                                                >
                                                    <option value="">Doktor atanmadı</option>
                                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onReminderClick(appt.id); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                                                <WhatsAppIcon /><span>Hatırlat</span>
                                            </button>
                                            {appt.status === "pending" ? (
                                                <select
                                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                                                    value={appt.status}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => onStatusChange(appt.id, e.target.value as any)}
                                                >
                                                    <option value="pending">Onay bekliyor</option>
                                                    <option value="confirmed">Onaylandı</option>
                                                    <option value="cancelled">İptal</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${STATUS_BADGE_CLASS[appt.status]}`}>
                                                    {STATUS_LABEL_MAP[appt.status]}
                                                </span>
                                            )}
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
