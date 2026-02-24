"use client";

import { useState } from "react";
import { useDashboard, ControlItem } from "@/hooks/useDashboard";
import { StatCards } from "@/app/components/dashboard/StatCards";
import { AppointmentsSection } from "@/app/components/dashboard/AppointmentsSection";
import { ControlListSection } from "@/app/components/dashboard/ControlListSection";
import { AppointmentDetailDrawer } from "@/app/components/dashboard/AppointmentDetailDrawer";
import { DashboardAnalytics } from "@/app/components/dashboard/DashboardAnalytics";
import { GuidedTour, restartTour } from "@/app/components/GuidedTour";
import { useClinic } from "@/app/context/ClinicContext";

export default function DashboardView() {
    const { userEmail } = useClinic();
    const isDemoUser = userEmail === "izmirdis@gmail.com";
    const {
        appointments,
        loading,
        doctors,
        controlItems,
        viewOffsetAppointments,
        setViewOffsetAppointments,
        viewOffsetControls,
        setViewOffsetControls,
        handleAssignDoctor,
        handleStatusChange,
    } = useDashboard();

    // Derived stats
    const totalToday = appointments.length;
    const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

    const handleReminderClick = (appointmentId: string) => {
        const appt = appointments.find((a) => a.id === appointmentId);
        if (!appt || !appt.patientPhone) {
            alert("Hasta telefonu kayıtlı değil!");
            return;
        }
        const phone = appt.patientPhone.replace(/\D/g, "");
        const text = `Merhaba Sayın ${appt.patientName}, randevunuzu hatırlatmak isteriz.`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
    };

    const handleControlItemClick = (item: ControlItem) => {
        setSelectedAppointmentId(item.appointmentId);
    };

    return (
        <div className="space-y-6">
            <GuidedTour runOnMount={true} />

            <div className="flex items-center justify-between">
                <div>
                    {/* Mevcut başlık AppShell tarafından HeaderContext ile yönetiliyor olabilir */}
                </div>
                {isDemoUser && (
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
                        <button
                            onClick={restartTour}
                            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors shadow-sm"
                        >
                            <span>🧪 Rehberi Tekrar Başlat</span>
                        </button>

                        <a
                            href="tel:+905432934381"
                            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>Hemen Ara</span>
                        </a>

                        <a
                            href="https://wa.me/905432934381"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            <span>WhatsApp</span>
                        </a>
                    </div>
                )}
            </div>

            <StatCards
                isToday={viewOffsetAppointments === 0}
                totalToday={totalToday}
                confirmedCount={confirmedCount}
                controlCount={controlItems.length}
                loading={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
                <div className="space-y-6">
                    <AppointmentsSection
                        isToday={viewOffsetAppointments === 0}
                        appointments={appointments}
                        loading={loading}
                        onOffsetChange={() => setViewOffsetAppointments((prev: number) => (prev === 0 ? 1 : 0))}
                        onReminderClick={handleReminderClick}
                    />
                </div>

                <ControlListSection
                    isToday={viewOffsetControls === 0}
                    controlItems={controlItems}
                    onOffsetChange={() => setViewOffsetControls((prev: number) => (prev === 0 ? 1 : 0))}
                    onItemClick={handleControlItemClick}
                />
            </div>

            <DashboardAnalytics />

            <AppointmentDetailDrawer
                appointmentId={selectedAppointmentId}
                onClose={() => setSelectedAppointmentId(null)}
                onStatusChange={handleStatusChange}
                onAssignDoctor={handleAssignDoctor}
                doctors={doctors}
            />
        </div>
    );
}
