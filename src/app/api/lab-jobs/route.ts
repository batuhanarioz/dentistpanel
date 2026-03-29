/**
 * GET  /api/lab-jobs          — kliniğin lab işlerini listele
 * POST /api/lab-jobs          — yeni lab işi oluştur
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

// ─── GET ──────────────────────────────────────────────────────────────────────
export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");         // filtre
    const patientId = url.searchParams.get("patient_id");  // hasta filtresi

    let query = supabaseAdmin
        .from("lab_jobs")
        .select(`
            *,
            patients ( id, full_name, phone ),
            appointments ( id, starts_at, treatment_type )
        `)
        .eq("clinic_id", ctx.clinicId)
        .order("expected_at", { ascending: true });

    if (status && status !== "all") {
        if (status === "active") {
            query = query.in("status", ["sent", "in_progress", "try_in"]);
        } else {
            query = query.eq("status", status);
        }
    }
    if (patientId) {
        query = query.eq("patient_id", patientId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ jobs: data ?? [] });
});

// ─── POST ─────────────────────────────────────────────────────────────────────
export const POST = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json() as {
        patient_id: string;
        appointment_id?: string | null;
        lab_name: string;
        job_type: string;
        shade?: string | null;
        tooth_numbers?: string | null;
        notes?: string | null;
        sent_at?: string;
        expected_at: string;
    };

    if (!body.patient_id || !body.lab_name || !body.job_type || !body.expected_at) {
        return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("lab_jobs")
        .insert({
            clinic_id:      ctx.clinicId,
            patient_id:     body.patient_id,
            appointment_id: body.appointment_id ?? null,
            lab_name:       body.lab_name.trim(),
            job_type:       body.job_type.trim(),
            shade:          body.shade?.trim() || null,
            tooth_numbers:  body.tooth_numbers?.trim() || null,
            notes:          body.notes?.trim() || null,
            sent_at:        body.sent_at ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" }),
            expected_at:    body.expected_at,
            status:         "sent",
            created_by:     ctx.user.id,
        })
        .select(`*, patients(id, full_name, phone), appointments(id, starts_at, treatment_type)`)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data }, { status: 201 });
});
