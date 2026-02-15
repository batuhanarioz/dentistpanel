"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useClinic } from "@/app/context/ClinicContext";
import { useDashboard } from "@/hooks/useDashboard";
import { StatCards } from "@/app/components/dashboard/StatCards";
import { AppointmentsSection } from "@/app/components/dashboard/AppointmentsSection";
import { ControlListSection } from "@/app/components/dashboard/ControlListSection";
import { AppointmentDetailDrawer } from "@/app/components/dashboard/AppointmentDetailDrawer";

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const clinic = useClinic();

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


  // Derivated stats
  const totalToday = appointments.length;
  const pendingCount = appointments.filter((a: any) => a.status === "pending").length;
  const confirmedCount = appointments.filter((a: any) => a.status === "confirmed").length;

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const handleReminderClick = (appointmentId: string) => {
    const appt = appointments.find((a: any) => a.id === appointmentId);
    if (!appt || !appt.patientPhone) {
      alert("Hasta telefonu kayıtlı değil!");
      return;
    }
    const phone = appt.patientPhone.replace(/\D/g, "");
    const text = `Merhaba Sayın ${appt.patientName}, randevunuzu hatırlatmak isteriz.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleControlItemClick = (item: any) => {
    setSelectedAppointmentId(item.appointmentId);
  };

  return (
    <div className="space-y-6">
      <StatCards
        isToday={viewOffsetAppointments === 0}
        totalToday={totalToday}
        confirmedCount={confirmedCount}
        pendingCount={pendingCount}
        controlCount={controlItems.length}
        loading={loading}
        isAdmin={clinic.isAdmin}
        onNewUserClick={() => router.push(`/${slug}/admin/users`)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        <div className="space-y-6">
          <AppointmentsSection
            isToday={viewOffsetAppointments === 0}
            appointments={appointments}
            loading={loading}
            doctors={doctors}
            onOffsetChange={() => setViewOffsetAppointments((prev: number) => (prev === 0 ? 1 : 0))}
            onStatusChange={handleStatusChange}
            onAssignDoctor={handleAssignDoctor}
            onReminderClick={handleReminderClick}
            onAppointmentClick={setSelectedAppointmentId}
          />
        </div>

        <ControlListSection
          isToday={viewOffsetControls === 0}
          controlItems={controlItems}
          onOffsetChange={() => setViewOffsetControls((prev: number) => (prev === 0 ? 1 : 0))}
          onItemClick={handleControlItemClick}
        />
      </div>

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
