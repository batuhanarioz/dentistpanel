/**
 * WhatsApp Mesaj Şablonları ve wa.me Link Oluşturucu
 */

import { formatPhoneForWhatsApp } from "./dateUtils";

export type MessageTemplateType = 
    | "REMINDER" 
    | "SATISFACTION" 
    | "PAYMENT" 
    | "DELAY" 
    | "BIRTHDAY" 
    | "FOLLOWUP" 
    | "CHECKIN";

interface TemplateData {
    patient_name?: string;
    appointment_time?: string;
    delay_minutes?: string;
    clinic_name?: string;
    treatment_type?: string;
    amount?: string;
    [key: string]: string | undefined;
}

const DEFAULT_TEMPLATES: Record<MessageTemplateType, string> = {
    REMINDER: "Merhaba {patient_name}, {clinic_name} kliniğindeki {treatment_type} randevunuzu saat {appointment_time} için hatırlatmak isteriz. Görüşmek üzere!",
    SATISFACTION: "Merhaba {patient_name}, bugün {clinic_name} kliniğimizdeki randevunuz tamamlandı. Hizmetimizden memnun kaldınız mı? Değerli yorumlarınızı bekleriz.",
    PAYMENT: "Merhaba {patient_name}, {clinic_name} kliniğimizdeki {amount} TL tutarındaki ödemenizin vadesi bugün gelmiştir. İyi günler dileriz.",
    DELAY: "Sayın {patient_name}, kliniğimizdeki yoğunluk nedeniyle randevunuza yaklaşık {delay_minutes} dakika gecikme ile başlayabileceğiz. Özür diler, anlayışınız için teşekkür ederiz.",
    BIRTHDAY: "İyi ki doğdunuz {patient_name}! 🎂 {clinic_name} ailesi olarak yeni yaşınızın size sağlık ve mutluluk getirmesini dileriz. ✨",
    FOLLOWUP: "Geçmiş olsun {patient_name}. Bugün yaptığımız işlem sonrası ağrı veya beklenmedik bir durum olursa bize ulaşabilirsiniz. Lütfen size iletilen bakım talimatlarına uyunuz.",
    CHECKIN: "Merhaba {patient_name}, kliniğimize hoş geldiniz! İşlemlerinizi hızlandırmak için şu linke tıklayarak kayıt formunuzu telefonunuzdan doldurabilirsiniz: {onboarding_url}"
};

/**
 * Şablondaki {placeholder} alanlarını verilerle doldurur
 */
export function fillTemplate(template: string, data: TemplateData): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            result = result.replace(new RegExp(`{${key}}`, "g"), value);
        }
    });
    return result;
}

/**
 * WhatsApp wa.me linki oluşturur
 */
export function generateWhatsAppLink(phone: string, message: string): string {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Mesaj tipine göre varsayılan şablonu ve linki döndürür
 */
export function getSmartMessageLink(
    type: MessageTemplateType, 
    phone: string, 
    data: TemplateData,
    customTemplate?: string
): string {
    const template = customTemplate || DEFAULT_TEMPLATES[type];
    const message = fillTemplate(template, data);
    return generateWhatsAppLink(phone, message);
}
