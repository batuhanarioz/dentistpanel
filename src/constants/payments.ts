export type PaymentStatus = "pending" | "paid" | "cancelled" | "partial";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending:   "Beklemede",
    paid:      "Ödendi",
    cancelled: "İptal",
    partial:   "Kısmi",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; dot: string }> = {
    pending: {
        bg:  "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-400",
    },
    paid: {
        bg:  "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
    },
    cancelled: {
        bg:  "bg-rose-50",
        text: "text-rose-700",
        dot: "bg-rose-500",
    },
    partial: {
        bg:  "bg-sky-50",
        text: "text-sky-700",
        dot: "bg-sky-500",
    },
};

export const PAYMENT_METHODS = [
    "Nakit",
    "Kredi Kartı",
    "Havale/EFT",
    "Senet",
    "Diğer",
];

// ─── Method normalization ──────────────────────────────────────────────────────
const METHOD_MAP: Record<string, string> = {
    nakit: "Nakit",
    cash: "Nakit",
    kredi_karti: "Kredi Kartı",
    kredi_kartı: "Kredi Kartı",
    "kredi kartı": "Kredi Kartı",
    credit_card: "Kredi Kartı",
    creditcard: "Kredi Kartı",
    havale_eft: "Havale/EFT",
    "havale/eft": "Havale/EFT",
    havale: "Havale/EFT",
    eft: "Havale/EFT",
    transfer: "Havale/EFT",
    pos_taksit: "POS/Taksit",
    pos: "POS/Taksit",
    senet: "Senet",
    cek: "Çek",
    çek: "Çek",
    check: "Çek",
    diger: "Diğer",
    diğer: "Diğer",
    other: "Diğer",
};

export function normalizePaymentMethod(method: string | null | undefined): string {
    if (!method) return "Belirtilmedi";
    return METHOD_MAP[method.toLowerCase().replace(/\s+/g, "_")] ?? method;
}

// ─── Status helpers ────────────────────────────────────────────────────────────
// DB'de hem İngilizce hem eski Türkçe değerler bulunabilir.
// Tüm karşılaştırmalar bu helper'lar üzerinden yapılmalı.

export function normalizePaymentStatus(status: string | null | undefined): PaymentStatus {
    switch (status) {
        case "paid":
        case "Ödendi":
            return "paid";
        case "cancelled":
        case "İptal":
        case "canceled":
            return "cancelled";
        case "partial":
        case "Kısmi":
            return "partial";
        default:
            return "pending"; // "pending" | "planned" | "Beklemede" | null → pending
    }
}

export const isPaid      = (s: string | null | undefined) => normalizePaymentStatus(s) === "paid";
export const isCancelled = (s: string | null | undefined) => normalizePaymentStatus(s) === "cancelled";
export const isPending   = (s: string | null | undefined) => normalizePaymentStatus(s) === "pending";
export const isPartial   = (s: string | null | undefined) => normalizePaymentStatus(s) === "partial";

export function getPaymentStatusConfig(status: string | null | undefined) {
    const slug = normalizePaymentStatus(status);
    return { slug, label: PAYMENT_STATUS_LABELS[slug], colors: PAYMENT_STATUS_COLORS[slug] };
}
