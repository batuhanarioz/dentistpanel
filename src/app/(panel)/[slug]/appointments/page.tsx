"use client";

import { useAppointments } from "@/hooks/useAppointments";
import { AppointmentsHeader } from "./components/AppointmentsHeader";
import { SchedulerGrid } from "./components/SchedulerGrid";
import { AppointmentListView } from "./components/AppointmentListView";
import { AppointmentDrawer } from "./components/AppointmentDrawer";
import { WeekView } from "./components/WeekView";

export default function AppointmentsPage() {
    const {
        // State
        selectedDate,
        setSelectedDate,
        selectedDoctorIds,
        setSelectedDoctorIds,
        zoom,
        setZoom,
        view,
        setView,
        selectedAppointmentId,
        setSelectedAppointmentId,
        // Data
        doctors,
        visibleDoctors,
        filteredEvents,
        totalCount,
        eventCounts,
        loading,
        dateStr,
        weekDays,
        weekRangeStr,
        startHour,
        endHour,
        // Handlers
        goToPrev,
        goToNext,
        goToToday,
        handleEventDrop,
        handleStatusChange,
    } = useAppointments();

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
            />

            {/* Main content area — grid, week or list */}
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
            />
        </div>
    );
}
