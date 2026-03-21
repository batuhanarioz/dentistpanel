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
    insurance_company: z.string().optional().nullable(),
    insurance_amount: z.number().min(0, "Sigorta tutarı negatif olamaz").optional().nullable(),
    insurance_status: z.enum(["not_applicable", "pending", "received"]).optional().nullable(),
    policy_number: z.string().optional().nullable(),
    discount_amount: z.number().min(0, "İskonto tutarı negatif olamaz").optional().nullable(),
    receipt_number: z.string().optional().nullable(),
    treatment_plan_item_id: z.string().uuid().optional().nullable(),
});

export const updatePaymentSchema = paymentSchema.partial();
