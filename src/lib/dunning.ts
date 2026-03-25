/**
 * Dunning (Ödeme Yeniden Deneme) İş Mantığı
 *
 * Retry takvimi:
 *   Gün  0 → Ödeme başarısız: past_due, bildirim #1 (webhook tetikler)
 *   Gün  3 → Retry #1 + Bildirim #2
 *   Gün  7 → Retry #2 + Bildirim #3 (acil)
 *   Gün 14 → Erişim kısıtla (subscription_status = 'restricted')
 *   Gün 21 → Aboneliği iptal et (subscription_status = 'canceled')
 */

export type DunningAction =
    | { type: "skip" }
    | { type: "retry"; attempt: number; message: DunningMessage }
    | { type: "restrict"; message: DunningMessage }
    | { type: "cancel"; message: DunningMessage };

export interface DunningMessage {
    subject: string;
    /** WhatsApp için kısa metin */
    whatsapp: string;
    /** In-app banner için kısa açıklama */
    banner: string;
    urgency: "normal" | "high" | "urgent";
}

/** Kaç gün geçtiğini hesaplar */
export function daysSince(date: string | Date): number {
    const from = new Date(date).getTime();
    const now = Date.now();
    return Math.floor((now - from) / (1000 * 60 * 60 * 24));
}

/**
 * Bir klinik için ne yapılması gerektiğini belirler.
 * Cron job bu fonksiyonun döndürdüğü aksiyona göre hareket eder.
 */
export function getDunningAction(
    dunningStartedAt: string | Date,
    retryCount: number
): DunningAction {
    const days = daysSince(dunningStartedAt);

    // Gün 21+: İptal
    if (days >= 21) {
        return {
            type: "cancel",
            message: {
                subject: "Aboneliğiniz İptal Edildi",
                whatsapp:
                    "🚫 NextGency OS: Aboneliğiniz ödeme alınamadığı için iptal edilmiştir. " +
                    "Verileriniz 90 gün süreyle korunmaktadır. Yeniden başlatmak için: {link}",
                banner: "Aboneliğiniz iptal edildi. Verilerinize erişmek için yeniden abone olun.",
                urgency: "urgent",
            },
        };
    }

    // Gün 14-20: Kısıtlama
    if (days >= 14) {
        return {
            type: "restrict",
            message: {
                subject: "Erişiminiz Kısıtlandı — Ödeme Gerekli",
                whatsapp:
                    "⛔ NextGency OS: Ödeme alınamadığı için erişiminiz kısıtlanmıştır. " +
                    `${21 - days} gün içinde ödeme yapılmazsa aboneliğiniz iptal edilecektir. ` +
                    "Abonelik sayfası: {link}",
                banner: `Erişiminiz kısıtlandı. ${21 - days} gün içinde ödeme yapmazsanız aboneliğiniz iptal edilecek.`,
                urgency: "urgent",
            },
        };
    }

    // Gün 7: Retry #2
    if (days >= 7 && retryCount < 2) {
        return {
            type: "retry",
            attempt: 2,
            message: {
                subject: "Son Uyarı — Ödeme Yeniden Deneniyor",
                whatsapp:
                    "⚠️ NextGency OS: Abonelik ödemesi hâlâ alınamıyor. " +
                    "Son deneme yapılıyor. 7 gün içinde çözülmezse erişiminiz kısıtlanacak. " +
                    "Kart bilgilerinizi güncelleyin: {link}",
                banner: "Ödeme 7 gündür alınamıyor. Lütfen kart bilgilerinizi güncelleyin.",
                urgency: "high",
            },
        };
    }

    // Gün 3: Retry #1
    if (days >= 3 && retryCount < 1) {
        return {
            type: "retry",
            attempt: 1,
            message: {
                subject: "Ödeme Yeniden Deneniyor",
                whatsapp:
                    "💳 NextGency OS: Abonelik ödemesi alınamadı, yeniden deniyoruz. " +
                    "Kartınızda bakiye yoksa lütfen güncelleyin: {link}",
                banner: "Ödeme alınamadı. Kartınızı güncelleyerek aboneliğinizi sürdürün.",
                urgency: "normal",
            },
        };
    }

    return { type: "skip" };
}

/** Retry denemesi arasında yeterli süre geçti mi? (aynı gün 2x denemeyi önler) */
export function canRetryNow(lastRetryAt: string | Date | null): boolean {
    if (!lastRetryAt) return true;
    const hoursSince =
        (Date.now() - new Date(lastRetryAt).getTime()) / (1000 * 60 * 60);
    return hoursSince >= 20; // 20 saat cooldown
}

/**
 * WhatsApp deep link URL'i oluşturur (UI butonları için).
 * Platform admin tıklayınca ilgili numaraya yüklenmiş mesajla WhatsApp açılır.
 */
export function buildWhatsAppUrl(
    phone: string,
    messageTemplate: string,
    clinicSlug: string
): string {
    const baseUrl =
        typeof window !== "undefined"
            ? window.location.origin
            : "https://app.nextgency.com";
    const link = `${baseUrl}/${clinicSlug}/admin/subscription`;
    const message = messageTemplate.replace("{link}", link);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
