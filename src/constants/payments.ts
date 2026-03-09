export type PaymentStatus = "pending" | "paid" | "cancelled" | "partial";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: "Beklemede",
    paid: "Ödendi",
    cancelled: "İptal",
    partial: "Kısmi",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; dot: string }> = {
    pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-400",
    },
    paid: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
    },
    cancelled: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        dot: "bg-rose-500",
    },
    partial: {
        bg: "bg-sky-50",
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
