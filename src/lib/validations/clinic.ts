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
    plan_id: z.string().default("starter"),
    credits: z.number().default(0),
    trial_ends_at: z.string().optional().nullable(),
    automations_enabled: z.boolean().default(false),
    n8n_workflow_id: z.string().optional().nullable(),
    n8n_workflows: z.array(z.any()).optional().default([]),
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
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    working_hours: workingHoursSchema.optional(),
});

