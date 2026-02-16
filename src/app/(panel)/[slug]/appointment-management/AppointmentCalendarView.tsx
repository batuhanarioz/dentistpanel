"use client";

import { useAppointmentManagement, CalendarAppointment } from "@/hooks/useAppointmentManagement";
import { CalendarHeader } from "@/app/components/appointments/CalendarHeader";
import { CalendarGrid } from "@/app/components/appointments/CalendarGrid";
import { AppointmentModal } from "@/app/components/appointments/AppointmentModal";

interface AppointmentCalendarViewProps {
    initialAppointments: CalendarAppointment[];
    clinicId: string;
    slug: string;
}

export default function AppointmentCalendarView({ initialAppointments, clinicId, slug }: AppointmentCalendarViewProps) {
    const {
        today,
        selectedDate,
        setSelectedDate,
        appointments,
        appointmentsLoading,
        modalOpen,
        editing,
        formTime,
        setFormTime,
        formDate,
        setFormDate,
        doctors,
        phoneNumber,
        setPhoneNumber,
        phoneCountryCode,
        setPhoneCountryCode,
        patientSearch,
        setPatientSearch,
        patientSearchResults,
        patientSearchLoading,
        selectedPatientId,
        setSelectedPatientId,
        duplicatePatient,
        form,
        setForm,
        patientMatchInfo,
        isNewPatient,
        conflictWarning,
        matchedPatientAllergies,
        matchedPatientMedicalAlerts,
        openNew,
        openEdit,
        handleSubmit,
        handleDelete,
        handleUseDuplicate,
        closeModal,
        todaySchedule,
        isDayOff,
        workingHourSlots
    } = useAppointmentManagement({ appointments: initialAppointments, clinicId, slug });

    return (
        <div className="space-y-6">
            <CalendarHeader
                selectedDate={selectedDate}
                today={today}
                onDateChange={setSelectedDate}
                onTodayClick={() => setSelectedDate(today)}
                onNewAppointmentClick={() => openNew()}
                appointmentCount={appointments.length}
            />

            <section className="rounded-2xl md:rounded-3xl border bg-white p-3 md:p-6 shadow-sm relative min-h-[400px]">
                {appointmentsLoading && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-indigo-100 overflow-hidden">
                        <div className="h-full bg-indigo-600 animate-progress origin-left" />
                    </div>
                )}
                <CalendarGrid
                    appointments={appointments}
                    workingHourSlots={workingHourSlots}
                    isDayOff={isDayOff}
                    onSlotClick={openNew}
                    onEditClick={openEdit}
                />
            </section>

            {modalOpen && (
                <AppointmentModal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    editing={editing}
                    formDate={formDate}
                    setFormDate={setFormDate}
                    formTime={formTime}
                    setFormTime={setFormTime}
                    today={today}
                    todaySchedule={todaySchedule}
                    form={form}
                    setForm={setForm}
                    doctors={doctors}
                    patientSearch={patientSearch}
                    setPatientSearch={setPatientSearch}
                    patientSearchResults={patientSearchResults}
                    patientSearchLoading={patientSearchLoading}
                    selectedPatientId={selectedPatientId}
                    setSelectedPatientId={setSelectedPatientId}
                    duplicatePatient={duplicatePatient}
                    isNewPatient={isNewPatient}
                    patientMatchInfo={patientMatchInfo}
                    matchedPatientAllergies={matchedPatientAllergies}
                    matchedPatientMedicalAlerts={matchedPatientMedicalAlerts}
                    conflictWarning={conflictWarning}
                    phoneCountryCode={phoneCountryCode}
                    setPhoneCountryCode={setPhoneCountryCode}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    handleSubmit={handleSubmit}
                    handleDelete={handleDelete}
                    handleUseDuplicate={handleUseDuplicate}
                />
            )}

            <style jsx>{`
                @keyframes progress {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(0.5); }
                    100% { transform: scaleX(1); }
                }
                .animate-progress {
                    animation: progress 1s infinite linear;
                }
            `}</style>
        </div>
    );
}
