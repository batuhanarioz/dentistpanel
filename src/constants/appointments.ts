// TREATMENTS removed - fetched from DB matching treatment_definitions table

export const CHANNEL_OPTIONS = [
    { value: "web", label: "Web" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "phone", label: "Telefon" },
    { value: "walk_in", label: "Yüz yüze" },
];

export const STATUS_COLORS: Record<string, { card: string; dot: string }> = {
    confirmed: { // Planlandı
        card: "bg-blue-50 border-blue-100 hover:bg-blue-100/50",
        dot: "bg-blue-500",
    },
    completed: { // Tamamlandı
        card: "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50",
        dot: "bg-emerald-500",
    },
    cancelled: { // İptal Edildi
        card: "bg-rose-50 border-rose-100 hover:bg-rose-100/50 opacity-60",
        dot: "bg-rose-500",
    },
    no_show: { // Gelmedi
        card: "bg-slate-100 border-slate-200 hover:bg-slate-200/50",
        dot: "bg-slate-500",
    },
};