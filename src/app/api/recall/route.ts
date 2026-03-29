/**
 * GET /api/recall
 *
 * Klininin recall kuyruğunu döner.
 * Query: ?status=pending|contacted|booked|dismissed (default: pending)
 *        ?all=1  →  tüm statusler
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

const VALID_STATUSES = ["pending", "contacted", "booked", "dismissed"] as const;

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "1";
    const statusParam = url.searchParams.get("status") ?? "pending";

    const patientId = url.searchParams.get("patient_id");

    let query = supabaseAdmin
        .from("recall_queue")
        .select("*, patients(id, full_name, phone)")
        .eq("clinic_id", ctx.clinicId)
        .order("recall_due_at", { ascending: true });

    if (patientId) {
        query = query.eq("patient_id", patientId);
    } else if (!all) {
        if (!VALID_STATUSES.includes(statusParam as typeof VALID_STATUSES[number])) {
            return NextResponse.json({ error: "Geçersiz statü" }, { status: 400 });
        }
        query = query.eq("status", statusParam);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
});
