/**
 * POST /api/booking/lookup
 * Public endpoint — online randevu akışında telefon ile hasta adını arar.
 * Auth gerektirmez; sadece is_online_booking_enabled klinikler için çalışır.
 * Sadece full_name döndürür (PII minimumu).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { rateLimit } from "@/lib/rate-limit";

// Her IP 1 dakikada en fazla 10 lookup yapabilir (hasta enumeration engeli)
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";

    const { allowed } = await rateLimit(`booking_lookup:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
        return NextResponse.json({ found: false }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { clinicId, phone } = body as { clinicId?: string; phone?: string };

        if (!clinicId || !phone) {
            return NextResponse.json({ error: "clinicId and phone are required" }, { status: 400 });
        }

        // Klinik online booking aktif mi?
        const { data: settings } = await supabaseAdmin
            .from("clinic_settings")
            .select("is_online_booking_enabled")
            .eq("clinic_id", clinicId)
            .maybeSingle();

        if (!settings?.is_online_booking_enabled) {
            return NextResponse.json({ found: false });
        }

        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) {
            return NextResponse.json({ found: false });
        }

        const { data: patient } = await supabaseAdmin
            .from("patients")
            .select("full_name")
            .eq("clinic_id", clinicId)
            .or(`phone.eq.${digits},phone.eq.0${digits.slice(-10)},phone.eq.90${digits.slice(-10)}`)
            .maybeSingle();

        if (patient?.full_name) {
            return NextResponse.json({ found: true, fullName: patient.full_name });
        }

        return NextResponse.json({ found: false });
    } catch {
        return NextResponse.json({ found: false });
    }
}
