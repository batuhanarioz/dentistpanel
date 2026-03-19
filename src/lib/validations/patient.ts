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
    gender: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    blood_group: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    // KVKK onay zamanı — form'dan boolean alır, hook'ta timestamp'e dönüştürülür
    kvkk_consent: z.boolean().optional(),
    // Direkt timestamp ile de kabul et (güncelleme/import senaryoları)
    kvkk_consent_at: z.string().optional().nullable(),
});

export const updatePatientSchema = patientSchema.partial();

/**
 * patientSchema çıktısından DB'ye gidecek payload'ı hazırlar.
 * kvkk_consent: true ise kvkk_consent_at = şimdiki zaman, false ise null.
 */
export function toPatientDbPayload(data: z.infer<typeof patientSchema>) {
    const { kvkk_consent, kvkk_consent_at, ...rest } = data;
    return {
        ...rest,
        kvkk_consent_at: kvkk_consent_at ?? (kvkk_consent ? new Date().toISOString() : null),
    };
}
