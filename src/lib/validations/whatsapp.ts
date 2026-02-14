import { z } from "zod";

export const sendWhatsAppSchema = z.object({
    clinicId: z.string().min(1, "Klinik ID zorunludur"),
    toPhone: z.string().min(1, "Alıcı telefon zorunludur"),
    template: z.string().min(1, "Şablon adı zorunludur"),
    variables: z.record(z.string(), z.string()).optional(),
});
