import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

const MAX_REWARD_MONTHS = 12;

export const GET = withAuth(async (_req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "no clinic" }, { status: 400 });

    const [clinicRes, conversionsRes] = await Promise.all([
        supabaseAdmin
            .from("clinics")
            .select("referral_code, referral_code_active")
            .eq("id", ctx.clinicId)
            .single(),

        supabaseAdmin
            .from("referral_conversions")
            .select(`
                id,
                status,
                created_at,
                converted_at,
                referred_clinic:referred_clinic_id (
                    name
                )
            `)
            .eq("referrer_clinic_id", ctx.clinicId)
            .order("created_at", { ascending: false }),
    ]);

    const conversions = conversionsRes.data ?? [];

    const rewarded = conversions.filter((c) => c.status === "rewarded").length;
    const converted = conversions.filter(
        (c) => c.status === "converted" || c.status === "rewarded"
    ).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = conversions.map((c: any) => ({
        id: c.id,
        clinic_name: c.referred_clinic?.name ?? "Bilinmeyen Klinik",
        status: c.status as "pending" | "converted" | "rewarded",
        invited_at: c.created_at,
        converted_at: c.converted_at ?? null,
    }));

    return NextResponse.json({
        referral_code: clinicRes.data?.referral_code ?? null,
        referral_code_active: clinicRes.data?.referral_code_active ?? false,
        total: conversions.length,
        converted,
        rewarded,
        reward_months_remaining: Math.max(0, MAX_REWARD_MONTHS - rewarded),
        reward_limit: MAX_REWARD_MONTHS,
        list,
    });
});
