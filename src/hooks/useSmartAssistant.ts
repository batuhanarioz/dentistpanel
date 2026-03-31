import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { getDashboardData, getTodayPayments } from "@/lib/api";
import { localDateStr } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";

export type AssistantItemType = "REMINDER" | "SATISFACTION" | "PAYMENT" | "DELAY" | "BIRTHDAY" | "FOLLOWUP" | "INCOMPLETE" | "NEW_PATIENT" | "LAB_TRACKING";

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
    let result = template || "";
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

    // 1. Fetch Appointments for today
    const { data: appointments = [], isLoading: apptsLoading } = useQuery({
        queryKey: ["assistantAppointments", today, clinic.clinicId],
        queryFn: () => getDashboardData(today, clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
    });

    // 2. Fetch Payments for today
    const { data: payments = [], isLoading: paysLoading } = useQuery({
        queryKey: ["assistantPayments", today, clinic.clinicId],
        queryFn: () => getTodayPayments(clinic.clinicId || "", today),
        enabled: !!clinic.clinicId,
    });

    // 3. Fetch Task/Role Permissions for the current user
    const { data: allowedTypes = [] } = useQuery({
        queryKey: ["assistantPermissions", clinic.clinicId],
        queryFn: async () => {
            const userRole = localStorage.getItem("userRole");
            if (!userRole) return [];
            if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return ["ALL"];

            const { data } = await supabase
                .from("checklist_clinic_roles")
                .select("checklist_definitions(code)")
                .eq("clinic_id", clinic.clinicId)
                .eq("role", userRole);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data || []).map((d: any) => (d.checklist_definitions as any)?.code);
        },
        enabled: !!clinic.clinicId,
    });

    const assistantItems = useMemo(() => {
        if (!settings) return [];
        const now = new Date();
        const items: AssistantItem[] = [];

        const isAllowed = (type: AssistantItemType) => {
            if (allowedTypes.includes("ALL")) return true;
            return allowedTypes.includes(type);
        };

        // 1. APPOINTMENT REMINDER
        if (settings.notification_settings.is_reminder_enabled && isAllowed("REMINDER")) {
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
        if (settings.notification_settings.is_satisfaction_enabled && isAllowed("SATISFACTION")) {
            const timing = settings.assistant_timings.SATISFACTION;
            const thresholdMins = convertToHours(timing.value, timing.unit) * 60;

            appointments.forEach((appt) => {
                if (appt.status === 'cancelled' || appt.status === 'no_show') return;

                const endsAt = new Date(appt.endsAt);
                const diffMins = (now.getTime() - endsAt.getTime()) / (1000 * 60);

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
        if (settings.notification_settings.is_payment_enabled && isAllowed("PAYMENT")) {
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

        // 4. BIRTHDAY
        if (isAllowed("BIRTHDAY")) {
            appointments.forEach((appt) => {
                const pDate = (appt as { birthDate?: string }).birthDate;
                if (pDate) {
                    const birthDate = new Date(pDate);
                    if (birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate()) {
                        items.push({
                            id: `bdy-${appt.id}`,
                            type: "BIRTHDAY",
                            patientName: appt.patientName,
                            patientPhone: appt.patientPhone || "",
                            title: "Doğum Günü Kutlama",
                            timeLabel: "Bugün",
                            message: `İyi ki doğdunuz ${appt.patientName}! 🎂 ${clinic.clinicName || "Klinik"} ailesi olarak yeni yaşınızda sağlık dileriz.`,
                            status: "pending"
                        });
                    }
                }
            });
        }

        // 5. DELAY
        if (isAllowed("DELAY")) {
            appointments.forEach((appt) => {
                if (appt.status !== 'confirmed') return;
                const startsAt = new Date(appt.startsAt);
                const diffMins = (now.getTime() - startsAt.getTime()) / (1000 * 60);

                if (diffMins > 10 && diffMins < 60) {
                    items.push({
                        id: `del-${appt.id}`,
                        type: "DELAY",
                        patientName: appt.patientName,
                        patientPhone: appt.patientPhone || "",
                        title: "Hekim Gecikmesi",
                        timeLabel: `${Math.round(diffMins)} DK GECİKTİ`,
                        message: `Sayın ${appt.patientName}, yoğunluk nedeniyle randevunuza yaklaşık ${Math.round(diffMins)} dakika gecikmeyle başlayabileceğiz. Anlayışınız için teşekkür ederiz.`,
                        status: "pending"
                    });
                }
            });
        }

        // 6. NEW PATIENT
        if (isAllowed("NEW_PATIENT")) {
            appointments.forEach((appt) => {
                const isNew = (appt as { isFirstVisit?: boolean; isNewPatient?: boolean }).isFirstVisit || (appt as { isFirstVisit?: boolean; isNewPatient?: boolean }).isNewPatient;
                if (isNew) {
                    items.push({
                        id: `new-${appt.id}`,
                        type: "NEW_PATIENT",
                        patientName: appt.patientName,
                        patientPhone: appt.patientPhone || "",
                        title: "Yeni Hasta Kayıt",
                        timeLabel: "Randevusu Var",
                        message: `${appt.patientName} klinikte ilk kez işlem görecek. Hoş geldiniz mesajı ve dosya hazırlığı gerekebilir.`,
                        status: "pending"
                    });
                }
            });
        }

        // 7. FOLLOW UP (Generic placeholder logic)
        if (isAllowed("FOLLOWUP")) {
            appointments.forEach((appt) => {
                const needsFollowUp = appt.treatmentType?.toLowerCase().includes("cerrahi") || appt.treatmentType?.toLowerCase().includes("implant");
                if (needsFollowUp && appt.status === 'confirmed') {
                    const endsAt = new Date(appt.endsAt);
                    const diffDays = (now.getTime() - endsAt.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays >= 1 && diffDays < 2) {
                        items.push({
                            id: `fol-${appt.id}`,
                            type: "FOLLOWUP",
                            patientName: appt.patientName,
                            patientPhone: appt.patientPhone || "",
                            title: "Cerrahi Takip",
                            timeLabel: "1 Gün Geçti",
                            message: `Dün yapılan ${appt.treatmentType} işlemi sonrası ${appt.patientName} aranarak durumu sorulmalıdır.`,
                            status: "pending"
                        });
                    }
                }
            });
        }

        // 8. LAB TRACKING (Generic placeholder logic)
        if (isAllowed("LAB_TRACKING")) {
            appointments.forEach((appt) => {
                const isLab = appt.treatmentType?.toLowerCase().includes("ölçü") || appt.treatmentType?.toLowerCase().includes("prova");
                if (isLab && appt.status === 'confirmed') {
                    items.push({
                        id: `lab-${appt.id}`,
                        type: "LAB_TRACKING",
                        patientName: appt.patientName,
                        patientPhone: appt.patientPhone || "",
                        title: "Laboratuvar Takip",
                        timeLabel: "İşlem Bekliyor",
                        message: `${appt.patientName} için ${appt.treatmentType} işlemi lab gönderimi veya kontrolü gerektirebilir.`,
                        status: "pending"
                    });
                }
            });
        }

        return items;
    }, [appointments, payments, allowedTypes, clinic.clinicName, settings]);

    return {
        assistantItems,
        isLoading: apptsLoading || paysLoading
    };
}
