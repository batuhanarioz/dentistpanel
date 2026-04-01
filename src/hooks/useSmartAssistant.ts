import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClinic } from "@/app/context/ClinicContext";
import { getDashboardData, getTodayPayments, getDashboardDataRange, getOverduePendingPayments } from "@/lib/api";
import { localDateStr } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";

async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
}

export type AssistantItemType = "REMINDER" | "SATISFACTION" | "PAYMENT" | "DELAY" | "BIRTHDAY" | "FOLLOWUP" | "INCOMPLETE" | "NEW_PATIENT" | "LAB_TRACKING";

export interface AssistantItem {
    id: string;
    type: AssistantItemType;
    patientName: string;
    patientId: string;
    patientPhone: string;
    title: string;
    message: string;
    timeLabel: string;
    status: string;
    /** Bugün değil önceki günden kalan, kaçırılmış bildirim */
    isPastDay?: boolean;
    pastDate?: string; // "2025-03-29" formatında
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

    // lookback: son 3 günün başlangıcı (klinik kapalıysa kaçırılan bildirimler için)
    const lookbackStart = useMemo(() => {
        const d = new Date(today + "T00:00:00");
        d.setDate(d.getDate() - 3);
        return localDateStr(d);
    }, [today]);

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

    // 3b. Geçmiş 3 günün randevuları (kaçırılmış FOLLOWUP / BIRTHDAY / SATISFACTION için)
    const { data: pastAppointments = [] } = useQuery({
        queryKey: ["assistantPastAppointments", lookbackStart, today, clinic.clinicId],
        queryFn: () => getDashboardDataRange(lookbackStart, localDateStr(new Date(new Date(today + "T00:00:00").getTime() - 86400000)), clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
        staleTime: 5 * 60 * 1000,
    });

    // 4b. Vadesi geçmiş bekleyen ödemeler
    const { data: overduePayments = [] } = useQuery({
        queryKey: ["assistantOverduePayments", today, clinic.clinicId],
        queryFn: () => getOverduePendingPayments(clinic.clinicId || "", today),
        enabled: !!clinic.clinicId,
        staleTime: 2 * 60 * 1000,
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

    // 4. Fetch Dismissed IDs from DB
    const { data: dbDismissedIds = [] } = useQuery<string[]>({
        queryKey: ["assistantDismissedIds", clinic.clinicId],
        queryFn: async () => {
            const token = await getToken();
            const res = await fetch("/api/assistant/dismiss", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const json = await res.json();
            return json.dismissedIds || [];
        },
        enabled: !!clinic.clinicId,
    });

    const assistantItems = useMemo(() => {
        if (!settings) return [];
        const now = new Date();
        const items: AssistantItem[] = [];

        // Geçmiş gün tarihi için yardımcı
        const apptDateStr = (appt: { startsAt: string }) =>
            new Date(appt.startsAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

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
                        patientId: appt.patientId,
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
                        patientId: appt.patientId,
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
                    patientId: pay.patientId,
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
                        const bdyMessage = settings.message_templates.BIRTHDAY
                            ? replacePlaceholders(settings.message_templates.BIRTHDAY, {
                                patient_name: appt.patientName,
                                clinic_name: clinic.clinicName || "Klinik",
                              })
                            : `İyi ki doğdunuz ${appt.patientName}! 🎂 ${clinic.clinicName || "Klinik"} ailesi olarak yeni yaşınızda sağlık dileriz.`;
                        items.push({
                            id: `bdy-${appt.id}`,
                            type: "BIRTHDAY",
                            patientName: appt.patientName,
                            patientId: appt.patientId,
                            patientPhone: appt.patientPhone || "",
                            title: "Doğum Günü Kutlama",
                            timeLabel: "Bugün",
                            message: bdyMessage,
                            status: "pending"
                        });
                    }
                }
            });
        }

        // 5. DELAY
        if (isAllowed("DELAY")) {
            const delayTiming = settings.assistant_timings.DELAY;
            const delayThresholdMins = delayTiming ? convertToHours(delayTiming.value, delayTiming.unit) * 60 : 10;

            appointments.forEach((appt) => {
                if (appt.status !== 'confirmed') return;
                const startsAt = new Date(appt.startsAt);
                const diffMins = (now.getTime() - startsAt.getTime()) / (1000 * 60);

                if (diffMins > delayThresholdMins && diffMins < 60) {
                    const delayMessage = settings.message_templates.DELAY
                        ? replacePlaceholders(settings.message_templates.DELAY, {
                            patient_name: appt.patientName,
                            clinic_name: clinic.clinicName || "Klinik",
                            treatment_type: appt.treatmentType || "randevu"
                          })
                        : `Sayın ${appt.patientName}, yoğunluk nedeniyle randevunuza yaklaşık ${Math.round(diffMins)} dakika gecikmeyle başlayabileceğiz.`;
                    items.push({
                        id: `del-${appt.id}`,
                        type: "DELAY",
                        patientName: appt.patientName,
                        patientId: appt.patientId,
                        patientPhone: appt.patientPhone || "",
                        title: "Hekim Gecikmesi",
                        timeLabel: `${Math.round(diffMins)} DK GECİKTİ`,
                        message: delayMessage,
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
                        patientId: appt.patientId,
                        patientPhone: appt.patientPhone || "",
                        title: "Yeni Hasta Kayıt",
                        timeLabel: "Randevusu Var",
                        message: `${appt.patientName} klinikte ilk kez işlem görecek. Hoş geldiniz mesajı ve dosya hazırlığı gerekebilir.`,
                        status: "pending"
                    });
                }
            });
        }

        // 7. FOLLOW UP
        if (isAllowed("FOLLOWUP")) {
            const followupTiming = settings.assistant_timings.FOLLOWUP;
            const followupThresholdDays = followupTiming ? convertToHours(followupTiming.value, followupTiming.unit) / 24 : 1;

            appointments.forEach((appt) => {
                const needsFollowUp = appt.treatmentType?.toLowerCase().includes("cerrahi") || appt.treatmentType?.toLowerCase().includes("implant");
                if (needsFollowUp && appt.status === 'confirmed') {
                    const endsAt = new Date(appt.endsAt);
                    const diffDays = (now.getTime() - endsAt.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays >= followupThresholdDays && diffDays < followupThresholdDays + 1) {
                        const message = settings.message_templates.FOLLOWUP
                            ? replacePlaceholders(settings.message_templates.FOLLOWUP, {
                                patient_name: appt.patientName,
                                clinic_name: clinic.clinicName || "Klinik",
                                treatment_type: appt.treatmentType || "randevu"
                              })
                            : `Dün yapılan ${appt.treatmentType} işlemi sonrası ${appt.patientName} aranarak durumu sorulmalıdır.`;
                        items.push({
                            id: `fol-${appt.id}`,
                            type: "FOLLOWUP",
                            patientName: appt.patientName,
                            patientId: appt.patientId,
                            patientPhone: appt.patientPhone || "",
                            title: "Cerrahi Takip",
                            timeLabel: `${Math.round(diffDays)} Gün Geçti`,
                            message,
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
                        patientId: appt.patientId,
                        patientPhone: appt.patientPhone || "",
                        title: "Laboratuvar Takip",
                        timeLabel: "İşlem Bekliyor",
                        message: `${appt.patientName} için ${appt.treatmentType} işlemi lab gönderimi veya kontrolü gerektirebilir.`,
                        status: "pending"
                    });
                }
            });
        }

        // ── Geçmiş günlerden kalan kaçırılmış bildirimler ──────────────────────

        // SATISFACTION — geçmiş günlerde tamamlanmış ama takip yapılmamış randevular
        if (settings.notification_settings.is_satisfaction_enabled && isAllowed("SATISFACTION")) {
            pastAppointments.forEach((appt) => {
                if (appt.status === "cancelled" || appt.status === "no_show") return;
                const pastDate = apptDateStr(appt);
                const message = replacePlaceholders(settings.message_templates.SATISFACTION, {
                    patient_name: appt.patientName,
                    clinic_name: clinic.clinicName || "Klinik",
                    treatment_type: appt.treatmentType || "randevu"
                });
                items.push({
                    id: `sat-past-${appt.id}`,
                    type: "SATISFACTION",
                    patientName: appt.patientName,
                    patientId: appt.patientId,
                    patientPhone: appt.patientPhone || "",
                    title: "Memnuniyet (Kaçırıldı)",
                    timeLabel: new Date(appt.endsAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
                    message,
                    status: "pending",
                    isPastDay: true,
                    pastDate,
                });
            });
        }

        // FOLLOWUP — geçmiş günlerde yapılmış cerrahi/implant, takip edilmemiş
        if (isAllowed("FOLLOWUP")) {
            const followupTiming = settings.assistant_timings.FOLLOWUP;
            const followupThresholdDays = followupTiming ? convertToHours(followupTiming.value, followupTiming.unit) / 24 : 1;

            pastAppointments.forEach((appt) => {
                const needsFollowUp = appt.treatmentType?.toLowerCase().includes("cerrahi") || appt.treatmentType?.toLowerCase().includes("implant");
                if (!needsFollowUp) return;
                if (appt.status === "cancelled" || appt.status === "no_show") return;
                const pastDate = apptDateStr(appt);
                const endsAt = new Date(appt.endsAt);
                const diffDays = (now.getTime() - endsAt.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays >= followupThresholdDays) {
                    const message = settings.message_templates.FOLLOWUP
                        ? replacePlaceholders(settings.message_templates.FOLLOWUP, {
                            patient_name: appt.patientName,
                            clinic_name: clinic.clinicName || "Klinik",
                            treatment_type: appt.treatmentType || "randevu"
                          })
                        : `${appt.treatmentType} işlemi sonrası ${appt.patientName} aranarak durumu sorulmalıdır.`;
                    items.push({
                        id: `fol-past-${appt.id}`,
                        type: "FOLLOWUP",
                        patientName: appt.patientName,
                        patientId: appt.patientId,
                        patientPhone: appt.patientPhone || "",
                        title: "Cerrahi Takip (Kaçırıldı)",
                        timeLabel: `${Math.round(diffDays)} gün önce`,
                        message,
                        status: "pending",
                        isPastDay: true,
                        pastDate,
                    });
                }
            });
        }

        // BIRTHDAY — son 3 günde doğum günü geçmiş olan ve görülmemiş hastalar
        if (isAllowed("BIRTHDAY")) {
            pastAppointments.forEach((appt) => {
                const pDate = (appt as { birthDate?: string }).birthDate;
                if (!pDate) return;
                const birthDate = new Date(pDate);
                const apptDay = new Date(appt.startsAt);
                if (birthDate.getMonth() === apptDay.getMonth() && birthDate.getDate() === apptDay.getDate()) {
                    const pastDate = apptDateStr(appt);
                    const bdyMessage = settings.message_templates.BIRTHDAY
                        ? replacePlaceholders(settings.message_templates.BIRTHDAY, {
                            patient_name: appt.patientName,
                            clinic_name: clinic.clinicName || "Klinik",
                          })
                        : `İyi ki doğdunuz ${appt.patientName}! 🎂 ${clinic.clinicName || "Klinik"} ailesi olarak geç de olsa kutluyoruz.`;
                    items.push({
                        id: `bdy-past-${appt.id}`,
                        type: "BIRTHDAY",
                        patientName: appt.patientName,
                        patientId: appt.patientId,
                        patientPhone: appt.patientPhone || "",
                        title: "Doğum Günü (Kaçırıldı)",
                        timeLabel: new Date(appt.startsAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
                        message: bdyMessage,
                        status: "pending",
                        isPastDay: true,
                        pastDate,
                    });
                }
            });
        }

        // PAYMENT — vadesi geçmiş bekleyen ödemeler
        if (settings.notification_settings.is_payment_enabled && isAllowed("PAYMENT")) {
            overduePayments.forEach((pay) => {
                const message = replacePlaceholders(settings.message_templates.PAYMENT, {
                    patient_name: pay.patientName,
                    amount: pay.amount.toString(),
                    clinic_name: clinic.clinicName || "Klinik"
                });
                items.push({
                    id: `pay-overdue-${pay.id}`,
                    type: "PAYMENT",
                    patientName: pay.patientName,
                    patientId: pay.patientId,
                    patientPhone: pay.patientPhone || "",
                    title: "Gecikmiş Ödeme",
                    timeLabel: `Vadesi: ${new Date((pay.dueDate || "") + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`,
                    message,
                    status: "pending",
                    isPastDay: true,
                    pastDate: pay.dueDate || undefined,
                });
            });
        }

        const filteredItems = items.filter(i => !dbDismissedIds.includes(i.id));

        return filteredItems;
    }, [appointments, payments, pastAppointments, overduePayments, allowedTypes, clinic.clinicName, settings, today, dbDismissedIds]);

    const missedCount = assistantItems.filter(i => i.isPastDay).length;

    return {
        assistantItems,
        missedCount,
        isLoading: apptsLoading || paysLoading
    };
}

export function useDismissAssistantItem() {
    const qc = useQueryClient();
    const { clinicId } = useClinic();

    return useMutation({
        mutationFn: async (itemId: string) => {
            const token = await getToken();
            const res = await fetch("/api/assistant/dismiss", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ itemId })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["assistantDismissedIds", clinicId] });
        }
    });
}
