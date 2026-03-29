/**
 * GET /api/daily-closing/history
 *
 * Kliniğin son N kapanış kaydını döner.
 * Query params:
 *   ?limit=30  (varsayılan 30, max 90)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(90, parseInt(url.searchParams.get("limit") ?? "30", 10));

    const { data, error } = await supabaseAdmin
        .from("daily_closings")
        .select(`
            id, closing_date, closed_at, payment_count,
            calc_nakit, calc_kart, calc_havale, calc_diger, calc_total,
            actual_nakit, actual_kart, actual_havale, actual_diger,
            diff_nakit, diff_kart, diff_havale, diff_diger, diff_total,
            notes, closed_by,
            users!daily_closings_closed_by_fkey(full_name)
        `)
        .eq("clinic_id", ctx.clinicId)
        .order("closing_date", { ascending: false })
        .limit(limit);

    if (error) {
        // Yabancı anahtar join hatası olursa users join'siz tekrar dene
        const { data: plain, error: e2 } = await supabaseAdmin
            .from("daily_closings")
            .select(`
                id, closing_date, closed_at, payment_count,
                calc_nakit, calc_kart, calc_havale, calc_diger, calc_total,
                actual_nakit, actual_kart, actual_havale, actual_diger,
                diff_nakit, diff_kart, diff_havale, diff_diger, diff_total,
                notes, closed_by
            `)
            .eq("clinic_id", ctx.clinicId)
            .order("closing_date", { ascending: false })
            .limit(limit);

        if (e2) {
            return NextResponse.json({ error: "Geçmiş alınamadı", detail: e2.message }, { status: 500 });
        }
        return NextResponse.json({ closings: plain ?? [] });
    }

    return NextResponse.json({ closings: data ?? [] });
});
