export const TREATMENTS = [
    { value: "MUAYENE", label: "Muayene", duration: 30 },
    { value: "DOLGU", label: "Dolgu", duration: 60 },
    { value: "KANAL", label: "Kanal Tedavisi", duration: 90 },
    { value: "TEMIZLIK", label: "Diş Temizliği", duration: 45 },
    { value: "CEKIM", label: "Diş Çekimi", duration: 45 },
    { value: "IMPLANT", label: "İmplant", duration: 120 },
    { value: "BEYAZLATMA", label: "Diş Beyazlatma", duration: 60 },
    { value: "PROTEZ", label: "Protez", duration: 90 },
    { value: "ORTODONTI", label: "Ortodonti Muayene", duration: 30 },
];

export const REMINDER_OPTIONS = [
    { value: 0, label: "Hatırlatma Yok" },
    { value: 15, label: "15 dakika önce" },
    { value: 30, label: "30 dakika önce" },
    { value: 60, label: "1 saat önce" },
    { value: 180, label: "3 saat önce" },
    { value: 1440, label: "1 gün önce" },
    { value: 2880, label: "2 gün önce" },
];

export const CHANNEL_OPTIONS = [
    { value: "web", label: "Web" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "phone", label: "Telefon" },
    { value: "walk_in", label: "Yüz yüze" },
];

export const STATUS_COLORS: Record<string, { card: string; dot: string }> = {
    pending: {
        card: "bg-amber-50 border-amber-100 hover:bg-amber-100/50",
        dot: "bg-amber-500",
    },
    confirmed: {
        card: "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50",
        dot: "bg-emerald-500",
    },
    past: {
        card: "bg-slate-50 border-slate-200 hover:bg-slate-100/80",
        dot: "bg-slate-400",
    },
    cancelled: {
        card: "bg-rose-50 border-rose-100 hover:bg-rose-100/50 opacity-60",
        dot: "bg-rose-500",
    },
    no_show: {
        card: "bg-rose-50 border-rose-100 hover:bg-rose-100/50",
        dot: "bg-rose-500",
    },
    completed: {
        card: "bg-blue-50 border-blue-100 hover:bg-blue-100/50",
        dot: "bg-blue-500",
    },
};
