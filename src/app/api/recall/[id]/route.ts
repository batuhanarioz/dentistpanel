/**
 * PATCH /api/recall/[id]
 * Body: { status: RecallStatus, notes?: string }
 * status = "contacted" → contacted_at ve contact_attempts otomatik güncellenir
 *
 * Tüm klinik personeli kendi kliniğinin recall kayıtlarını güncelleyebilir.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

const VALID_STATUSES = ["pending", "contacted", "booked", "dismissed"] as const;
type RecallStatus = typeof VALID_STATUSES[number];

export const PATCH = withAuth(
    async (req: NextRequest, ctx) => {
        if (!ctx.clinicId) {
            return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
        }

        const segments = req.nextUrl.pathname.split("/");
        const id = segments[segments.length - 1];

        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
            return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
        }

        let body: { status?: string; notes?: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
        }

        const { status, notes } = body;

        if (!status || !VALID_STATUSES.includes(status as RecallStatus)) {
            return NextResponse.json(
                { error: `Geçersiz status. Geçerli değerler: ${VALID_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }

        // Yalnızca klinik kendi kaydını güncelleyebilir
        const { data: existing } = await supabaseAdmin
            .from("recall_queue")
            .select("id, clinic_id, contact_attempts")
            .eq("id", id)
            .maybeSingle();

        if (!existing || existing.clinic_id !== ctx.clinicId) {
            return NextResponse.json({ error: "Kayıt bulunamadı veya yetkiniz yok" }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (notes !== undefined) updateData.notes = notes;

        if (status === "contacted") {
            updateData.contacted_at = new Date().toISOString();
            updateData.contact_attempts = (existing.contact_attempts ?? 0) + 1;
        }

        const { data, error } = await supabaseAdmin
            .from("recall_queue")
            .update(updateData)
            .eq("id", id)
            .select("*, patients(id, full_name, phone)")
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ error: error?.message ?? "Güncelleme başarısız" }, { status: 400 });
        }

        return NextResponse.json({ item: data });
    }
);
