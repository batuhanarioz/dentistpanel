import { z } from "zod";

export const webAppointmentSchema = z.object({
    clinicSlug: z.string().min(1, "Klinik bilgisi zorunludur"),
    fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
    phone: z.string().min(1, "Telefon zorunludur"),
    preferredTime: z.string().optional().nullable(),
    notes: z.string().optional(),
});

export const internalAppointmentSchema = z.object({
    patient_id: z.string().uuid("Geçersiz hasta seçimi"),
    doctor_id: z.string().uuid("Geçersiz doktor seçimi").nullable(),
    starts_at: z.string().min(1, "Başlangıç saati zorunludur"),
    ends_at: z.string().min(1, "Bitiş saati zorunludur"),
    channel: z.enum(["web", "whatsapp", "phone", "walk-in", "instagram", "other"]),
    status: z.enum(["confirmed", "cancelled", "no_show", "completed"]),
    treatment_type: z.string().min(1, "Tedavi türü zorunludur"),
    patient_note: z.string().optional().nullable(),
    treatment_note: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    estimated_amount: z.number().nonnegative().nullable().optional(),
});
