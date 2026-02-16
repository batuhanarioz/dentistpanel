import { z } from "zod";

export const paymentSchema = z.object({
    amount: z.number().positive("Miktar pozitif bir sayı olmalıdır"),
    method: z.string().min(1, "Ödeme yöntemi zorunludur"),
    status: z.enum(["planned", "partial", "paid", "cancelled"]).default("planned"),
    note: z.string().optional().nullable(),
    due_date: z.string().min(1, "Vade tarihi zorunludur"),
    appointment_id: z.string().uuid("Geçersiz randevu ID"),
    patient_id: z.string().uuid("Geçersiz hasta ID"),
});

export const updatePaymentSchema = paymentSchema.partial();
