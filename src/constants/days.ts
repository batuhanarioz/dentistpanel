import { WorkingHours, DayOfWeek } from "@/types/database";

export const DAY_LABELS: Record<DayOfWeek, string> = {
    monday: "Pazartesi",
    tuesday: "Salı",
    wednesday: "Çarşamba",
    thursday: "Perşembe",
    friday: "Cuma",
    saturday: "Cumartesi",
    sunday: "Pazar",
};

export const ORDERED_DAYS: DayOfWeek[] = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

export const DEFAULT_WORKING_HOURS: WorkingHours = {
    monday: { open: "09:00", close: "19:00", enabled: true },
    tuesday: { open: "09:00", close: "19:00", enabled: true },
    wednesday: { open: "09:00", close: "19:00", enabled: true },
    thursday: { open: "09:00", close: "19:00", enabled: true },
    friday: { open: "09:00", close: "19:00", enabled: true },
    saturday: { open: "09:00", close: "14:00", enabled: false },
    sunday: { open: "09:00", close: "14:00", enabled: false },
};
