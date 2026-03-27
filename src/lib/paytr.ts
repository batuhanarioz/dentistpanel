/**
 * PayTR Payment Gateway Integration Utilities
 *
 * Credentials ve endpoint değerleri PayTR merchant panel'inden alınacak.
 * Tüm değerler environment variable'dan okunur — .env.local'e eklemeniz yeterli.
 *
 * TODO (dokümantasyon gelince):
 *  - PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT değerlerini al
 *  - Recurring cancel endpoint'ini ve parametrelerini doğrula
 *  - Webhook URL'yi PayTR merchant panelinden kaydet
 */

import crypto from "crypto";

// ─── Yapılandırma ─────────────────────────────────────────────────────────────
export const PAYTR_CONFIG = {
    /** PayTR merchant panel'inden alınacak */
    MERCHANT_ID: process.env.PAYTR_MERCHANT_ID ?? "TODO_MERCHANT_ID",
    MERCHANT_KEY: process.env.PAYTR_MERCHANT_KEY ?? "TODO_MERCHANT_KEY",
    MERCHANT_SALT: process.env.PAYTR_MERCHANT_SALT ?? "TODO_MERCHANT_SALT",

    /** 1 = test modu, 0 = canlı */
    TEST_MODE: process.env.PAYTR_TEST_MODE === "0" ? "0" : "1",

    /** PayTR sabit endpoint'leri */
    IFRAME_TOKEN_URL: "https://www.paytr.com/odeme/api/get-token",
    IFRAME_BASE_URL: "https://www.paytr.com/odeme/guvenli",
    RECURRING_CANCEL_URL: "https://www.paytr.com/odeme/api/recurring-cancel",
    /** Kayıtlı kart ile manuel ücretlendirme (dunning retry) */
    RECURRING_CHARGE_URL: "https://www.paytr.com/odeme/api/recurring-payment",
} as const;

// ─── Tipler ──────────────────────────────────────────────────────────────────
export type BillingCycle = "monthly" | "annual";

export interface PaytrCheckoutRequest {
    clinicId: string;
    clinicSlug: string;
    userEmail: string;
    userName: string;
    /** Kullanıcı telefonu — E.164 veya 05xx formatı */
    userPhone: string;
    /** İstek gelen IP adresi */
    userIp: string;
    billingCycle: BillingCycle;
    /** Sitenin kök URL'si, örn: https://app.nextgency.com */
    baseUrl: string;
    /** TL cinsinden tutar (platform_settings'ten gelen) */
    amountTL: number;
}

/** PayTR'nin webhook'ta gönderdiği form alanları */
export interface PaytrWebhookPayload {
    merchant_oid: string;
    status: "success" | "failed";
    total_amount: string;         // kuruş cinsinden, örn "149900"
    hash: string;
    failed_reason_code?: string;
    failed_reason_msg?: string;
    test_mode?: string;           // "1" veya "0"
    payment_type?: string;        // "card" vb.
    currency?: string;            // "TL"
    payment_amount?: string;      // kuruş
    /** "1" ise otomatik yineleme (kart tokenı ile), "0" ise ilk ödeme */
    recurring_payment?: string;
}

// ─── Hash Fonksiyonları ───────────────────────────────────────────────────────

/**
 * iFrame token isteği için PayTR hash üretir.
 *
 * Algoritma: BASE64( HMAC-SHA256( hash_str + merchant_salt, merchant_key ) )
 * hash_str  = merchant_id + user_ip + merchant_oid + email + payment_amount
 *           + user_basket + no_installment + max_installment + currency + test_mode
 *
 * @see PayTR iFrame API Dokümantasyonu (iframe_ornek.php satır 102)
 */
export function generateIframeHash(params: {
    userIp: string;
    merchantOid: string;
    email: string;
    paymentAmountKurus: string;
    userBasket: string;   // base64 encoded
    noInstallment: string;
    maxInstallment: string;
    currency?: string;
    testMode?: string;
}): string {
    const {
        userIp,
        merchantOid,
        email,
        paymentAmountKurus,
        userBasket,
        noInstallment,
        maxInstallment,
        currency = "TL",
        testMode = PAYTR_CONFIG.TEST_MODE,
    } = params;

    const { MERCHANT_ID, MERCHANT_KEY, MERCHANT_SALT } = PAYTR_CONFIG;

    const hashStr =
        MERCHANT_ID +
        userIp +
        merchantOid +
        email +
        paymentAmountKurus +
        userBasket +
        noInstallment +
        maxInstallment +
        currency +
        testMode;

    return crypto
        .createHmac("sha256", MERCHANT_KEY)
        .update(hashStr + MERCHANT_SALT)
        .digest("base64");
}

/**
 * PayTR webhook bildiriminin hash'ini doğrular.
 *
 * Algoritma: BASE64( HMAC-SHA256( merchant_oid + merchant_salt + status + total_amount, merchant_key ) )
 *
 * @returns true ise bildirim PayTR'den gelmiştir (güvenli)
 */
export function verifyWebhookHash(payload: PaytrWebhookPayload): boolean {
    const { merchant_oid, status, total_amount, hash } = payload;
    const { MERCHANT_KEY, MERCHANT_SALT } = PAYTR_CONFIG;

    const expected = crypto
        .createHmac("sha256", MERCHANT_KEY)
        .update(merchant_oid + MERCHANT_SALT + status + total_amount)
        .digest("base64");

    return expected === hash;
}

/**
 * Recurring cancel hash üretir.
 * Algoritma: BASE64( HMAC-SHA256( merchant_id + merchant_oid + merchant_salt, merchant_key ) )
 */
export function generateCancelHash(merchantOid: string): string {
    const { MERCHANT_ID, MERCHANT_KEY, MERCHANT_SALT } = PAYTR_CONFIG;
    const hashStr = MERCHANT_ID + merchantOid + MERCHANT_SALT;
    return crypto
        .createHmac("sha256", MERCHANT_KEY)
        .update(hashStr)
        .digest("base64");
}

/**
 * Recurring retry (dunning) hash üretir.
 * Algoritma: BASE64( HMAC-SHA256(
 *   merchant_id + original_merchant_oid + new_merchant_oid + payment_amount + currency + test_mode + merchant_salt,
 *   merchant_key
 * ))
 */
export function generateRetryHash(params: {
    originalMerchantOid: string;
    newMerchantOid: string;
    paymentAmountKurus: string;
    currency?: string;
    testMode?: string;
}): string {
    const { MERCHANT_ID, MERCHANT_KEY, MERCHANT_SALT, TEST_MODE } = PAYTR_CONFIG;
    const { originalMerchantOid, newMerchantOid, paymentAmountKurus, currency = "TL", testMode = TEST_MODE } = params;

    const hashStr =
        MERCHANT_ID +
        originalMerchantOid +
        newMerchantOid +
        paymentAmountKurus +
        currency +
        testMode +
        MERCHANT_SALT;

    return crypto
        .createHmac("sha256", MERCHANT_KEY)
        .update(hashStr)
        .digest("base64");
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/** TL'yi kuruşa çevirir */
export function tlToKurus(amountTL: number): string {
    return String(Math.round(amountTL * 100));
}

/** Kuruşu TL'ye çevirir */
export function kurusToTl(kurus: string): number {
    return parseInt(kurus, 10) / 100;
}

/**
 * Benzersiz PayTR sipariş ID'si üretir.
 * Format: [CLINIC_PREFIX][TIMESTAMP][RANDOM]
 * Bu ID webhook'ta merchant_oid olarak geri döner → DB eşleşmesi için saklanır.
 */
export function generateOrderId(clinicId: string): string {
    const prefix = clinicId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    // 6 random chars (base36) → ~2.17 milyar olasılık, aynı millisaniyede çakışma pratikte imkansız
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}${ts}${rand}`;
}

/**
 * Fatura dönemine göre yeni period bitiş tarihini hesaplar.
 */
export function calculatePeriodEnd(cycle: BillingCycle, fromDate = new Date()): Date {
    const end = new Date(fromDate);
    if (cycle === "annual") {
        end.setFullYear(end.getFullYear() + 1);
    } else {
        end.setMonth(end.getMonth() + 1);
    }
    return end;
}

/**
 * billing_cycle'a göre PayTR recurring parametrelerini döner.
 *
 * PayTR recurring_payment_frequency_type desteklenen değerler: "D" | "W" | "M"
 * "Y" (yearly) desteklenmez — yıllık abonelik için "M" + frequency "12" kullanılır.
 *
 * Aylık  → her 1 ay
 * Yıllık → her 12 ay (PayTR'de "Y" tipi yoktur)
 */
export function getRecurringParams(cycle: BillingCycle): {
    recurring_payment_num: string;
    recurring_payment_frequency: string;
    recurring_payment_frequency_type: string;
    recurring_payment_max_charge: string;
} {
    return {
        recurring_payment_num: "0",              // 0 = sonsuz yineleme
        recurring_payment_frequency: cycle === "annual" ? "12" : "1",
        recurring_payment_frequency_type: "M",   // her zaman aylık tip; yıllık için freq=12
        recurring_payment_max_charge: "0",       // 0 = tutar sınırı yok
    };
}
