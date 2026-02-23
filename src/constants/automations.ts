export interface AutomationDefinition {
    id: string;
    name: string;
    description: string;
    category: "WhatsApp" | "SMS" | "Gmail" | "AI";
}

export const SYSTEM_AUTOMATIONS: AutomationDefinition[] = [
    {
        id: "wa_reminder_pre",
        name: "Hasta Görüşmesi Öncesi Hatırlatma Mesajı - WhatsApp",
        description: "Randevudan belirli bir süre önce WhatsApp üzerinden otomatik hatırlatma mesajı gönderir.",
        category: "WhatsApp"
    },
    {
        id: "wa_feedback_post",
        name: "Hasta Görüşmesi Sonrası Memnuniyet Mesajı - WhatsApp",
        description: "Randevu tamamlandıktan sonra WhatsApp üzerinden memnuniyet anketi/mesajı gönderir.",
        category: "WhatsApp"
    },
    {
        id: "wa_payment_reminder",
        name: "Ödeme Günü Geldi Hatırlatma Mesajı - WhatsApp",
        description: "Planlanan ödeme gününde WhatsApp üzerinden hatırlatma gönderir.",
        category: "WhatsApp"
    },
    {
        id: "sms_reminder_pre",
        name: "Hasta Görüşmesi Öncesi Hatırlatma Mesajı - SMS",
        description: "Randevudan belirli bir süre önce SMS üzerinden otomatik hatırlatma mesajı gönderir.",
        category: "SMS"
    },
    {
        id: "sms_feedback_post",
        name: "Hasta Görüşmesi Sonrası Memnuniyet Mesajı - SMS",
        description: "Randevu tamamlandıktan sonra SMS üzerinden memnuniyet anketi/mesajı gönderir.",
        category: "SMS"
    },
    {
        id: "sms_payment_reminder",
        name: "Ödeme Günü Geldi Hatırlatma Mesajı - SMS",
        description: "Planlanan ödeme gününde SMS üzerinden hatırlatma gönderir.",
        category: "SMS"
    },
    {
        id: "gmail_performance_weekly",
        name: "Haftalık Performans Raporu - Gmail",
        description: "Klinik performans raporunu her hafta başında e-posta ile gönderir.",
        category: "Gmail"
    },
    {
        id: "gmail_eod_report",
        name: "Gün Sonu Performans Raporu - Gmail",
        description: "Günlük özet ve finansal raporu her akşam e-posta ile gönderir.",
        category: "Gmail"
    },
    {
        id: "ai_voice_assistant",
        name: "Yapay Zeka Klinik Sesli Asistanı",
        description: "Gelen aramaları karşılayan ve randevu planlayan akıllı sesli asistan.",
        category: "AI"
    },
    {
        id: "ai_whatsapp_assistant",
        name: "Yapay Zeka Klinik WhatsApp Asistanı",
        description: "WhatsApp mesajlarını 7/24 yanıtlayan ve hastaları yönlendiren akıllı asistan.",
        category: "AI"
    }
];

export interface ClinicAutomation {
    id: string;
    clinic_id?: string;
    name: string;
    visible: boolean;
    enabled: boolean;
    time: string;
    day?: string; // Weekly reports için
}
