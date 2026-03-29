/**
 * PATCH /api/lab-jobs/[id]  — statü veya bilgi güncelle
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { LAB_JOB_TRANSITIONS, LabJobStatus } from "@/types/database";

const VALID_STATUSES = ["sent", "in_progress", "try_in", "received", "cancelled"] as const;

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const id = req.url.split("/lab-jobs/")[1]?.split("?")[0];
    const body = await req.json() as {
        status?: string;
        lab_name?: string;
        job_type?: string;
        shade?: string | null;
        tooth_numbers?: string | null;
        notes?: string | null;
        expected_at?: string;
        received_at?: string | null;
    };

    // Klinik sahipliği doğrula
    const { data: existing } = await supabaseAdmin
        .from("lab_jobs")
        .select("id, clinic_id, status")
        .eq("id", id)
        .eq("clinic_id", ctx.clinicId)
        .maybeSingle();

    if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
            return NextResponse.json({ error: "Geçersiz statü" }, { status: 400 });
        }

        const currentStatus = existing.status as LabJobStatus;
        const newStatus = body.status as LabJobStatus;

        // Durum geçiş kuralları — ADMIN bypass yapabilir
        const allowed = LAB_JOB_TRANSITIONS[currentStatus];
        if (allowed.length > 0 && !allowed.includes(newStatus) && !ctx.isAdmin) {
            return NextResponse.json({
                error: `'${currentStatus}' durumundan '${newStatus}' durumuna geçiş yapılamaz.`,
            }, { status: 422 });
        }

        updates.status = newStatus;
        if (newStatus === "received") {
            updates.received_at = body.received_at
                ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
        }
    }
    if (body.lab_name !== undefined)      updates.lab_name      = body.lab_name.trim();
    if (body.job_type !== undefined)      updates.job_type      = body.job_type.trim();
    if (body.shade !== undefined)         updates.shade         = body.shade?.trim() || null;
    if (body.tooth_numbers !== undefined) updates.tooth_numbers = body.tooth_numbers?.trim() || null;
    if (body.notes !== undefined)         updates.notes         = body.notes?.trim() || null;
    if (body.expected_at !== undefined)   updates.expected_at   = body.expected_at;
    if (body.received_at !== undefined)   updates.received_at   = body.received_at;

    const { data, error } = await supabaseAdmin
        .from("lab_jobs")
        .update(updates)
        .eq("id", id)
        .select(`*, patients(id, full_name, phone), appointments(id, starts_at, treatment_type)`)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Statü değiştiyse audit log
    if (body.status !== undefined && body.status !== existing.status) {
        try {
            await supabaseAdmin.from("audit_logs").insert({
                clinic_id: ctx.clinicId,
                user_id: ctx.user.id,
                action: "UPDATE",
                entity_type: "lab_job",
                entity_id: id,
                old_data: { status: existing.status },
                new_data: { status: body.status },
            });
        } catch (auditErr) {
            console.warn("[lab-jobs/patch] audit log failed:", auditErr);
        }
    }

    return NextResponse.json({ job: data });
});
