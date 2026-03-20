"use client";

import { useUnifiedAppointments } from "@/hooks/useUnifiedAppointments";
import { AppointmentsHeader } from "@/app/(panel)/[slug]/appointments/components/AppointmentsHeader";
import { SchedulerGrid } from "@/app/(panel)/[slug]/appointments/components/SchedulerGrid";
import { WeekView } from "@/app/(panel)/[slug]/appointments/components/WeekView";
import { AppointmentListView } from "@/app/(panel)/[slug]/appointments/components/AppointmentListView";
import { AppointmentDrawer } from "@/app/(panel)/[slug]/appointments/components/AppointmentDrawer";
import { AppointmentModal } from "@/app/components/appointments/AppointmentModal";

export default function AppointmentCalendarView() {
    const {
        // Grid
        selectedDate, setSelectedDate, dateStr, weekDays, weekRangeStr,
        goToPrev, goToNext, goToToday, view, setView, zoom, setZoom,
        doctors, visibleDoctors, selectedDoctorIds, setSelectedDoctorIds,
        filteredEvents, totalCount, eventCounts, loading, startHour, endHour,
        handleEventDrop, handleStatusChange, selectedAppointmentId, setSelectedAppointmentId,
        // Modal
        today, modalOpen, editing, form, setForm, formTime, setFormTime, formDate, setFormDate,
        doctorNames, phoneNumber, setPhoneNumber, phoneCountryCode, setPhoneCountryCode,
        patientSearch, setPatientSearch, patientSearchResults, patientSearchLoading,
        selectedPatientId, setSelectedPatientId, duplicatePatient, patientMatchInfo,
        isNewPatient, conflictWarning, submitError, isSubmitting,
        openNew, handleSubmit, handleDelete, handleUseDuplicate, closeModal,
        todaySchedule, treatmentDefinitions,
        // Bridges
        onSlotClick, onEditFromDrawer,
    } = useUnifiedAppointments();

    return (
        <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-slate-50">
            {/* Header */}
            <AppointmentsHeader
                selectedDate={selectedDate}
                weekRangeStr={weekRangeStr}
                onPrev={goToPrev}
                onNext={goToNext}
                onToday={goToToday}
                onDateChange={setSelectedDate}
                doctors={doctors}
                selectedDoctorIds={selectedDoctorIds}
                onDoctorChange={setSelectedDoctorIds}
                zoom={zoom}
                onZoomChange={setZoom}
                view={view}
                onViewChange={setView}
                loading={loading}
                totalCount={totalCount}
                eventCounts={eventCounts}
                onNewAppointment={() => openNew(undefined, dateStr)}
            />

            {/* Main content area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {view === "grid" ? (
                    <SchedulerGrid
                        dateStr={dateStr}
                        visibleDoctors={visibleDoctors}
                        events={filteredEvents}
                        zoom={zoom}
                        startHour={startHour}
                        endHour={endHour}
                        onEventClick={(id) => setSelectedAppointmentId(id)}
                        onEventDrop={handleEventDrop}
                        onSlotClick={onSlotClick}
                    />
                ) : view === "week" ? (
                    <WeekView
                        weekDays={weekDays}
                        events={filteredEvents}
                        selectedDoctorIds={selectedDoctorIds}
                        allDoctors={doctors}
                        startHour={startHour}
                        endHour={endHour}
                        onEventClick={(id) => setSelectedAppointmentId(id)}
                        onDayClick={(date) => { setSelectedDate(date); setView("grid"); }}
                    />
                ) : (
                    <AppointmentListView
                        events={filteredEvents}
                        onCardClick={(id) => setSelectedAppointmentId(id)}
                    />
                )}
            </div>

            {/* Right slide-out drawer */}
            <AppointmentDrawer
                appointmentId={selectedAppointmentId}
                doctors={doctors}
                onClose={() => setSelectedAppointmentId(null)}
                onStatusChange={handleStatusChange}
                onEditClick={onEditFromDrawer}
            />

            {/* Full edit modal */}
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
                    doctors={doctorNames}
                    patientSearch={patientSearch}
                    setPatientSearch={setPatientSearch}
                    patientSearchResults={patientSearchResults}
                    patientSearchLoading={patientSearchLoading}
                    selectedPatientId={selectedPatientId}
                    setSelectedPatientId={setSelectedPatientId}
                    duplicatePatient={duplicatePatient}
                    isNewPatient={isNewPatient}
                    patientMatchInfo={patientMatchInfo}
                    conflictWarning={conflictWarning}
                    submitError={submitError}
                    isSubmitting={isSubmitting}
                    phoneCountryCode={phoneCountryCode}
                    setPhoneCountryCode={setPhoneCountryCode}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    handleSubmit={handleSubmit}
                    handleDelete={handleDelete}
                    handleUseDuplicate={handleUseDuplicate}
                    treatmentDefinitions={treatmentDefinitions}
                />
            )}
        </div>
    );
}
