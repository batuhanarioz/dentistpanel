/**
 * GET /api/treatment-library
 * Tüm tedavi kitaplığını döner; klinik override'ları merge edilir.
 * Tüm roller erişebilir.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import type { TreatmentLibraryItem } from "@/types/database";

export const GET = withAuth(async (_req, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // 1. Platform treatment library (tüm klinikler okur)
    const { data: library, error: libErr } = await supabaseAdmin
        .from("treatment_library")
        .select("id, name, category, protocol_notes, sort_order")
        .order("sort_order", { ascending: true });

    if (libErr) {
        console.error("[treatment-library GET] library error:", libErr);
        return NextResponse.json({ error: libErr.message }, { status: 500 });
    }

    // 2. Bu kliniğe ait override'lar
    const { data: overrides, error: ovErr } = await supabaseAdmin
        .from("clinic_treatment_protocols")
        .select("treatment_library_id, custom_notes")
        .eq("clinic_id", ctx.clinicId);

    if (ovErr) {
        console.error("[treatment-library GET] overrides error:", ovErr);
        return NextResponse.json({ error: ovErr.message }, { status: 500 });
    }

    // 3. Override map'i oluştur
    const overrideMap = new Map<string, string>(
        (overrides ?? []).map((o) => [o.treatment_library_id, o.custom_notes])
    );

    // 4. Merge
    const items: TreatmentLibraryItem[] = (library ?? []).map((item) => ({
        ...item,
        custom_notes: overrideMap.get(item.id) ?? null,
    }));

    return NextResponse.json({ items });
});
