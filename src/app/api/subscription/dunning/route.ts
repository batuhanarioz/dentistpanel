/**
 * GET /api/subscription/dunning
 *
 * Vercel Cron tarafından her gün saat 09:00 (TR saati, 06:00 UTC) çağrılır.
 * Tüm past_due ve restricted klinikleri tarar, retry/kısıtlama/iptal işlemi uygular.
 *
 * GÜVENLİK: CRON_SECRET header ile korunur — Vercel otomatik ekler.
 *
 * Manuel test: Authorization: Bearer {CRON_SECRET} ile GET isteği at.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import {
    getDunningAction,
    canRetryNow,
} from "@/lib/dunning";
import {
    calculatePeriodEnd,
    type BillingCycle,
} from "@/lib/paytr";

export async function GET(req: NextRequest) {
    // ── Güvenlik: Vercel Cron Secret doğrula ─────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const results = {
        processed: 0,
        retried: 0,
        restricted: 0,
        canceled: 0,
        skipped: 0,
        errors: [] as string[],
    };

    // ── Past_due ve restricted klinikleri çek ─────────────────────────────────
    const { data: clinics, error } = await supabaseAdmin
        .from("clinics")
        .select("id, name, slug, phone, billing_cycle, dunning_started_at, retry_count, last_retry_at, subscription_status")
        .in("subscription_status", ["past_due", "restricted"]);

    if (error) {
        console.error("[Dunning] Klinik çekme hatası:", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!clinics || clinics.length === 0) {
        return NextResponse.json({ message: "İşlenecek klinik yok", ...results });
    }

    // ── Her klinik için dunning aksiyonu uygula ───────────────────────────────
    for (const clinic of clinics) {
        results.processed++;

        if (!clinic.dunning_started_at) {
            results.skipped++;
            continue;
        }

        const action = getDunningAction(clinic.dunning_started_at, clinic.retry_count ?? 0);

        try {
            if (action.type === "skip") {
                results.skipped++;
                continue;
            }

            if (action.type === "retry") {
                if (!canRetryNow(clinic.last_retry_at)) {
                    results.skipped++;
                    continue;
                }

                const success = await attemptRetryCharge(
                    clinic.id,
                    clinic.billing_cycle as BillingCycle
                );

                if (success) {
                    // Ödeme başarılı → aboneliği normale al
                    const periodEnd = calculatePeriodEnd(clinic.billing_cycle as BillingCycle);
                    await Promise.all([
                        supabaseAdmin.from("clinics").update({
                            subscription_status: "active",
                            dunning_started_at: null,
                            retry_count: 0,
                            last_retry_at: null,
                            current_period_end: periodEnd.toISOString(),
                            last_payment_date: new Date().toISOString(),
                        }).eq("id", clinic.id),

                        logDunningEvent(clinic.id, "retry_succeeded", {
                            daysOverdue: getDaysOverdue(clinic.dunning_started_at),
                            retryCount: (clinic.retry_count ?? 0) + 1,
                        }),
                    ]);

                    results.retried++;
                } else {
                    // Retry başarısız → sayacı artır, DB'ye logla
                    // Platform admin activity sayfasında WhatsApp butonu ile manuel bildirim yapabilir
                    await Promise.all([
                        supabaseAdmin.from("clinics").update({
                            retry_count: (clinic.retry_count ?? 0) + 1,
                            last_retry_at: new Date().toISOString(),
                        }).eq("id", clinic.id),

                        logDunningEvent(clinic.id, "retry_failed", {
                            daysOverdue: getDaysOverdue(clinic.dunning_started_at),
                            retryCount: (clinic.retry_count ?? 0) + 1,
                        }),
                    ]);
                }
            }

            if (action.type === "restrict" && clinic.subscription_status !== "restricted") {
                await Promise.all([
                    supabaseAdmin.from("clinics")
                        .update({ subscription_status: "restricted" })
                        .eq("id", clinic.id),

                    logDunningEvent(clinic.id, "access_restricted", {
                        daysOverdue: getDaysOverdue(clinic.dunning_started_at),
                    }),
                ]);

                results.restricted++;
            }

            if (action.type === "cancel") {
                await Promise.all([
                    supabaseAdmin.from("clinics")
                        .update({
                            subscription_status: "canceled",
                            dunning_started_at: null,
                        })
                        .eq("id", clinic.id),

                    logDunningEvent(clinic.id, "subscription_canceled", {
                        daysOverdue: getDaysOverdue(clinic.dunning_started_at),
                    }),
                ]);

                results.canceled++;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Dunning] Klinik hatası (${clinic.id}):`, msg);
            results.errors.push(`${clinic.id}: ${msg}`);
        }
    }

    console.log("[Dunning] Tamamlandı:", results);
    return NextResponse.json(results);
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/**
 * PayTR direct (server-to-server) retry charge.
 * Kayıtlı kart token'ı ile yeni ücretlendirme dener.
 *
 * ⚠️  DEVRE DIŞI: PayTR recurring-charge endpoint'i ve hash algoritması
 *     dokümantasyon alındıktan sonra doldurulacak.
 *     Şu an her zaman false döndürür → dunning sadece bildirim + durum
 *     güncellemesi yapar, otomatik kart çekimi yapmaz.
 *
 * Dokümantasyon gelince implement edilecekler:
 *   1. PAYTR_CONFIG.RECURRING_CHARGE_URL — gerçek endpoint
 *   2. generateRetryHash(params) — src/lib/paytr.ts'e eklenecek
 *   3. paytr_token parametresi formBody'ye eklenecek
 */
async function attemptRetryCharge(
    clinicId: string,
    billingCycle: BillingCycle
): Promise<boolean> {
    // TODO: PayTR dokümantasyonu alınınca aşağıdaki bloğu aç ve implement et
    console.warn(`[Dunning Retry] Otomatik kart çekimi henüz aktif değil — klinik: ${clinicId}, dönem: ${billingCycle}`);
    void clinicId; void billingCycle; // unused until implemented
    return false;

    /* ── Gerçek implementasyon (doküman gelince açılacak) ────────────────────
    const { data: lastOrder } = await supabaseAdmin
        .from("paytr_orders")
        .select("merchant_oid, amount_tl")
        .eq("clinic_id", clinicId)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!lastOrder) return false;

    const newMerchantOid = generateOrderId(clinicId);
    await supabaseAdmin.from("paytr_orders").insert({
        merchant_oid: newMerchantOid,
        clinic_id: clinicId,
        billing_cycle: billingCycle,
        amount_tl: lastOrder.amount_tl,
        status: "pending",
    });

    const formBody = new URLSearchParams({
        merchant_id: PAYTR_CONFIG.MERCHANT_ID,
        merchant_oid: lastOrder.merchant_oid,
        new_merchant_oid: newMerchantOid,
        payment_amount: tlToKurus(lastOrder.amount_tl),
        currency: "TL",
        test_mode: PAYTR_CONFIG.TEST_MODE,
        ...getRecurringParams(billingCycle),
        paytr_token: generateRetryHash(...), // TODO: implement
    }).toString();

    const res = await fetch(PAYTR_CONFIG.RECURRING_CHARGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
    });
    const data = await res.json() as { status: string };
    const success = data.status === "success";

    await supabaseAdmin.from("paytr_orders")
        .update({ status: success ? "paid" : "failed", ...(success ? { paid_at: new Date().toISOString() } : {}) })
        .eq("merchant_oid", newMerchantOid);

    return success;
    ─────────────────────────────────────────────────────────────────────────── */
}


async function logDunningEvent(
    clinicId: string,
    eventType: string,
    extra: {
        daysOverdue?: number;
        retryCount?: number;
        merchantOid?: string;
        notes?: string;
        whatsappSent?: boolean;
    } = {}
): Promise<void> {
    await supabaseAdmin.from("dunning_events").insert({
        clinic_id: clinicId,
        event_type: eventType,
        days_overdue: extra.daysOverdue ?? null,
        retry_count: extra.retryCount ?? null,
        merchant_oid: extra.merchantOid ?? null,
        notes: extra.notes ?? null,
        whatsapp_sent: extra.whatsappSent ?? false,
    });
}

function getDaysOverdue(dunningStartedAt: string): number {
    return Math.floor(
        (Date.now() - new Date(dunningStartedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
}
