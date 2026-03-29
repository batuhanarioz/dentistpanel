/**
 * Gün sonu kasa kapatma — ortak yardımcı fonksiyonlar
 * summary/route.ts ve close/route.ts tarafından kullanılır.
 */

import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { normalizePaymentMethod } from "@/constants/payments";

/**
 * Verilen tarih (YYYY-MM-DD) için Istanbul timezone UTC offset'ini hesaplar.
 * DST-aware: Türkiye şu an DST kullanmasa da dinamik kalır.
 */
export function istanbulOffset(dateStr: string): string {
    const d = new Date(`${dateStr}T12:00:00Z`);
    const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Istanbul",
        timeZoneName: "shortOffset",
    }).formatToParts(d);
    const tzPart = formatted.find(p => p.type === "timeZoneName")?.value ?? "GMT+3";
    const match = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!match) return "+03:00";
    const sign = match[1].startsWith("-") ? "-" : "+";
    const hours = Math.abs(parseInt(match[1])).toString().padStart(2, "0");
    const mins = (match[2] ?? "00").padStart(2, "0");
    return `${sign}${hours}:${mins}`;
}

/** Ödeme yöntemini 4 kasaya gruplar */
export function methodToGroup(method: string | null | undefined): "nakit" | "kart" | "havale" | "diger" {
    const norm = normalizePaymentMethod(method).toLowerCase();
    if (norm === "nakit") return "nakit";
    if (norm === "kredi kartı" || norm === "pos/taksit") return "kart";
    if (norm === "havale/eft") return "havale";
    return "diger";
}

/** Kullanıcının kasa kapatma yetkisi var mı? */
export async function canCloseDay(clinicId: string, role: string): Promise<boolean> {
    const { data: settings } = await supabaseAdmin
        .from("clinic_settings")
        .select("feature_permissions")
        .eq("clinic_id", clinicId)
        .maybeSingle();
    const allowedRoles: string[] = settings?.feature_permissions?.day_close_roles ?? [];
    // Boş liste = herkes yetkili
    return allowedRoles.length === 0 || allowedRoles.includes(role);
}
