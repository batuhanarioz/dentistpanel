import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { rateLimit } from "@/lib/rate-limit";

// Güvenlik: Her IP adresi 1 dakika içinde en fazla 5 telefon araması yapabilir.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";

    const { allowed } = rateLimit(
        `checkin_search:${ip}`,
        RATE_LIMIT,
        RATE_WINDOW_MS
    );

    if (!allowed) {
        return NextResponse.json(
            { error: "Çok fazla arama yapıldı. Lütfen biraz bekleyiniz." },
            { status: 429 }
        );
    }

    let body: { phone?: string; slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const { phone, slug } = body;

    if (!phone || !slug) {
        return NextResponse.json({ error: "Telefon veya klinik bilgisi eksik." }, { status: 400 });
    }

    // Telefon normalize: sadece rakam, baştaki 0 kaldır
    const searchPhone = phone.replace(/\D/g, "").replace(/^0/, "");

    if (searchPhone.length < 10) {
        return NextResponse.json({ error: "Geçerli bir telefon numarası giriniz." }, { status: 400 });
    }

    // Klinik kontrolü
    const { data: clinic, error: clinicError } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .eq("slug", slug)
        .single();

    if (clinicError || !clinic) {
        return NextResponse.json({ error: "Klinik bulunamadı." }, { status: 404 });
    }

    // İstanbul saatine göre bugünün başlangıcı ve sonu (+03:00)
    const now = new Date();
    const istanbulOffset = 3 * 60; // dakika
    const localNow = new Date(now.getTime() + (istanbulOffset + now.getTimezoneOffset()) * 60 * 1000);
    const todayStr = localNow.toISOString().split("T")[0];
    const startOfDay = `${todayStr}T00:00:00+03:00`;
    const endOfDay = `${todayStr}T23:59:59+03:00`;

    const { data, error } = await supabaseAdmin
        .from("appointments")
        .select(`
            id,
            starts_at,
            treatment_type,
            status,
            patients!inner ( id, full_name ),
            users ( full_name )
        `)
        .eq("clinic_id", clinic.id)
        .gte("starts_at", startOfDay)
        .lte("starts_at", endOfDay)
        .not("status", "in", '("cancelled","completed","no_show")')
        .ilike("patients.phone", `%${searchPhone}%`);

    if (error) {
        console.error("Checkin search error:", error);
        return NextResponse.json({ error: "Arama sırasında hata oluştu." }, { status: 500 });
    }

    // Sadece gerekli minimum alanları döndür
    const results = (data ?? []).map((a: any) => ({
        id: a.id,
        patientId: a.patients?.id,
        patientName: a.patients?.full_name ?? "Bilinmiyor",
        doctorName: a.users?.full_name ?? null,
        appointmentTime: a.starts_at
            ? new Date(a.starts_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Istanbul",
              })
            : "--:--",
        treatmentType: a.treatment_type ?? null,
    }));

    return NextResponse.json({ appointments: results });
}
