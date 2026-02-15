export const STATUS_LABEL_MAP: Record<string, string> = {
    pending: "Onay bekliyor",
    confirmed: "Onaylı",
    completed: "Tamamlandı",
    cancelled: "İptal",
    no_show: "Gelmedi",
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    no_show: "bg-rose-100 text-rose-700 border-rose-200",
};

export const CHANNEL_LABEL_MAP: Record<string, string> = {
    whatsapp: "WhatsApp",
    web: "Web",
    phone: "Telefon",
    walk_in: "Yüz yüze",
};

export const CHANNEL_COLOR_MAP: Record<string, string> = {
    whatsapp: "from-emerald-500 to-green-500",
    web: "from-sky-500 to-blue-500",
    phone: "from-violet-500 to-purple-500",
    walk_in: "from-orange-500 to-amber-500",
};

export const CONTROL_TONE_STYLES: Record<
    string,
    { container: string; badge: string }
> = {
    critical: {
        container: "border-l-red-600 bg-red-50 hover:bg-red-100",
        badge: "bg-red-700 text-white",
    },
    high: {
        container: "border-l-rose-600 bg-rose-50 hover:bg-rose-100",
        badge: "bg-rose-700 text-white",
    },
    medium: {
        container: "border-l-amber-500 bg-amber-50 hover:bg-amber-100",
        badge: "bg-amber-600 text-white",
    },
    low: {
        container: "border-l-sky-500 bg-sky-50 hover:bg-sky-100",
        badge: "bg-sky-600 text-white",
    },
};
