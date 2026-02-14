import { z } from "zod";

export const webAppointmentSchema = z.object({
    clinicSlug: z.string().min(1, "Klinik bilgisi zorunludur"),
    fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
    phone: z.string().min(1, "Telefon zorunludur"),
    preferredTime: z.string().optional().nullable(),
    notes: z.string().optional(),
});
