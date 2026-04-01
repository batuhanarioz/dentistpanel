/**
 * GET /api/recall
 * Query params:
 *   ?all=1           → tüm statusleri döner (communication page)
 *   ?patient_id=xxx  → belirli hastanın recall geçmişi
 *
 * Tüm klinik personeli erişebilir (requiredRole yok = sadece auth kontrolü).
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export const GET = withAuth(
    async (req: NextRequest, ctx) => {
        if (!ctx.clinicId) {
            return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const all = searchParams.get("all") === "1";
        const patientId = searchParams.get("patient_id");

        let query = supabaseAdmin
            .from("recall_queue")
            .select("*, patients(id, full_name, phone)")
            .eq("clinic_id", ctx.clinicId)
            .order("recall_due_at", { ascending: true });

        if (patientId) {
            query = query.eq("patient_id", patientId);
        } else if (!all) {
            query = query.eq("status", "pending");
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ items: data ?? [] });
    }
);
