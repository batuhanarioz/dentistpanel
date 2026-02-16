import { getClinicBySlug } from "@/lib/api";
import AppointmentCalendarView from "./AppointmentCalendarView";
import { CalendarAppointment } from "@/hooks/useAppointmentManagement";

export default async function AppointmentCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const clinic = await getClinicBySlug(slug);

    // We don't fetch appointments on the server because of RLS issues with the anonymous client.
    // The client component will fetch them with the proper user session.
    const initialAppointments: CalendarAppointment[] = [];

    return (
        <AppointmentCalendarView
            initialAppointments={initialAppointments}
            clinicId={clinic?.id || ""}
            slug={slug}
        />
    );
}