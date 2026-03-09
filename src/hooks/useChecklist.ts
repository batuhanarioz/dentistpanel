import { useMemo } from "react";
import { localDateStr } from "@/lib/dateUtils";
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

function formatTime(dateString: string) {
    const d = new Date(dateString);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
}

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
    });

    const { data: checklistConfigs = {} } = useQuery({
        queryKey: ["checklistConfigs", clinic.clinicId],
        queryFn: () => getChecklistConfigs(clinic.clinicId || ""),
        enabled: !!clinic.clinicId,
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

        const controls: ControlItem[] = rawChecklistItems
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => canShowTask(item.code))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => ({
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
