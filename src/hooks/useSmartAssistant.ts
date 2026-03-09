import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { getDashboardData, getTodayPayments } from "@/lib/api";
import { localDateStr } from "@/lib/dateUtils";

export type AssistantItemType = "REMINDER" | "SATISFACTION" | "PAYMENT";

export interface AssistantItem {
    id: string;
    type: AssistantItemType;
    patientName: string;
    patientPhone: string;
    title: string;
    message: string;
    timeLabel: string;
    status: string;
}

function replacePlaceholders(template: string, data: Record<string, string>) {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value || "");
    });
    return result;
}

function convertToHours(value: number, unit: 'minutes' | 'hours' | 'days'): number {
    switch (unit) {
        case 'minutes': return value / 60;
        case 'hours': return value;
        case 'days': return value * 24;
        default: return value;
    }
}

export function useSmartAssistant() {
    const clinic = useClinic();
    const today = useMemo(() => localDateStr(), []);
    const settings = clinic.clinicSettings;

    // Fetch Appointments for today
    const { data: appointments = [], isLoading: apptsLoading } = useQuery({
        queryKey: ["assistantAppointments", today, clinic.clinicId],
        queryFn: () => getDashboardData(today, clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
    });

    // Fetch Payments for today
    const { data: payments = [], isLoading: paysLoading } = useQuery({
        queryKey: ["assistantPayments", today, clinic.clinicId],
        queryFn: () => getTodayPayments(clinic.clinicId || "", today),
        enabled: !!clinic.clinicId,
    });

    const assistantItems = useMemo(() => {
        if (!settings) return [];
        const now = new Date();
        const items: AssistantItem[] = [];

        // 1. APPOINTMENT REMINDER
        if (settings.notification_settings.is_reminder_enabled) {
            const timing = settings.assistant_timings.REMINDER;
            const thresholdHours = convertToHours(timing.value, timing.unit);

            appointments.forEach((appt) => {
                if (appt.status !== 'confirmed') return;
                const startsAt = new Date(appt.startsAt);
                const diffHours = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (diffHours > 0 && diffHours <= thresholdHours) {
                    const timeStr = startsAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    const message = replacePlaceholders(settings.message_templates.REMINDER, {
                        patient_name: appt.patientName,
                        appointment_time: timeStr,
                        clinic_name: clinic.clinicName || "Klinik",
                        treatment_type: appt.treatmentType || "randevu"
                    });

                    items.push({
                        id: `rem-${appt.id}`,
                        type: "REMINDER",
                        patientName: appt.patientName,
                        patientPhone: appt.patientPhone || "",
                        title: "Randevu Hatırlatma",
                        timeLabel: timeStr,
                        message,
                        status: "pending"
                    });
                }
            });
        }

        // 2. APPOINTMENT SATISFACTION
        if (settings.notification_settings.is_satisfaction_enabled) {
            const timing = settings.assistant_timings.SATISFACTION;
            const thresholdMins = convertToHours(timing.value, timing.unit) * 60;

            appointments.forEach((appt) => {
                if (appt.status === 'cancelled' || appt.status === 'no_show') return;

                const endsAt = new Date(appt.endsAt);
                const diffMins = (now.getTime() - endsAt.getTime()) / (1000 * 60);

                // Timing den sonraki 24 saat içinde göster
                if (diffMins >= thresholdMins && diffMins < 1440) {
                    const message = replacePlaceholders(settings.message_templates.SATISFACTION, {
                        patient_name: appt.patientName,
                        clinic_name: clinic.clinicName || "Klinik",
                        treatment_type: appt.treatmentType || "randevu"
                    });

                    items.push({
                        id: `sat-${appt.id}`,
                        type: "SATISFACTION",
                        patientName: appt.patientName,
                        patientPhone: appt.patientPhone || "",
                        title: "Randevu Memnuniyet",
                        timeLabel: "Tamamlandı",
                        message,
                        status: "pending"
                    });
                }
            });
        }

        // 3. PAYMENT REMINDER
        if (settings.notification_settings.is_payment_enabled) {
            payments.forEach((pay) => {
                const message = replacePlaceholders(settings.message_templates.PAYMENT, {
                    patient_name: pay.patientName,
                    amount: pay.amount.toString(),
                    clinic_name: clinic.clinicName || "Klinik"
                });

                items.push({
                    id: `pay-${pay.id}`,
                    type: "PAYMENT",
                    patientName: pay.patientName,
                    patientPhone: pay.patientPhone || "",
                    title: "Ödeme Hatırlatma",
                    timeLabel: "Vadesi Bugün",
                    message,
                    status: "pending"
                });
            });
        }

        return items;
    }, [appointments, payments, clinic.clinicName, settings]);

    return {
        assistantItems,
        isLoading: apptsLoading || paysLoading
    };
}

