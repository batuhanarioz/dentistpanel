import { Suspense } from "react";
import CalendarView from "../../components/CalendarView";

export default function AppointmentsPage() {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Yükleniyor...</div>}>
          <CalendarView clinicId="" initialDisplayMode="list" initialView="week" />
        </Suspense>
      </div>
    </div>
  );
}
