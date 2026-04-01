/**
 * QR Check-in sistemi için hedef URL ayarları.
 *
 * Öncelik sırası:
 * 1. NEXT_PUBLIC_CHECKIN_BASE_URL env değişkeni (dev'de .env.local'e eklenebilir)
 * 2. Tarayıcı ortamında mevcut origin (production'da otomatik doğru çalışır)
 * 3. Server-side render sırasında fallback
 */

const PRODUCTION_DOMAIN = "https://clinic.nextgency360.com";

export const getBaseUrl = (): string => {
    // 1. Explicit override — dev'de test etmek veya production'ı zorlamak için
    if (process.env.NEXT_PUBLIC_CHECKIN_BASE_URL) {
        return process.env.NEXT_PUBLIC_CHECKIN_BASE_URL.replace(/\/$/, "");
    }

    // 2. Tarayıcı ortamında mevcut origin kullan (production'da doğru domain döner)
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    // 3. SSR fallback
    return PRODUCTION_DOMAIN;
};

export const getCheckinUrl = (slug: string): string => {
    return `${getBaseUrl()}/check-in/${slug}`;
};
