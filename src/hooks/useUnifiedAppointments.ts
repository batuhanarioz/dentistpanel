"use client";

import { useCallback } from "react";
import { useAppointments } from "./useAppointments";
import { useAppointmentManagement, CalendarAppointment } from "./useAppointmentManagement";
import type { AppEvent } from "./useAppointments";
import type { AppointmentStatus } from "@/types/database";

function appEventToCalendarAppt(event: AppEvent): CalendarAppointment {
    const status = event.status as AppointmentStatus;
    return {
        id: event.id,
        date: event.date,
        startHour: event.startHour,
        startMinute: event.startMinute,
        durationMinutes: event.durationMinutes,
        patientName: event.patientName,
        phone: event.patientPhone,
        email: event.patientEmail,
        doctor: event.doctorName,
        doctorId: event.doctorId,
        channel: event.channel || "",
        treatmentType: event.treatmentType,
        status,
        dbStatus: status,
        patientNote: event.patientNote,
        treatmentNote: event.treatmentNote,
        patientId: event.patientId,
        birthDate: "",
        tags: [],
    };
}

export function useUnifiedAppointments() {
    // ── Grid & View state ──────────────────────────────────────────────────────
    const grid = useAppointments();

    // ── Modal & Form state ─────────────────────────────────────────────────────
    const modal = useAppointmentManagement();

    // ── Bridge: empty slot click → open modal pre-filled ──────────────────────
    const onSlotClick = useCallback(
        (hour: number, minute: number, doctorId: string) => {
            const doctor = grid.doctors.find((d) => d.id === doctorId);
            modal.openNew(hour, grid.dateStr, minute, doctor?.full_name);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [grid.doctors, grid.dateStr]
    );

    // ── Bridge: drawer "Düzenle" → close drawer, open modal ───────────────────
    const onEditFromDrawer = useCallback(
        (appointmentId: string) => {
            const event = grid.filteredEvents.find((e) => e.id === appointmentId);
            if (!event) return;
            modal.openEdit(appEventToCalendarAppt(event));
            grid.setSelectedAppointmentId(null);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [grid.filteredEvents, grid.setSelectedAppointmentId]
    );

    return {
        // ── Grid (display) ────────────────────────────────────────────────────
        selectedDate: grid.selectedDate,
        setSelectedDate: grid.setSelectedDate,
        dateStr: grid.dateStr,
        weekDays: grid.weekDays,
        weekRangeStr: grid.weekRangeStr,
        goToPrev: grid.goToPrev,
        goToNext: grid.goToNext,
        goToToday: grid.goToToday,
        view: grid.view,
        setView: grid.setView,
        zoom: grid.zoom,
        setZoom: grid.setZoom,
        doctors: grid.doctors,
        visibleDoctors: grid.visibleDoctors,
        selectedDoctorIds: grid.selectedDoctorIds,
        setSelectedDoctorIds: grid.setSelectedDoctorIds,
        filteredEvents: grid.filteredEvents,
        totalCount: grid.totalCount,
        eventCounts: grid.eventCounts,
        loading: grid.loading,
        startHour: grid.startHour,
        endHour: grid.endHour,
        handleEventDrop: grid.handleEventDrop,
        handleStatusChange: grid.handleStatusChange,
        selectedAppointmentId: grid.selectedAppointmentId,
        setSelectedAppointmentId: grid.setSelectedAppointmentId,

        // ── Modal (form) ──────────────────────────────────────────────────────
        today: modal.today,
        modalOpen: modal.modalOpen,
        editing: modal.editing,
        form: modal.form,
        setForm: modal.setForm,
        formTime: modal.formTime,
        setFormTime: modal.setFormTime,
        formDate: modal.formDate,
        setFormDate: modal.setFormDate,
        doctorNames: modal.doctors,
        phoneNumber: modal.phoneNumber,
        setPhoneNumber: modal.setPhoneNumber,
        phoneCountryCode: modal.phoneCountryCode,
        setPhoneCountryCode: modal.setPhoneCountryCode,
        patientSearch: modal.patientSearch,
        setPatientSearch: modal.setPatientSearch,
        patientSearchResults: modal.patientSearchResults,
        patientSearchLoading: modal.patientSearchLoading,
        selectedPatientId: modal.selectedPatientId,
        setSelectedPatientId: modal.setSelectedPatientId,
        duplicatePatient: modal.duplicatePatient,
        patientMatchInfo: modal.patientMatchInfo,
        isNewPatient: modal.isNewPatient,
        conflictWarning: modal.conflictWarning,
        matchedPatientAllergies: modal.matchedPatientAllergies,
        matchedPatientMedicalAlerts: modal.matchedPatientMedicalAlerts,
        submitError: modal.submitError,
        isSubmitting: modal.isSubmitting,
        openNew: modal.openNew,
        openEdit: modal.openEdit,
        handleSubmit: modal.handleSubmit,
        handleDelete: modal.handleDelete,
        handleUseDuplicate: modal.handleUseDuplicate,
        closeModal: modal.closeModal,
        todaySchedule: modal.todaySchedule,
        isDayOff: modal.isDayOff,
        treatmentDefinitions: modal.treatmentDefinitions,

        // ── Bridges ───────────────────────────────────────────────────────────
        onSlotClick,
        onEditFromDrawer,
    };
}
