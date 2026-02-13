"use client";

import CalendarView from "../../components/CalendarView";

export default function AppointmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  // We can eventually use the slug to get the clinic ID if needed contextually, 
  // currently CalendarView manages its own data fetching based on authenticated user's clinic.
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-1 min-h-0">
        <CalendarView clinicId="" initialDisplayMode="list" initialView="week" />
      </div>
    </div>
  );
}
