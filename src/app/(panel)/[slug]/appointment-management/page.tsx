"use client";

import { useAppointmentManagement } from "@/hooks/useAppointmentManagement";
import { CalendarHeader } from "@/app/components/appointments/CalendarHeader";
import { CalendarGrid } from "@/app/components/appointments/CalendarGrid";
import { AppointmentModal } from "@/app/components/appointments/AppointmentModal";

export default function AppointmentCalendarPage() {
    const {
        today,
        selectedDate,
        setSelectedDate,
        appointments,
        modalOpen,
        setModalOpen,
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
        workingHourSlots,
        patients
    } = useAppointmentManagement();

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

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
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
                    patients={patients}
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
        </div>
    );
}