import { z } from "zod";

export const paymentSchema = z.object({
    amount: z.number().positive("Miktar pozitif bir sayı olmalıdır"),
    method: z.string().min(1, "Ödeme yöntemi zorunludur"),
    status: z.enum(["pending", "paid", "cancelled", "partial"]).default("pending"),
    note: z.string().optional().nullable(),
    due_date: z.string().min(1, "Vade tarihi zorunludur"),
    appointment_id: z.string().uuid("Geçersiz randevu ID"),
    patient_id: z.string().uuid("Geçersiz hasta ID"),
    agreed_total: z.number().optional().nullable(),
});

export const updatePaymentSchema = paymentSchema.partial();
