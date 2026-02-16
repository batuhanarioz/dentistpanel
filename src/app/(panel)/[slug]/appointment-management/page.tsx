import { getAppointmentsForDate, getClinicBySlug } from "@/lib/api";
import { localDateStr } from "@/lib/dateUtils";
import AppointmentCalendarView from "./AppointmentCalendarView";

export default async function AppointmentCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const clinic = await getClinicBySlug(slug);

    const today = localDateStr();
    // We don't fetch appointments on the server because of RLS issues with the anonymous client.
    // The client component will fetch them with the proper user session.
    const initialAppointments: any[] = [];

    return (
        <AppointmentCalendarView
            initialAppointments={initialAppointments}
            clinicId={clinic?.id || ""}
            slug={slug}
        />
    );
}