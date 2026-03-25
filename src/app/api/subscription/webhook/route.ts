/**
 * POST /api/subscription/webhook
 *
 * PayTR'nin asenkron bildirim (notification) handler'ı.
 * PayTR, ödeme sonucunu bu endpoint'e form-encoded POST ile bildirir.
 *
 * GÜVENLİK: Hash doğrulaması zorunludur — doğrulanmayan istekler reddedilir.
 *
 * Akış başarılı ödeme:
 *   1. Hash doğrula
 *   2. paytr_orders tablosundan klinik ID'sini bul
 *   3. clinics tablosunu güncelle (subscription_status, billing_cycle, current_period_end)
 *   4. payment_history'e kayıt ekle
 *   5. PayTR'ye "OK" yanıtı döndür (zorunlu)
 *
 * Akış başarısız ödeme:
 *   1. Hash doğrula
 *   2. payment_history'e failed kaydı ekle
 *   3. PayTR'ye "OK" yanıtı döndür
 *
 * NOT: Bu endpoint PUBLIC'tir (Bearer token yok). Güvenlik hash ile sağlanır.
 * NOT: Localhost'ta PayTR bu endpoint'e ulaşamaz — ngrok veya staging gerekir.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import {
    verifyWebhookHash,
    kurusToTl,
    calculatePeriodEnd,
    type PaytrWebhookPayload,
    type BillingCycle,
} from "@/lib/paytr";

export async function POST(req: NextRequest) {
    // ── 1. Form-encoded body'yi parse et ─────────────────────────────────────
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
        return new NextResponse("Bad Request", { status: 400 });
    }

    const text = await req.text();
    const params = new URLSearchParams(text);

    const payload: PaytrWebhookPayload = {
        merchant_oid: params.get("merchant_oid") ?? "",
        status: (params.get("status") ?? "") as "success" | "failed",
        total_amount: params.get("total_amount") ?? "",
        hash: params.get("hash") ?? "",
        failed_reason_code: params.get("failed_reason_code") ?? undefined,
        failed_reason_msg: params.get("failed_reason_msg") ?? undefined,
        test_mode: params.get("test_mode") ?? undefined,
        payment_type: params.get("payment_type") ?? undefined,
        currency: params.get("currency") ?? undefined,
        payment_amount: params.get("payment_amount") ?? undefined,
        recurring_payment: params.get("recurring_payment") ?? undefined,
    };

    // ── 2. Hash doğrula ───────────────────────────────────────────────────────
    if (!verifyWebhookHash(payload)) {
        console.warn("[PayTR Webhook] Hash doğrulama başarısız:", payload.merchant_oid);
        // PayTR'ye OK döndürülmeli yoksa webhook retry döngüsüne girer
        return new NextResponse("OK", { status: 200 });
    }

    const { merchant_oid, status, total_amount } = payload;
    const amountTL = kurusToTl(total_amount);

    // ── 3. paytr_orders tablosundan sipariş bilgisini bul ────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
        .from("paytr_orders")
        .select("clinic_id, billing_cycle, amount_tl, original_amount, discount_amount, discount_code_id")
        .eq("merchant_oid", merchant_oid)
        .maybeSingle();

    if (orderError || !order) {
        console.error("[PayTR Webhook] Sipariş bulunamadı:", merchant_oid, orderError);
        return new NextResponse("OK", { status: 200 });
    }

    const { clinic_id, billing_cycle, original_amount, discount_amount, discount_code_id } = order;
    const isRecurring = payload.recurring_payment === "1";

    if (status === "success") {
        // ── 4a. Abonelik güncelle ─────────────────────────────────────────────
        const periodEnd = calculatePeriodEnd(billing_cycle as BillingCycle);

        await Promise.all([
            supabaseAdmin
                .from("clinics")
                .update({
                    subscription_status: "active",
                    billing_cycle,
                    current_period_end: periodEnd.toISOString(),
                    last_payment_date: new Date().toISOString(),
                })
                .eq("id", clinic_id),

            supabaseAdmin.from("payment_history").insert({
                clinic_id,
                package_name: `NextGency OS Premium${isRecurring ? " (Otomatik Yenileme)" : ""}`,
                billing_period: billing_cycle,
                amount: amountTL,
                currency: "TRY",
                status: "paid",
                paytr_order_id: merchant_oid,
                invoice_url: null, // TODO: PayTR fatura URL'si varsa buraya
            }),

            supabaseAdmin
                .from("paytr_orders")
                .update({ status: "paid", paid_at: new Date().toISOString() })
                .eq("merchant_oid", merchant_oid),

            // İndirim kodu kullanıldıysa kullanım kaydı + sayaç güncelle
            ...(discount_code_id ? [
                supabaseAdmin.from("discount_code_uses").insert({
                    code_id: discount_code_id,
                    clinic_id,
                    billing_cycle,
                    original_amount: original_amount ?? amountTL,
                    discount_amount: discount_amount ?? 0,
                    final_amount: amountTL,
                    merchant_oid,
                }),
                supabaseAdmin.rpc("increment_discount_used_count", { p_code_id: discount_code_id }),
            ] : []),
        ]);

        console.log(
            `[PayTR Webhook] Ödeme başarılı — clinic: ${clinic_id}, tutar: ${amountTL} TL, dönem: ${billing_cycle}` +
            (discount_code_id ? ` (indirim kodu: ${discount_code_id})` : "")
        );
    } else {
        // ── 4b. Başarısız ödeme ───────────────────────────────────────────────
        await Promise.all([
            supabaseAdmin.from("payment_history").insert({
                clinic_id,
                package_name: `NextGency OS Premium${isRecurring ? " (Otomatik Yenileme)" : ""}`,
                billing_period: billing_cycle,
                amount: amountTL,
                currency: "TRY",
                status: "failed",
                paytr_order_id: merchant_oid,
                invoice_url: null,
            }),

            supabaseAdmin
                .from("paytr_orders")
                .update({
                    status: "failed",
                    failed_reason: `${payload.failed_reason_code ?? ""}: ${payload.failed_reason_msg ?? ""}`,
                })
                .eq("merchant_oid", merchant_oid),

            // Otomatik yenileme başarısız olduysa aboneliği past_due yap + dunning başlat
            ...(isRecurring
                ? [
                      supabaseAdmin
                          .from("clinics")
                          .update({
                              subscription_status: "past_due",
                              dunning_started_at: new Date().toISOString(),
                              retry_count: 0,
                              last_retry_at: null,
                          })
                          .eq("id", clinic_id),

                      // Dunning audit trail
                      supabaseAdmin.from("dunning_events").insert({
                          clinic_id,
                          event_type: "payment_failed",
                          days_overdue: 0,
                          retry_count: 0,
                          merchant_oid,
                          notes: `Kod: ${payload.failed_reason_code ?? "-"} — ${payload.failed_reason_msg ?? "-"}`,
                      }),
                  ]
                : []),
        ]);

        console.warn(
            `[PayTR Webhook] Ödeme başarısız — clinic: ${clinic_id}, neden: ${payload.failed_reason_msg}`
        );
    }

    // ── 5. PayTR'ye "OK" döndür (ZORUNLU — döndürülmezse tekrar dener) ───────
    return new NextResponse("OK", { status: 200 });
}

/**
 * GET /api/subscription/webhook/result
 *
 * PayTR'nin merchant_ok_url ve merchant_fail_url yönlendirmesi için.
 * paytr_orders → clinics.slug üzerinden doğru abonelik sayfasına yönlendirir.
 * NOT: Asıl bildirim async webhook'tan gelir; bu sadece UI yönlendirmesi içindir.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const oid = searchParams.get("oid");

    // Klinik slug'ını siparişten bul → doğru [slug]/admin/subscription sayfasına yönlendir
    let slug: string | null = null;
    if (oid) {
        const { data: order } = await supabaseAdmin
            .from("paytr_orders")
            .select("clinic_id, clinics(slug)")
            .eq("merchant_oid", oid)
            .maybeSingle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slug = (order?.clinics as any)?.slug ?? null;
    }

    const basePath = slug ? `/${slug}/admin/subscription/payment-result` : "/";
    const redirectUrl =
        status === "ok"
            ? `${basePath}?status=success`
            : `${basePath}?status=failed`;

    return NextResponse.redirect(new URL(redirectUrl, req.url));
}
