import { useMemo } from "react";
import { localDateStr, formatTime } from "@/lib/dateUtils";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import { getChecklistItems, getChecklistConfigs } from "@/lib/api";

export type ControlItemType = "status" | "approval" | "doctor" | "payment";
export type ControlItemTone = "critical" | "high" | "medium" | "low";

export type ControlItem = {
    id: string;
    type: ControlItemType;
    tone: ControlItemTone;
    toneLabel: string;
    appointmentId: string;
    patientName: string;
    timeLabel: string;
    treatmentLabel: string;
    actionLabel: string;
    sortTime: number;
    code: string;
    status: string;
    title: string;
    startsAt: string;
    treatmentType: string;
    estimatedAmount: number;
    patientId: string;
    priority?: number;
};

type ChecklistItemRaw = {
    id: string;
    code: string;
    tone: ControlItemTone;
    appointmentId: string;
    patientName: string;
    startsAt: string;
    endsAt: string;
    treatmentType: string | null;
    estimatedAmount: string | null;
    patientId: string;
    title: string;
    status: string;
};

export function useChecklist(dateOffset: number = 0) {
    const clinic = useClinic();
    const baseToday = useMemo(() => localDateStr(), []);

    const viewDate = useMemo(() => {
        const d = new Date(baseToday + "T00:00:00");
        d.setDate(d.getDate() + dateOffset);
        return localDateStr(d);
    }, [baseToday, dateOffset]);

    const { data: rawChecklistItems = [], isLoading: checklistLoading } = useQuery({
        queryKey: ["checklistItems", viewDate, clinic.clinicId],
        queryFn: () => getChecklistItems(clinic.clinicId || "", viewDate),
        enabled: !!clinic.clinicId,
        staleTime: 60 * 1000, // 1 dakika
    });

    const { data: checklistConfigs = {} } = useQuery({
        queryKey: ["checklistConfigs", clinic.clinicId],
        queryFn: () => getChecklistConfigs(clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
        staleTime: 30 * 60 * 1000, // 30 dakika — config nadiren değişir
    });

    const controlItems = useMemo(() => {
        const userRole = clinic.userRole || UserRole.SEKRETER;

        const canShowTask = (code: string) => {
            if (clinic.isAdmin) return true;
            const config = checklistConfigs[code];
            if (!config) return false;
            return config.roles.includes(userRole);
        };

        const getPriority = (code: string): number => {
            switch (code) {
                case 'STATUS_UPDATE': return 100;
                case 'MISSING_PAYMENT': return 80;
                case 'DUE_PAYMENT_FOLLOWUP': return 80;
                case 'MISSING_NOTE': return 60;
                case 'MISSING_DOCTOR': return 40;
                case 'APPROVAL_PENDING': return 20;
                default: return 0;
            }
        };

        const controls: ControlItem[] = (rawChecklistItems as ChecklistItemRaw[])
            .filter((item) => canShowTask(item.code))
            .map((item) => ({
                id: item.id,
                type: item.code.toLowerCase().includes('payment') ? 'payment' :
                    item.code.toLowerCase().includes('doctor') ? 'doctor' : 'status',
                tone: item.tone,
                toneLabel: item.tone === 'critical' ? 'Acil' :
                    item.tone === 'high' ? 'Önemli' :
                        item.tone === 'medium' ? 'NOT' : 'Düşük',
                appointmentId: item.appointmentId,
                patientName: item.patientName,
                timeLabel: `${formatTime(item.startsAt)} - ${formatTime(item.endsAt)}`,
                treatmentLabel: item.treatmentType || "Genel muayene",
                actionLabel: item.title,
                sortTime: new Date(item.endsAt).getTime(),
                code: item.code,
                priority: getPriority(item.code),
                status: item.status,
                title: item.title,
                startsAt: item.startsAt,
                treatmentType: item.treatmentType || "",
                estimatedAmount: item.estimatedAmount ? parseFloat(item.estimatedAmount) : 0,
                patientId: item.patientId
            }));

        controls.sort((a, b) => {
            const pA = a.priority ?? 0;
            const pB = b.priority ?? 0;
            if (pB !== pA) return pB - pA;
            return b.sortTime - a.sortTime;
        });
        return controls;
    }, [rawChecklistItems, checklistConfigs, clinic.isAdmin, clinic.userRole]);

    return {
        controlItems,
        checklistLoading,
        viewDate
    };
}
