/**
 * POST /api/subscription/cancel
 *
 * Aktif aboneliği PayTR üzerinde iptal eder.
 * Mevcut dönem sonuna kadar erişim devam eder (immediate cutoff yok).
 *
 * TODO (dokümantasyon gelince):
 *  - PayTR recurring cancel API parametrelerini doğrula
 *  - cancelHash algoritmasını doğrula (generateCancelHash içinde)
 *  - İptal sonrası PayTR'nin bildirim gönderip göndermediğini doğrula
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { PAYTR_CONFIG, generateCancelHash } from "@/lib/paytr";

export const POST = withAuth(
    async (_req: NextRequest, ctx) => {
        if (!ctx.isAdmin || !ctx.clinicId) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }

        // ── 1. Aktif abonelik sipariş ID'sini bul ────────────────────────────
        const { data: order, error } = await supabaseAdmin
            .from("paytr_orders")
            .select("merchant_oid")
            .eq("clinic_id", ctx.clinicId)
            .eq("status", "paid")
            .order("paid_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !order) {
            return NextResponse.json(
                { error: "Aktif abonelik bulunamadı" },
                { status: 404 }
            );
        }

        const { merchant_oid } = order;

        // ── 2. PayTR'ye iptal isteği gönder ──────────────────────────────────
        // TODO: PayTR cancel endpoint parametrelerini dokümantasyonla doğrula
        const cancelHash = generateCancelHash(merchant_oid);

        const formBody = new URLSearchParams({
            merchant_id: PAYTR_CONFIG.MERCHANT_ID,
            merchant_oid: merchant_oid,
            paytr_token: cancelHash,
        }).toString();

        const paytrRes = await fetch(PAYTR_CONFIG.RECURRING_CANCEL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody,
        });

        const paytrData = (await paytrRes.json()) as {
            status: "success" | "failed";
            reason?: string;
        };

        if (paytrData.status !== "success") {
            console.error("[PayTR Cancel] İptal başarısız:", paytrData);
            return NextResponse.json(
                { error: "Abonelik iptal edilemedi", detail: paytrData.reason },
                { status: 502 }
            );
        }

        // ── 3. DB'yi güncelle — dönem sonunda erişim biter ───────────────────
        await supabaseAdmin
            .from("clinics")
            .update({ subscription_status: "canceled" })
            .eq("id", ctx.clinicId);

        return NextResponse.json({ success: true });
    },
    { requiredRole: "ADMIN_OR_SUPER" }
);
