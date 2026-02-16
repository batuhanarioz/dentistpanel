import { z } from "zod";

export const patientSchema = z.object({
    full_name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
    phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
    email: z.string().email("Geçersiz e-posta adresi").optional().nullable().or(z.literal("")),
    birth_date: z.string().optional().nullable().or(z.literal("")),
    tc_identity_no: z.string()
        .length(11, "TC Kimlik No 11 haneli olmalıdır")
        .regex(/^\d+$/, "TC Kimlik No sadece rakamlardan oluşmalıdır")
        .optional()
        .nullable()
        .or(z.literal("")),
    allergies: z.string().optional().nullable(),
    medical_alerts: z.string().optional().nullable(),
});

export const updatePatientSchema = patientSchema.partial();
