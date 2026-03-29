/**
 * POST /api/daily-closing/close
 *
 * Gün sonu kasa kapatma kaydı oluşturur.
 * Aynı tarihte ikinci kez çağrılırsa var olan kaydı günceller (idempotent).
 *
 * Body: {
 *   closing_date: "2026-03-27",
 *   actual_nakit: number,
 *   actual_kart: number,
 *   actual_havale: number,
 *   actual_diger: number,
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { istanbulOffset, methodToGroup, canCloseDay } from "@/lib/closing-utils";

export const POST = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Rol kontrolü
    if (!(await canCloseDay(ctx.clinicId, ctx.role))) {
        return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }

    const body = await req.json() as {
        closing_date?: string;
        actual_nakit?: number;
        actual_kart?: number;
        actual_havale?: number;
        actual_diger?: number;
        notes?: string;
    };

    const closingDate = body.closing_date
        ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

    const r2 = (n: number) => Math.round(n * 100) / 100;
    const actual_nakit  = r2(Number(body.actual_nakit  ?? 0));
    const actual_kart   = r2(Number(body.actual_kart   ?? 0));
    const actual_havale = r2(Number(body.actual_havale ?? 0));
    const actual_diger  = r2(Number(body.actual_diger  ?? 0));

    // Sistem hesabı — o günün ödendi kayıtları (DST-aware)
    const tz = istanbulOffset(closingDate);
    const dayStart = `${closingDate}T00:00:00${tz}`;
    const dayEnd   = `${closingDate}T23:59:59${tz}`;

    const { data: payments } = await supabaseAdmin
        .from("payments")
        .select("amount, method")
        .eq("clinic_id", ctx.clinicId)
        .eq("status", "paid")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

    const calc = { nakit: 0, kart: 0, havale: 0, diger: 0 };
    for (const p of payments ?? []) {
        calc[methodToGroup(p.method)] += Number(p.amount ?? 0);
    }
    // Her grubu 2 ondalık basamağa yuvarlayarak floating-point birikimini önle
    calc.nakit  = r2(calc.nakit);
    calc.kart   = r2(calc.kart);
    calc.havale = r2(calc.havale);
    calc.diger  = r2(calc.diger);
    const calc_total = r2(calc.nakit + calc.kart + calc.havale + calc.diger);

    const diff_nakit  = r2(actual_nakit  - calc.nakit);
    const diff_kart   = r2(actual_kart   - calc.kart);
    const diff_havale = r2(actual_havale - calc.havale);
    const diff_diger  = r2(actual_diger  - calc.diger);
    const diff_total  = r2(diff_nakit + diff_kart + diff_havale + diff_diger);

    const record = {
        clinic_id:    ctx.clinicId,
        closing_date: closingDate,
        closed_by:    ctx.user.id,
        calc_nakit:   calc.nakit,
        calc_kart:    calc.kart,
        calc_havale:  calc.havale,
        calc_diger:   calc.diger,
        calc_total,
        payment_count: (payments ?? []).length,
        actual_nakit,
        actual_kart,
        actual_havale,
        actual_diger,
        diff_nakit,
        diff_kart,
        diff_havale,
        diff_diger,
        diff_total,
        notes:      body.notes?.trim() || null,
        closed_at:  new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
        .from("daily_closings")
        .upsert(record, { onConflict: "clinic_id,closing_date" })
        .select()
        .single();

    if (error) {
        console.error("[daily-closing/close]", error);
        return NextResponse.json({ error: "Kayıt oluşturulamadı", detail: error.message }, { status: 500 });
    }

    // Audit log — hata olursa sessizce geç, ana işlemi engelleme
    try {
        await supabaseAdmin.from("audit_logs").insert({
            clinic_id:   ctx.clinicId,
            user_id:     ctx.user.id,
            action:      "INSERT",
            entity_type: "daily_closing",
            entity_id:   data.id,
            old_data:    null,
            new_data:    {
                closing_date: closingDate,
                calc_total,
                actual_total: actual_nakit + actual_kart + actual_havale + actual_diger,
                diff_total,
                has_diff:     diff_total !== 0,
            },
        });
    } catch (auditErr) {
        console.warn("[daily-closing/close] audit log failed:", auditErr);
    }

    return NextResponse.json({ success: true, closing: data });
});
