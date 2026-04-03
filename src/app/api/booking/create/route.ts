/**
 * POST /api/booking/create
 * Online randevu talebi oluşturur.
 * Server-side validasyon + rate limiting ile anon Supabase insert'in yerini alır.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 saat

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";

    const { allowed } = await rateLimit(`booking_create:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
        return NextResponse.json(
            { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyiniz." },
            { status: 429 }
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const {
        clinicId, fullName, phone, complaint,
        requestedAt, durationMinutes, doctorId, treatmentId, treatmentName,
    } = body as {
        clinicId?: string; fullName?: string; phone?: string; complaint?: string;
        requestedAt?: string; durationMinutes?: number;
        doctorId?: string | null; treatmentId?: string | null; treatmentName?: string | null;
    };

    // --- Validasyon ---
    if (!clinicId || !fullName || !phone || !complaint || !requestedAt) {
        return NextResponse.json({ error: "Zorunlu alanlar eksik." }, { status: 400 });
    }

    if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
        return NextResponse.json({ error: "Geçersiz ad soyad." }, { status: 400 });
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json({ error: "Geçersiz telefon numarası." }, { status: 400 });
    }

    if (typeof complaint !== "string" || complaint.trim().length < 1 || complaint.trim().length > 2000) {
        return NextResponse.json({ error: "Şikayet alanı geçersiz." }, { status: 400 });
    }

    // Tarih: geçmişte olamaz, 90 günden ileri olamaz
    const requestedDate = new Date(requestedAt);
    if (isNaN(requestedDate.getTime())) {
        return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
    }
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (requestedDate < now) {
        return NextResponse.json({ error: "Geçmiş tarihli randevu oluşturulamaz." }, { status: 400 });
    }
    if (requestedDate > maxFuture) {
        return NextResponse.json({ error: "90 günden ileri tarih seçilemez." }, { status: 400 });
    }

    // Klinik online booking aktif mi?
    const { data: settings } = await supabaseAdmin
        .from("clinic_settings")
        .select("is_online_booking_enabled")
        .eq("clinic_id", clinicId)
        .maybeSingle();

    if (!settings?.is_online_booking_enabled) {
        return NextResponse.json({ error: "Bu klinik online randevu kabul etmiyor." }, { status: 403 });
    }

    // KVKK rızasını kaydet
    await supabaseAdmin.from("patient_consents").insert({
        clinic_id: clinicId,
        consent_type: "kvkk_booking",
        phone: digits,
        ip_address: ip,
        user_agent: req.headers.get("user-agent") ?? null,
    });

    const { error: insertError } = await supabaseAdmin
        .from("online_booking_requests")
        .insert({
            clinic_id: clinicId,
            full_name: fullName.trim(),
            phone: digits,
            complaint: complaint.trim(),
            requested_at: requestedAt,
            duration_minutes: typeof durationMinutes === "number" ? durationMinutes : 30,
            doctor_id: doctorId ?? null,
            treatment_id: treatmentId ?? null,
            treatment_name: treatmentName ?? null,
            status: "pending",
        });

    if (insertError) {
        if (insertError.message?.includes("RATE_LIMIT")) {
            return NextResponse.json(
                { error: "Bu numaradan çok fazla talep gönderildi. Lütfen 1 saat bekleyin." },
                { status: 429 }
            );
        }
        console.error("[booking/create] insert error:", insertError.message);
        return NextResponse.json({ error: "Randevu oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
