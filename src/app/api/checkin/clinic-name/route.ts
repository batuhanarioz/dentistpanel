/**
 * GET /api/checkin/clinic-name?slug=xxx
 * Check-in sayfasının klinik adını ve id'sini alması için.
 * Sadece id + name döndürür — PII içermez.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function GET(req: NextRequest) {
    const slug = new URL(req.url).searchParams.get("slug")?.trim();

    if (!slug) {
        return NextResponse.json({ error: "slug gereklidir." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("clinics")
        .select("id, name")
        .eq("slug", slug)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Klinik bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ id: data.id, name: data.name });
}
