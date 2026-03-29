/**
 * GET /api/lab-jobs/alarm-check?date=2026-03-29
 *
 * Verilen tarihteki randevuların hasta ID'lerini döner.
 * useLabAlerts hook'u bunu kullanarak "yarın randevusu var mı?" kontrolü yapar.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const date = new URL(req.url).searchParams.get("date")
        ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

    const dayStart = `${date}T00:00:00+03:00`;
    const dayEnd   = `${date}T23:59:59+03:00`;

    const { data } = await supabaseAdmin
        .from("appointments")
        .select("patient_id")
        .eq("clinic_id", ctx.clinicId)
        .not("patient_id", "is", null)
        .not("status", "in", '("cancelled","no_show")')
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd);

    const patientIds = [...new Set((data ?? []).map(a => a.patient_id).filter(Boolean))];
    return NextResponse.json({ patientIds });
});
