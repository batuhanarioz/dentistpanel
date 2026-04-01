import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { rateLimit } from "@/lib/rate-limit";

// Güvenlik: Her IP adresi 15 dakika içinde en fazla 10 kod denemesi yapabilir.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    // IP bazlı rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";

    const { allowed, remaining, resetAt } = rateLimit(
        `checkin_verify:${ip}`,
        RATE_LIMIT,
        RATE_WINDOW_MS
    );

    if (!allowed) {
        return NextResponse.json(
            { error: "Çok fazla deneme. Lütfen personelden yardım isteyin." },
            {
                status: 429,
                headers: {
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
                },
            }
        );
    }

    let body: { code?: string; slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const { code, slug } = body;

    if (!code || !slug || code.trim().length !== 4) {
        return NextResponse.json(
            { error: "Geçersiz kod veya klinik bilgisi." },
            { status: 400 }
        );
    }

    // Klinigi slug'dan bul
    const { data: clinic, error: clinicError } = await supabaseAdmin
        .from("clinics")
        .select("id, name")
        .eq("slug", slug)
        .single();

    if (clinicError || !clinic) {
        return NextResponse.json({ error: "Klinik bulunamadı." }, { status: 404 });
    }

    // Kodu doğrula: süresi dolmamış, kullanılmamış, ilgili kliniğe ait
    const { data: checkin, error: codeError } = await supabaseAdmin
        .from("checkin_codes")
        .select(`
            id,
            expires_at,
            used_at,
            appointments (
                id,
                starts_at,
                status,
                treatment_type,
                patients ( id, full_name ),
                users ( full_name )
            )
        `)
        .eq("clinic_id", clinic.id)
        .eq("code", code.trim())
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .single();

    if (codeError || !checkin) {
        return NextResponse.json(
            { error: "Geçersiz veya süresi dolmuş kod." },
            {
                status: 401,
                headers: { "X-RateLimit-Remaining": String(remaining) },
            }
        );
    }

    const appt = checkin.appointments as unknown as { 
        id: string; 
        status: string; 
        starts_at: string; 
        treatment_type: string | null; 
        patients: { id: string; full_name: string | null } | null; 
        users: { full_name: string | null } | null;
    };

    // Randevu durumu geçerli mi? (iptal/tamamlanmış randevular için check-in yapılamaz)
    const blockedStatuses = ["cancelled", "completed", "no_show"];
    if (blockedStatuses.includes(appt?.status)) {
        return NextResponse.json(
            { error: "Bu randevu için check-in yapılamaz." },
            { status: 409 }
        );
    }

    // Kodu kullanıldı olarak işaretle
    await supabaseAdmin
        .from("checkin_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", checkin.id);

    // Sadece gerekli alanları döndür (tüm hasta verisini değil)
    return NextResponse.json({
        appointmentId: appt.id,
        patientId: appt.patients?.id,
        patientName: appt.patients?.full_name ?? "Bilinmiyor",
        doctorName: appt.users?.full_name ?? null,
        appointmentTime: appt.starts_at
            ? new Date(appt.starts_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Istanbul",
              })
            : "--:--",
        treatmentType: appt.treatment_type ?? null,
    });
}
