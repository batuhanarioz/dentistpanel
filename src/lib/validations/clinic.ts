import { z } from "zod";

const dayScheduleSchema = z.object({
    open: z.string(),
    close: z.string(),
    enabled: z.boolean(),
});

const workingHoursSchema = z.record(
    z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    dayScheduleSchema
);

export const createClinicSchema = z.object({
    name: z.string().min(2, "Klinik adı en az 2 karakter olmalıdır"),
    slug: z.string().min(2, "Slug en az 2 karakter olmalıdır"),
    phone: z.string().optional().nullable(),
    email: z.string().email("Geçersiz e-posta adresi"),
    address: z.string().optional().nullable(),
    working_hours: workingHoursSchema.optional(),
    subscription_status: z.string().default("trialing"),
    billing_cycle: z.string().default("monthly"),
    current_period_end: z.string().optional().nullable(),
    last_payment_date: z.string().optional().nullable(),
    adminPassword: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export const toggleClinicAutomationSchema = z.object({
    clinicId: z.string().min(1, "Klinik ID zorunludur"),
    enabled: z.boolean(),
    workflowId: z.string().optional().nullable(),
});

export const updateClinicSchema = z.object({
    id: z.string().min(1, "Klinik ID zorunludur"),
    name: z.string().min(2, "Klinik adı en az 2 karakter olmalıdır").optional(),
    slug: z.string().optional(),
    phone: z.string().optional().nullable(),
    email: z.string().optional(),
    address: z.string().optional().nullable(),
    working_hours: workingHoursSchema.optional(),
    subscription_status: z.string().optional(),
    billing_cycle: z.string().optional(),
    current_period_end: z.string().optional().nullable(),
    last_payment_date: z.string().optional().nullable(),
});
