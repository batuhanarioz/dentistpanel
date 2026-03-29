/**
 * GET /api/daily-closing/summary
 *
 * O günün (Istanbul saati) ödendi durumundaki tahsilatlarını
 * ödeme yöntemine göre gruplandırarak döner.
 * Varsa o güne ait mevcut kapanış kaydını da ekler.
 *
 * Query param: ?date=2026-03-27  (yoksa bugün)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { istanbulOffset, methodToGroup, canCloseDay } from "@/lib/closing-utils";

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Rol kontrolü
    if (!(await canCloseDay(ctx.clinicId, ctx.role))) {
        return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }

    // Tarih parametresi — varsayılan: bugün (Istanbul)
    const paramDate = new URL(req.url).searchParams.get("date");
    const closingDate = paramDate ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

    // Aralık: o günün 00:00 – 23:59:59 Istanbul saatiyle (DST-aware)
    const tz = istanbulOffset(closingDate);
    const dayStart = `${closingDate}T00:00:00${tz}`;
    const dayEnd   = `${closingDate}T23:59:59${tz}`;

    // Paralel sorgular
    const [paymentsRes, closingRes] = await Promise.all([
        supabaseAdmin
            .from("payments")
            .select("id, amount, method, patient_id, patients(full_name), receipt_number, created_at")
            .eq("clinic_id", ctx.clinicId)
            .eq("status", "paid")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd)
            .order("created_at", { ascending: false }),

        supabaseAdmin
            .from("daily_closings")
            .select("*, users!daily_closings_closed_by_fkey(full_name)")
            .eq("clinic_id", ctx.clinicId)
            .eq("closing_date", closingDate)
            .maybeSingle(),
    ]);

    const payments = paymentsRes.data ?? [];

    // Gruplama
    const summary = { nakit: 0, kart: 0, havale: 0, diger: 0 };
    for (const p of payments) {
        const group = methodToGroup(p.method);
        summary[group] += Number(p.amount ?? 0);
    }
    const total = summary.nakit + summary.kart + summary.havale + summary.diger;

    return NextResponse.json({
        date: closingDate,
        summary: { ...summary, total },
        payment_count: payments.length,
        payments,
        existing_closing: closingRes.data ?? null,
    });
});
