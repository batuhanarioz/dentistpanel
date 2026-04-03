/**
 * QR Check-in sistemi için hedef URL ayarları.
 *
 * Öncelik sırası:
 * 1. NEXT_PUBLIC_CHECKIN_BASE_URL env değişkeni (dev'de .env.local'e eklenebilir)
 * 2. Tarayıcı ortamında mevcut origin (production'da otomatik doğru çalışır)
 * 3. Server-side render sırasında fallback
 */

const PRODUCTION_DOMAIN = "https://clinic.nextgency360.com";

export const getBaseUrl = (forceProduction: boolean = false): string => {
    // 1. Force Production (Useful for SuperAdmins generating production QRs from localhost)
    if (forceProduction) {
        return PRODUCTION_DOMAIN;
    }

    // 2. Explicit override — dev'de test etmek veya production'ı zorlamak için
    if (process.env.NEXT_PUBLIC_CHECKIN_BASE_URL) {
        return process.env.NEXT_PUBLIC_CHECKIN_BASE_URL.replace(/\/$/, "");
    }

    // 3. Tarayıcı ortamında mevcut origin kullan
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    // 4. SSR fallback
    return PRODUCTION_DOMAIN;
};

export const getCheckinUrl = (slug: string, forceProduction: boolean = false): string => {
    return `${getBaseUrl(forceProduction)}/check-in/${slug}`;
};

export const getBookingUrl = (slug: string, forceProduction: boolean = false): string => {
    return `${getBaseUrl(forceProduction)}/randevu/${slug}`;
};
