/**
 * DB tabanlı rate limiter — Vercel serverless ortamında güvenilir çalışır.
 * Supabase'deki check_rate_limit() RPC fonksiyonunu çağırır (atomik INSERT/UPDATE).
 *
 * In-memory fallback: supabaseAdmin import döngüsünü kırmak için
 * bu modül supabaseAdminClient'ı lazy olarak yükler.
 */

import { supabaseAdmin } from "@/lib/supabaseAdminClient";

/**
 * @param key      IP + endpoint kombinasyonu (ör: "checkin_verify:1.2.3.4")
 * @param limit    Pencere içindeki maksimum istek sayısı
 * @param windowMs Zaman penceresi (ms)
 * @returns { allowed: boolean }
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<{ allowed: boolean }> {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_ms: windowMs,
    });

    if (error) {
        // DB hatası durumunda güvenli tarafta kal: izin ver ama logla
        console.error("[rate-limit] DB error, allowing request:", error.message);
        return { allowed: true };
    }

    return { allowed: data === true };
}
