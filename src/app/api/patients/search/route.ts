/**
 * GET /api/patients/search?q=ahmet
 * Hasta arama — lab modal ve diğer modal'lar tarafından kullanılır.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ patients: [] });

    const { data } = await supabaseAdmin
        .from("patients")
        .select("id, full_name, phone")
        .eq("clinic_id", ctx.clinicId)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .order("full_name")
        .limit(15);

    return NextResponse.json({ patients: data ?? [] });
});
