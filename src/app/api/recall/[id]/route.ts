/**
 * PATCH /api/recall/[id] — statü güncelle
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import type { RecallStatus } from "@/types/database";

const VALID_STATUSES: RecallStatus[] = ["pending", "contacted", "booked", "dismissed"];

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const id = req.url.split("/recall/")[1]?.split("?")[0];
    const body = await req.json() as { status?: RecallStatus; notes?: string };

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Geçersiz statü" }, { status: 400 });
    }

    // Klinik sahipliği doğrula
    const { data: existing } = await supabaseAdmin
        .from("recall_queue")
        .select("id, contact_attempts")
        .eq("id", id)
        .eq("clinic_id", ctx.clinicId)
        .maybeSingle();

    if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const updates: Record<string, unknown> = { status: body.status };
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.status === "contacted") {
        updates.contacted_at = new Date().toISOString();
        updates.contact_attempts = (existing.contact_attempts ?? 0) + 1;
    }

    const { data, error } = await supabaseAdmin
        .from("recall_queue")
        .update(updates)
        .eq("id", id)
        .select("*, patients(id, full_name, phone)")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
});
