import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

/**
 * POST /api/assistant/dismiss
 * Body: { itemId: string }
 * Records a dismissed notification for the current user/clinic.
 */
export const POST = withAuth(
    async (req: NextRequest, ctx) => {
        if (!ctx.clinicId || !ctx.user?.id) {
            return NextResponse.json({ error: "Auth context missing" }, { status: 401 });
        }

        const { itemId } = await req.json();
        if (!itemId) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("assistant_dismissals")
            .upsert({
                clinic_id: ctx.clinicId,
                user_id: ctx.user.id,
                item_id: itemId,
                dismissed_at: new Date().toISOString()
            }, { onConflict: "clinic_id, user_id, item_id" });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }
);

/**
 * GET /api/assistant/dismiss
 * Returns the list of dismissed item IDs for the current user/clinic.
 */
export const GET = withAuth(
    async (req: NextRequest, ctx) => {
        if (!ctx.clinicId || !ctx.user?.id) {
            return NextResponse.json({ error: "Auth context missing" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from("assistant_dismissals")
            .select("item_id")
            .eq("clinic_id", ctx.clinicId)
            .eq("user_id", ctx.user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ dismissedIds: (data || []).map(d => d.item_id) });
    }
);

/**
 * DELETE /api/assistant/dismiss
 * Body: { itemId: string }
 * Removes a dismissal record for Undo.
 */
export const DELETE = withAuth(
    async (req: NextRequest, ctx) => {
        if (!ctx.clinicId || !ctx.user?.id) {
            return NextResponse.json({ error: "Auth context missing" }, { status: 401 });
        }

        const { itemId } = await req.json();
        if (!itemId) {
            return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("assistant_dismissals")
            .delete()
            .eq("clinic_id", ctx.clinicId)
            .eq("user_id", ctx.user.id)
            .eq("item_id", itemId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }
);
