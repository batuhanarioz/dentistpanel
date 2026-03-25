"use client";

/**
 * PastDueBanner
 *
 * Klinik aboneliği past_due veya restricted durumdaysa sayfanın üstünde
 * sabit bir uyarı banner'ı gösterir.
 *
 * AppShell içine <AnnouncementBanner /> ile aynı yere eklenir.
 */

import { useClinic } from "@/app/context/ClinicContext";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, X } from "lucide-react";
import { useState } from "react";

const MESSAGES: Record<string, { text: string; cta: string; color: string }> = {
    past_due: {
        text: "Ödeme alınamadı. Aboneliğinizin devam etmesi için kart bilgilerinizi güncelleyin.",
        cta: "Ödeme Yap",
        color: "from-amber-500 to-orange-500",
    },
    restricted: {
        text: "Erişiminiz kısıtlandı. Aboneliğinizi yenilemezseniz yakında iptal edilecek.",
        cta: "Hemen Yenile",
        color: "from-rose-500 to-red-600",
    },
};

export function PastDueBanner() {
    const clinic = useClinic();
    const router = useRouter();
    const [dismissed, setDismissed] = useState(false);

    const status = clinic.subscriptionStatus;
    if (dismissed || !status || !(status in MESSAGES)) return null;

    // SUPER_ADMIN kendi platformunda bu banner'ı görmesin
    if (clinic.isSuperAdmin) return null;

    const { text, cta, color } = MESSAGES[status];

    return (
        <div className={`w-full bg-gradient-to-r ${color} px-4 py-2.5 flex items-center gap-3 shadow-md z-40`}>
            <AlertCircle className="h-4 w-4 text-white shrink-0" />
            <p className="flex-1 text-white text-xs font-semibold leading-snug">{text}</p>
            <button
                onClick={() => clinic.clinicSlug && router.push(`/${clinic.clinicSlug}/admin/subscription`)}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
                <CreditCard className="h-3 w-3" />
                {cta}
            </button>
            <button
                onClick={() => setDismissed(true)}
                className="shrink-0 text-white/70 hover:text-white transition-colors"
                aria-label="Kapat"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
