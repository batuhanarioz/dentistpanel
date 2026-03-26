import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const GET = withAuth(async (_req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "no clinic" }, { status: 400 });

    const { data: clinic } = await supabaseAdmin
        .from("clinics")
        .select("referral_code")
        .eq("id", ctx.clinicId)
        .single();

    const { data: conversions } = await supabaseAdmin
        .from("referral_conversions")
        .select("id, status, created_at, converted_at")
        .eq("referrer_clinic_id", ctx.clinicId);

    return NextResponse.json({
        referral_code: clinic?.referral_code ?? null,
        total: conversions?.length ?? 0,
        converted: conversions?.filter((c) => c.status === "converted" || c.status === "rewarded").length ?? 0,
        rewarded: conversions?.filter((c) => c.status === "rewarded").length ?? 0,
    });
});
