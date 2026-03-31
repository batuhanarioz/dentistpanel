/**
 * POST /api/subscription/validate-code
 *
 * İndirim veya referans kodunu doğrular.
 * Önce discount_codes tablosunu, bulamazsa clinics.referral_code'u kontrol eder.
 *
 * Body: { code: string, billingCycle: "monthly" | "annual" }
 *
 * Response — indirim kodu (başarılı):
 * { valid: true, type: "discount", codeId, code, discountType, discountValue,
 *   isRecurring, originalAmount, discountAmount, finalAmount, message }
 *
 * Response — referans kodu (başarılı):
 * { valid: true, type: "referral", referrerClinicId, referrerClinicName, message }
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import type { BillingCycle } from "@/lib/paytr";

export const POST = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) {
        return NextResponse.json({ valid: false, error: "Klinik bulunamadı" }, { status: 403 });
    }

    const body = await req.json() as { code?: string; billingCycle?: BillingCycle };
    const code = (body.code ?? "").trim().toUpperCase();
    const billingCycle: BillingCycle = body.billingCycle === "monthly" ? "monthly" : "annual";

    if (!code) {
        return NextResponse.json({ valid: false, error: "Kod boş olamaz" });
    }

    // ── 1. Kodu bul ──────────────────────────────────────────────────────────
    const { data: discount } = await supabaseAdmin
        .from("discount_codes")
        .select("id, code, discount_type, discount_value, applies_to, is_recurring, max_uses, used_count, valid_from, valid_until, is_active")
        .eq("code", code)
        .maybeSingle();

    if (!discount) {
        // ── İndirim kodu bulunamadı → referans kodu kontrol et ───────────────
        const { data: referrer } = await supabaseAdmin
            .from("clinics")
            .select("id, name")
            .eq("referral_code", code)
            .eq("referral_code_active", true)
            .maybeSingle();

        if (!referrer) {
            return NextResponse.json({ valid: false, error: "Geçersiz kod" });
        }

        // Kendi kodunu kullanıyor mu?
        if (referrer.id === ctx.clinicId) {
            return NextResponse.json({ valid: false, error: "Kendi referans kodunuzu kullanamazsınız" });
        }

        // Bu klinik zaten bir referans koduyla ilişkilendirilmiş mi?
        const { data: thisClinic } = await supabaseAdmin
            .from("clinics")
            .select("referred_by")
            .eq("id", ctx.clinicId)
            .single();

        if (thisClinic?.referred_by) {
            return NextResponse.json({ valid: false, error: "Hesabınız zaten bir referans koduyla ilişkilendirilmiş" });
        }

        return NextResponse.json({
            valid: true,
            type: "referral",
            referrerClinicId: referrer.id,
            referrerClinicName: referrer.name,
            message: `${referrer.name} tarafından davet edildiniz`,
        });
    }

    // ── 2. Aktif mi? ─────────────────────────────────────────────────────────
    if (!discount.is_active) {
        return NextResponse.json({ valid: false, error: "Bu indirim kodu artık geçerli değil" });
    }

    // ── 3. Tarih kontrolü ────────────────────────────────────────────────────
    const now = new Date();
    if (discount.valid_from && new Date(discount.valid_from) > now) {
        return NextResponse.json({ valid: false, error: "Bu indirim kodu henüz aktif değil" });
    }
    if (discount.valid_until && new Date(discount.valid_until) < now) {
        return NextResponse.json({ valid: false, error: "Bu indirim kodunun süresi dolmuş" });
    }

    // ── 4. Plan uyumluluğu ───────────────────────────────────────────────────
    if (discount.applies_to !== "both" && discount.applies_to !== billingCycle) {
        const planLabel = billingCycle === "monthly" ? "aylık" : "yıllık";
        const targetLabel = discount.applies_to === "monthly" ? "aylık" : "yıllık";
        return NextResponse.json({
            valid: false,
            error: `Bu kod yalnızca ${targetLabel} plan için geçerlidir (seçilen: ${planLabel})`,
        });
    }

    // ── 5. Kullanım limiti ───────────────────────────────────────────────────
    if (discount.max_uses !== null && discount.used_count >= discount.max_uses) {
        return NextResponse.json({ valid: false, error: "Bu indirim kodunun kullanım limiti dolmuştur" });
    }

    // ── 6. Tek seferlik modda bu klinik daha önce kullandı mı? ───────────────
    if (!discount.is_recurring) {
        const { count } = await supabaseAdmin
            .from("discount_code_uses")
            .select("id", { count: "exact", head: true })
            .eq("code_id", discount.id)
            .eq("clinic_id", ctx.clinicId);

        if ((count ?? 0) > 0) {
            return NextResponse.json({ valid: false, error: "Bu kodu daha önce kullandınız" });
        }
    }

    // ── 7. Güncel fiyatları platform_settings'ten al ─────────────────────────
    const { data: settings } = await supabaseAdmin
        .from("platform_settings")
        .select("monthly_price, annual_price")
        .eq("id", "global")
        .single();

    const originalAmount = billingCycle === "annual"
        ? (settings?.annual_price ?? 14990)
        : (settings?.monthly_price ?? 1499);

    // ── 8. İndirim hesapla ───────────────────────────────────────────────────
    let discountAmount: number;
    if (discount.discount_type === "percent") {
        discountAmount = Math.round((originalAmount * discount.discount_value) / 100 * 100) / 100;
    } else {
        discountAmount = Math.min(discount.discount_value, originalAmount - 1); // min 1₺ kalır
    }
    const finalAmount = Math.max(originalAmount - discountAmount, 1);

    // ── 9. Mesaj oluştur ─────────────────────────────────────────────────────
    const discountLabel = discount.discount_type === "percent"
        ? `%${discount.discount_value}`
        : `${discount.discount_value.toLocaleString("tr-TR")} ₺`;
    const recurringNote = discount.is_recurring ? " (her dönem geçerli)" : " (ilk ödeme)";
    const message = `${discountLabel} indirim uygulandı${recurringNote}`;

    return NextResponse.json({
        valid: true,
        type: "discount",
        codeId: discount.id,
        code: discount.code,
        discountType: discount.discount_type,
        discountValue: discount.discount_value,
        isRecurring: discount.is_recurring,
        originalAmount,
        discountAmount,
        finalAmount,
        message,
    });
});
