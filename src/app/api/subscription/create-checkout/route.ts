/**
 * POST /api/subscription/create-checkout
 *
 * PayTR iFrame token'ı üretir. Klinik admin'i ödeme başlatmak istediğinde
 * bu endpoint çağrılır; dönen token ile frontend'de iFrame render edilir.
 *
 * Body: { billingCycle: "monthly"|"annual", discountCode?: string }
 *
 * Akış:
 *   1. Klinik & kullanıcı bilgilerini al
 *   2. platform_settings'ten güncel fiyatı oku
 *   3. İndirim kodu varsa sunucu tarafında tekrar doğrula & uygula (güvenlik)
 *   4. Benzersiz sipariş ID'si oluştur, DB'ye pending olarak yaz
 *   5. PayTR API'sine token isteği gönder
 *   6. iFrame token'ı döndür
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import {
    PAYTR_CONFIG,
    generateIframeHash,
    generateOrderId,
    getRecurringParams,
    tlToKurus,
    type BillingCycle,
} from "@/lib/paytr";

export const POST = withAuth(
    async (req: NextRequest, ctx) => {
        try {
        if (!ctx.isAdmin || !ctx.clinicId) {
            return NextResponse.json({ error: "forbidden" }, { status: 403 });
        }

        const body = await req.json() as { billingCycle?: BillingCycle; discountCode?: string };
        const billingCycle: BillingCycle = body.billingCycle === "monthly" ? "monthly" : "annual";
        const rawCode = (body.discountCode ?? "").trim().toUpperCase();

        // ── 1. Klinik ve kullanıcı bilgilerini çek ───────────────────────────
        const [clinicResult, userResult, settingsResult] = await Promise.all([
            supabaseAdmin.from("clinics").select("id, name, slug, phone").eq("id", ctx.clinicId).single(),
            supabaseAdmin.from("users").select("full_name, email").eq("id", ctx.user.id).single(),
            supabaseAdmin.from("platform_settings").select("monthly_price, annual_price").eq("id", "global").single(),
        ]);

        if (clinicResult.error || !clinicResult.data)
            return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 404 });
        if (userResult.error || !userResult.data)
            return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

        const clinic = clinicResult.data;
        const user = userResult.data;
        const prices = settingsResult.data ?? { monthly_price: 1499, annual_price: 14990 };

        // ── 2. Temel tutar ───────────────────────────────────────────────────
        const originalAmountTL = billingCycle === "annual" ? prices.annual_price : prices.monthly_price;
        let finalAmountTL = originalAmountTL;
        let discountAmountTL = 0;
        let discountCodeId: string | null = null;

        // ── 3. İndirim kodu sunucu tarafında doğrula ─────────────────────────
        if (rawCode) {
            const { data: discount } = await supabaseAdmin
                .from("discount_codes")
                .select("id, discount_type, discount_value, applies_to, is_recurring, max_uses, used_count, valid_from, valid_until, is_active")
                .eq("code", rawCode)
                .maybeSingle();

            const now = new Date();
            const isValid =
                discount &&
                discount.is_active &&
                (!discount.valid_from || new Date(discount.valid_from) <= now) &&
                (!discount.valid_until || new Date(discount.valid_until) >= now) &&
                (discount.applies_to === "both" || discount.applies_to === billingCycle) &&
                (discount.max_uses === null || discount.used_count < discount.max_uses);

            if (isValid) {
                // Tek seferlik ise klinik daha önce kullanmış mı?
                let alreadyUsed = false;
                if (!discount.is_recurring) {
                    const { count } = await supabaseAdmin
                        .from("discount_code_uses")
                        .select("id", { count: "exact", head: true })
                        .eq("code_id", discount.id)
                        .eq("clinic_id", ctx.clinicId);
                    alreadyUsed = (count ?? 0) > 0;
                }

                if (!alreadyUsed) {
                    discountCodeId = discount.id;
                    if (discount.discount_type === "percent") {
                        discountAmountTL = Math.round(originalAmountTL * discount.discount_value) / 100;
                    } else {
                        discountAmountTL = Math.min(discount.discount_value, originalAmountTL - 1);
                    }
                    finalAmountTL = Math.max(originalAmountTL - discountAmountTL, 1);
                }
            }
            // Geçersiz kod → sessizce yoksay (güvenlik: client manipülasyonu)
        }

        const amountKurus = tlToKurus(finalAmountTL);

        // ── 4. Sipariş ID'si üret & DB'ye yaz ───────────────────────────────
        const merchantOid = generateOrderId(ctx.clinicId);

        await supabaseAdmin.from("paytr_orders").insert({
            merchant_oid: merchantOid,
            clinic_id: ctx.clinicId,
            billing_cycle: billingCycle,
            amount_tl: finalAmountTL,
            original_amount: originalAmountTL,
            discount_amount: discountAmountTL > 0 ? discountAmountTL : null,
            discount_code_id: discountCodeId,
            status: "pending",
        });

        // ── 5. PayTR parametrelerini hazırla ─────────────────────────────────
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const userIp =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            req.headers.get("x-real-ip") ??
            "127.0.0.1";

        const basketLabel = [
            `NextGency OS Premium - ${billingCycle === "annual" ? "Yıllık" : "Aylık"}`,
            ...(discountAmountTL > 0 ? [`(${rawCode} kodu ile indirimli)`] : []),
        ].join(" ");

        const userBasket = JSON.stringify([
            [basketLabel, finalAmountTL.toFixed(2), 1],
        ]);

        const recurring = getRecurringParams(billingCycle);

        const paytrParams: Record<string, string> = {
            merchant_id: PAYTR_CONFIG.MERCHANT_ID,
            user_ip: userIp,
            merchant_oid: merchantOid,
            email: user.email ?? ctx.user.email ?? "",
            payment_amount: amountKurus,
            payment_type: "card",
            installment_count: "0",
            currency: "TL",
            test_mode: PAYTR_CONFIG.TEST_MODE,
            non3d_test_failed: "0",
            user_basket: Buffer.from(userBasket).toString("base64"),
            user_name: user.full_name ?? clinic.name,
            user_address: clinic.name,
            // PayTR requires non-empty phone — use clinic phone, user email prefix as fallback
            user_phone: clinic.phone?.replace(/\D/g, "").replace(/^90/, "0") || "05000000000",
            merchant_ok_url: `${baseUrl}/api/subscription/webhook?status=ok&oid=${merchantOid}`,
            merchant_fail_url: `${baseUrl}/api/subscription/webhook?status=fail&oid=${merchantOid}`,
            lang: "tr",
            no_installment: "1",
            max_installment: "0",
            ...recurring,
            paytr_token: "",
        };

        // ── 6. Hash üret ─────────────────────────────────────────────────────
        paytrParams.paytr_token = generateIframeHash({
            userIp,
            merchantOid,
            email: paytrParams.email,
            paymentAmountKurus: amountKurus,
        });

        // ── 7. PayTR API'sini çağır ───────────────────────────────────────────
        const paytrRes = await fetch(PAYTR_CONFIG.IFRAME_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(paytrParams).toString(),
        });

        const paytrData = (await paytrRes.json()) as {
            status: "success" | "failed";
            token?: string;
            reason?: string;
        };

        if (paytrData.status !== "success" || !paytrData.token) {
            console.error("[PayTR] Token isteği başarısız:", JSON.stringify(paytrData));
            return NextResponse.json(
                { error: "Ödeme başlatılamadı", detail: paytrData.reason ?? "PayTR yanıt vermedi" },
                { status: 502 }
            );
        }

        return NextResponse.json({
            token: paytrData.token,
            iframeUrl: `${PAYTR_CONFIG.IFRAME_BASE_URL}/${paytrData.token}`,
            merchantOid,
            originalAmountTL,
            discountAmountTL,
            finalAmountTL,
            discountApplied: discountAmountTL > 0,
            billingCycle,
        });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[create-checkout] Unhandled exception:", msg);
            return NextResponse.json({ error: "Ödeme başlatılamadı", detail: msg }, { status: 500 });
        }
    },
    { requiredRole: "ADMIN_OR_SUPER" }
);
