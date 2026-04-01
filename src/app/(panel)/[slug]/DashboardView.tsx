"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useDashboard, ControlItem } from "@/hooks/useDashboard";
import { UserRole } from "@/types/database";
import { usePageHeader } from "@/app/components/AppShell";
import { StatCards } from "@/app/components/dashboard/StatCards";
import { AppointmentsSection } from "@/app/components/dashboard/AppointmentsSection";
import { ControlListSection } from "@/app/components/dashboard/ControlListSection";
import { AppointmentDrawer } from "@/app/(panel)/[slug]/appointments/components/AppointmentDrawer";
import dynamic from "next/dynamic";
const DashboardAnalytics = dynamic(
    () => import("@/app/components/dashboard/DashboardAnalytics").then(m => m.DashboardAnalytics),
    { ssr: false, loading: () => <div className="h-40 flex items-center justify-center text-xs text-slate-500 animate-pulse">Grafik yükleniyor...</div> }
);
import { useClinic } from "@/app/context/ClinicContext";
import { QuickPaymentModal } from "@/app/components/dashboard/QuickPaymentModal";
import { TreatmentActionModal } from "@/app/components/dashboard/TreatmentActionModal";
import { SmartAssistantSection } from "@/app/components/dashboard/SmartAssistantSection";
import { useAppointmentManagement } from "@/hooks/useAppointmentManagement";
import { AppointmentModal } from "@/app/components/appointments/AppointmentModal";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";
import { SectionErrorBoundary } from "@/app/components/SectionErrorBoundary";
import { LabAlertBanner } from "@/app/components/lab/LabAlertBanner";

function pickGreeting(name: string | null): string {
    const firstName = name?.split(" ")[0] ?? "";
    const hour = new Date().getHours();
    const pools = {
        morning: firstName ? [
            `Günaydın, ${firstName} 👋`,
            `Yeni bir güne hoş geldin, ${firstName}! ☀️`,
            `Harika bir gün olsun, ${firstName}!`,
        ] : ["Günaydın! ☀️", "Harika bir gün olsun!", "Yeni bir güne hoş geldin!"],
        afternoon: firstName ? [
            `İyi günler, ${firstName} 👋`,
            `Günün geri kalanı verimli geçsin, ${firstName}!`,
            `Öğleden sonra da devam ediyor, ${firstName}! 💪`,
        ] : ["İyi günler! 👋", "Verimli bir öğleden sonra!", "Devam ediyor! 💪"],
        evening: firstName ? [
            `İyi akşamlar, ${firstName} 👋`,
            `Günü başarıyla tamamlıyorsunuz, ${firstName}! 🌆`,
            `Akşam saatlerine kadar devam, ${firstName}!`,
        ] : ["İyi akşamlar! 🌆", "Günü başarıyla tamamlıyorsunuz!", "Akşam saatlerine kadar devam!"],
        night: firstName ? [
            `İyi geceler, ${firstName} 👋`,
            `Geç saate kadar çalışıyorsun, ${firstName} 🌙`,
            `Bugün iyi iş çıkardın, ${firstName}! ⭐`,
        ] : ["İyi geceler! 🌙", "Geç saatlere kadar devam!", "İyi iş çıkardınız! ⭐"],
    };
    const pool =
        hour >= 5 && hour < 12 ? pools.morning :
            hour >= 12 && hour < 18 ? pools.afternoon :
                hour >= 18 && hour < 21 ? pools.evening : pools.night;
    return pool[Math.floor(Math.random() * pool.length)];
}


export default function DashboardView() {
    const { userName, userRole, isAdmin } = useClinic();
    const queryClient = useQueryClient();
    const {
        appointments,
        loading,
        checklistLoading,
        doctors,
        controlItems,
        viewOffsetAppointments,
        setViewOffsetAppointments,
        handleAssignDoctor,
        handleStatusChange,
        noShowCount,
        completedCount,
        todayRevenue,
    } = useDashboard();

    const [greeting] = useState(() => pickGreeting(userName));
    usePageHeader("Klinik Genel Bakış");

    // Rol bazlı görünürlük
    const isSekreter = userRole === UserRole.SEKRETER;
    const isFinans = userRole === UserRole.FINANS;
    const showFinancial = isAdmin || isFinans;
    const showAnalytics = isAdmin || isFinans;
    const showSmartAssistant = !isFinans; // Finans rolü mesaj göndermiyor genellikle

    const invalidateDashboard = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboardAppointments"] });
        queryClient.invalidateQueries({ queryKey: ["checklistItems"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardAnalytics"] });
        queryClient.invalidateQueries({ queryKey: ["todayRevenue"] });
    };

    // Randevu oluşturma (inline modal)
    const apptMgmt = useAppointmentManagement();

    // Derived stats
    const totalToday = appointments.length;
    const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const [paymentAppointment, setPaymentAppointment] = useState<{ id: string, patientName: string, amount: number, patientId?: string, itemId?: string, code?: string } | null>(null);
    const [noteAppointment, setNoteAppointment] = useState<{ id: string; patientId: string; patientName: string; itemId?: string; } | null>(null);

    const handleReminderClick = (appointmentId: string) => {
        const appt = appointments.find((a) => a.id === appointmentId);
        if (!appt || !appt.patientPhone) {
            toast.error("Hasta telefonu kayıtlı değil");
            return;
        }
        const text = `Merhaba Sayın ${appt.patientName}, randevunuzu hatırlatmak isteriz.`;
        const url = `https://wa.me/${formatPhoneForWhatsApp(appt.patientPhone)}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
    };

    const handleControlItemClick = (item: ControlItem) => {
        setSelectedAppointmentId(item.appointmentId);
    };

    return (
        <div className="space-y-6">
            {/* Header: Selam + Hızlı Eylemler */}
            <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-slate-600 leading-snug" suppressHydrationWarning>{greeting}</p>
                <button
                    onClick={() => apptMgmt.openNew()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Yeni Randevu</span>
                </button>
            </div>


            {/* Sekreter bilgi mesajı */}
            {isSekreter && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-5 py-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="text-xs text-sky-700 font-medium">
                        Bugün iletişime geçilmesi gereken hastaları Kontrol Listesi&apos;nde ve Akıllı Asistan&apos;da bulabilirsiniz.
                    </p>
                </div>
            )}

            <SectionErrorBoundary label="Laboratuvar Alarmı">
                <LabAlertBanner />
            </SectionErrorBoundary>

            <SectionErrorBoundary label="İstatistik Kartları">
                <StatCards
                    isToday={viewOffsetAppointments === 0}
                    totalToday={totalToday}
                    confirmedCount={confirmedCount}
                    completedCount={completedCount}
                    noShowCount={noShowCount}
                    controlCount={controlItems.length}
                    paidTotal={showFinancial ? todayRevenue.paidTotal : 0}
                    pendingTotal={showFinancial ? todayRevenue.pendingTotal : 0}
                    loading={loading}
                />
            </SectionErrorBoundary>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
                <div className="space-y-6">
                    <SectionErrorBoundary label="Randevu Listesi">
                        <AppointmentsSection
                            isToday={viewOffsetAppointments === 0}
                            appointments={appointments}
                            loading={loading}
                            onOffsetChange={() => setViewOffsetAppointments((prev: 0 | 1) => (prev === 0 ? 1 : 0))}
                            onReminderClick={handleReminderClick}
                            onAppointmentClick={(id) => setSelectedAppointmentId(id)}
                            doctors={doctors}
                            onAssignDoctor={handleAssignDoctor}
                        />
                    </SectionErrorBoundary>
                </div>

                <SectionErrorBoundary label="Kontrol Listesi">
                    <ControlListSection
                        controlItems={controlItems}
                        onStatusChange={handleStatusChange}
                        onPaymentClick={(item) => setPaymentAppointment({
                            id: item.appointmentId,
                            patientName: item.patientName,
                            amount: item.estimatedAmount,
                            patientId: item.patientId,
                            itemId: item.id,
                            code: item.code
                        })}
                        onTreatmentNoteClick={(item) => setNoteAppointment({
                            id: item.appointmentId,
                            patientId: item.patientId,
                            patientName: item.patientName,
                            itemId: item.id
                        })}
                        onCardClick={handleControlItemClick}
                        doctors={doctors}
                        onAssignDoctor={handleAssignDoctor}
                        loading={checklistLoading}
                    />
                </SectionErrorBoundary>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {showAnalytics && (
                    <SectionErrorBoundary label="Analitik">
                        <DashboardAnalytics />
                    </SectionErrorBoundary>
                )}
                {showSmartAssistant && (
                    <SectionErrorBoundary label="Akıllı Asistan">
                        <SmartAssistantSection />
                    </SectionErrorBoundary>
                )}
            </div>

            <AppointmentDrawer
                appointmentId={selectedAppointmentId}
                onClose={() => setSelectedAppointmentId(null)}
                onStatusChange={handleStatusChange}
                onEditClick={(id) => {
                    const fullAppt = appointments.find(a => a.id === id);
                    if (fullAppt) apptMgmt.openEdit(fullAppt);
                }}
                doctors={doctors}
            />

            {paymentAppointment && (
                <QuickPaymentModal
                    open={!!paymentAppointment}
                    onClose={() => setPaymentAppointment(null)}
                    appointmentId={paymentAppointment.id}
                    patientName={paymentAppointment.patientName}
                    patientId={paymentAppointment.patientId}
                    initialAmount={paymentAppointment.amount}
                    checklistItemId={paymentAppointment.itemId}
                    code={paymentAppointment.code}
                    onSuccess={() => {
                        setPaymentAppointment(null);
                        invalidateDashboard();
                    }}
                />
            )}

            {noteAppointment && (
                <TreatmentActionModal
                    open={!!noteAppointment}
                    onClose={() => setNoteAppointment(null)}
                    appointmentId={noteAppointment.id}
                    patientId={noteAppointment.patientId}
                    patientName={noteAppointment.patientName}
                    checklistItemId={noteAppointment.itemId}
                    onSuccess={() => {
                        setNoteAppointment(null);
                        invalidateDashboard();
                    }}
                />
            )}

            <AppointmentModal
                isOpen={apptMgmt.modalOpen}
                onClose={() => { apptMgmt.closeModal(); invalidateDashboard(); }}
                editing={apptMgmt.editing}
                formDate={apptMgmt.formDate}
                setFormDate={apptMgmt.setFormDate}
                formTime={apptMgmt.formTime}
                setFormTime={apptMgmt.setFormTime}
                today={apptMgmt.today}
                todaySchedule={apptMgmt.todaySchedule}
                form={apptMgmt.form}
                setForm={apptMgmt.setForm}
                doctors={apptMgmt.doctors}
                patientSearch={apptMgmt.patientSearch}
                setPatientSearch={apptMgmt.setPatientSearch}
                patientSearchResults={apptMgmt.patientSearchResults}
                patientSearchLoading={apptMgmt.patientSearchLoading}
                selectedPatientId={apptMgmt.selectedPatientId}
                setSelectedPatientId={apptMgmt.setSelectedPatientId}
                duplicatePatient={apptMgmt.duplicatePatient}
                isNewPatient={apptMgmt.isNewPatient}
                patientMatchInfo={apptMgmt.patientMatchInfo}
                conflictWarning={apptMgmt.conflictWarning}
                phoneCountryCode={apptMgmt.phoneCountryCode}
                setPhoneCountryCode={apptMgmt.setPhoneCountryCode}
                phoneNumber={apptMgmt.phoneNumber}
                setPhoneNumber={apptMgmt.setPhoneNumber}
                handleSubmit={(e) => { apptMgmt.handleSubmit(e).then(() => invalidateDashboard()); }}
                handleDelete={async () => { await apptMgmt.handleDelete(); invalidateDashboard(); }}
                handleUseDuplicate={apptMgmt.handleUseDuplicate}
                submitError={apptMgmt.submitError}
                isSubmitting={apptMgmt.isSubmitting}
                treatmentDefinitions={apptMgmt.treatmentDefinitions}
            />
        </div>
    );
}
