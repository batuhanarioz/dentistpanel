/**
 * PATCH /api/treatment-library/[id]
 * Klinik için özel protokol notu kaydeder (upsert).
 * Sadece ADMIN ve DOKTOR erişebilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { UserRole } from "@/types/database";

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const role = ctx.role as UserRole;
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.DOKTOR];
    if (!allowedRoles.includes(role) && !ctx.isSuperAdmin) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Extract [id] from URL path
    const id = req.url.split("/treatment-library/")[1]?.split("?")[0];
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const body = await req.json();
    const notes: string = body.notes ?? "";

    const { error } = await supabaseAdmin
        .from("clinic_treatment_protocols")
        .upsert(
            {
                clinic_id: ctx.clinicId,
                treatment_library_id: id,
                custom_notes: notes,
                updated_at: new Date().toISOString(),
                updated_by: ctx.user.id,
            },
            { onConflict: "clinic_id,treatment_library_id" }
        );

    if (error) {
        console.error("[treatment-library PATCH] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
});
