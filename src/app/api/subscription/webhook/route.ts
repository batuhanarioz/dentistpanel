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
import { sendReferralRewardEmail } from "@/lib/email";

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

        const [clinicUpdate] = await Promise.all([
            supabaseAdmin
                .from("clinics")
                .update({
                    subscription_status: "active",
                    billing_cycle,
                    current_period_end: periodEnd.toISOString(),
                    last_payment_date: new Date().toISOString(),
                })
                .eq("id", clinic_id)
                .select("id, subscription_status"),

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

        if (clinicUpdate.error) {
            console.error("[PayTR Webhook] clinics update FAILED:", clinicUpdate.error, "clinic_id:", clinic_id);
        } else {
            console.log(
                `[PayTR Webhook] Ödeme başarılı — clinic: ${clinic_id}, tutar: ${amountTL} TL, dönem: ${billing_cycle}, yeni status: ${clinicUpdate.data?.[0]?.subscription_status}` +
                (discount_code_id ? ` (indirim kodu: ${discount_code_id})` : "")
            );
        }

        // ── Referral: ilk ödemede kod üret + ödül kontrol ────────────────────
        if (!isRecurring) {
            activateReferralCode(clinic_id).catch((e) =>
                console.error("[Referral] Kod aktivasyonu başarısız:", e)
            );
            applyReferralRewardIfEligible(clinic_id).catch((e) =>
                console.error("[Referral] Ödül işlemi başarısız:", e)
            );
        }
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

/**
 * İlk ödeme sonrası referral kodu üret + aktif et.
 * Kod zaten varsa (legacy trial klinik) sadece active = true yap.
 */
async function activateReferralCode(clinicId: string) {
    const { data: clinic } = await supabaseAdmin
        .from("clinics")
        .select("name, referral_code, referral_code_active")
        .eq("id", clinicId)
        .maybeSingle();

    if (!clinic) return;
    if (clinic.referral_code_active) return; // zaten aktif

    let code = clinic.referral_code;

    // Kod yoksa benzersiz üret
    if (!code) {
        for (let i = 0; i < 5; i++) {
            const candidate =
                clinic.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() +
                "-" +
                Math.random().toString(36).substring(2, 7).toUpperCase();
            const { data: existing } = await supabaseAdmin
                .from("clinics")
                .select("id")
                .eq("referral_code", candidate)
                .maybeSingle();
            if (!existing) { code = candidate; break; }
        }
        if (!code) code = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    await supabaseAdmin
        .from("clinics")
        .update({ referral_code: code, referral_code_active: true })
        .eq("id", clinicId);

    console.log(`[Referral] Kod aktif edildi — clinic: ${clinicId}, kod: ${code}`);
}

/**
 * İlk başarılı ödeme sonrası referral ödül mantığı:
 * 1. Klinikten referred_by + referral_reward_given kontrolü
 * 2. Ödül verilmediyse: referrer'ın current_period_end +30 gün uzat
 * 3. referral_conversions → "rewarded", clinics.referral_reward_given = true
 * 4. Referrer'a e-posta gönder
 */
async function applyReferralRewardIfEligible(referredClinicId: string) {
    // 1. Davet edilen kliniği çek
    const { data: referred } = await supabaseAdmin
        .from("clinics")
        .select("id, name, referred_by, referral_reward_given, email")
        .eq("id", referredClinicId)
        .maybeSingle();

    if (!referred?.referred_by || referred.referral_reward_given) return;

    // 2a. Atomic guard — race condition koruması
    // referral_reward_given = true YALNIZCA şu an false ise set edilir.
    // Eşzamanlı 2 webhook gelirse sadece biri bu UPDATE'i kazanır; diğeri 0 satır döner.
    const { data: claimed } = await supabaseAdmin
        .from("clinics")
        .update({ referral_reward_given: true })
        .eq("id", referredClinicId)
        .eq("referral_reward_given", false)
        .select("id");

    if (!claimed || claimed.length === 0) {
        console.log(`[Referral] Race condition önlendi — başka process zaten işledi: ${referredClinicId}`);
        return;
    }

    // 2b. Referrer kliniği + ADMIN kullanıcısının e-postasını çek
    const { data: referrer } = await supabaseAdmin
        .from("clinics")
        .select("id, name, current_period_end")
        .eq("id", referred.referred_by)
        .maybeSingle();

    if (!referrer) return;

    const { data: referrerAdmin } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("clinic_id", referrer.id)
        .eq("role", "ADMIN")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    const referrerEmail = referrerAdmin?.email;
    if (!referrerEmail) return;

    // 3. Max 12 ay limiti kontrol et
    const { count: rewardedCount } = await supabaseAdmin
        .from("referral_conversions")
        .select("id", { count: "exact", head: true })
        .eq("referrer_clinic_id", referrer.id)
        .eq("status", "rewarded");

    const MAX_REWARD_MONTHS = 12;
    if ((rewardedCount ?? 0) >= MAX_REWARD_MONTHS) {
        // Limiti doldurmuş: conversion'ı converted olarak işaretle ama ödül verme
        // referral_reward_given zaten atomic guard'da set edildi, sadece conversion güncelle
        await supabaseAdmin
            .from("referral_conversions")
            .update({ status: "converted", converted_at: new Date().toISOString() })
            .eq("referrer_clinic_id", referrer.id)
            .eq("referred_clinic_id", referredClinicId);
        console.log(`[Referral] Limit dolu (${MAX_REWARD_MONTHS} ay) — referrer: ${referrer.id}, ödül verilmedi`);
        return;
    }

    // 4. Referrer'ın süresini +30 gün uzat
    const currentEnd = referrer.current_period_end
        ? new Date(referrer.current_period_end)
        : new Date();
    // Eğer süre geçmişse bugünden başlat
    const base = currentEnd > new Date() ? currentEnd : new Date();
    base.setDate(base.getDate() + 30);
    const newPeriodEnd = base.toISOString();

    await Promise.all([
        // Referrer aboneliğini uzat
        supabaseAdmin
            .from("clinics")
            .update({ current_period_end: newPeriodEnd })
            .eq("id", referrer.id),

        // Conversion kaydını rewarded yap
        supabaseAdmin
            .from("referral_conversions")
            .update({
                status: "rewarded",
                converted_at: new Date().toISOString(),
            })
            .eq("referrer_clinic_id", referrer.id)
            .eq("referred_clinic_id", referredClinicId),
        // Not: referral_reward_given = true zaten atomic guard'da (satır ~300) set edildi
    ]);

    // 5. Referrer ADMIN'ine e-posta gönder (fire-and-forget)
    sendReferralRewardEmail(referrerEmail, referrer.name, referred.name).catch(() => {});

    console.log(`[Referral] Ödül uygulandı — referrer: ${referrer.id}, referred: ${referredClinicId}, yeni dönem sonu: ${newPeriodEnd}`);
}
