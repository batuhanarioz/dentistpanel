/**
 * POST /api/checkin/anamnesis
 * Randevuya ait hastanın anamnez verisini döndürür.
 * Anon key ile direkt Supabase sorgusu yerine bu endpoint kullanılır;
 * böylece patient_anamnesis tablosuna anon erişim kapatılabilir.
 *
 * Güvenlik: appointmentId + slug kombinasyonu doğrulanır;
 * randevu kliniğe ait değilse 403 döner.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function POST(req: NextRequest) {
    let body: { appointmentId?: string; slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const { appointmentId, slug } = body;

    if (!appointmentId || !slug) {
        return NextResponse.json({ error: "appointmentId ve slug gereklidir." }, { status: 400 });
    }

    // Klinik doğrula
    const { data: clinic, error: clinicError } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .eq("slug", slug)
        .single();

    if (clinicError || !clinic) {
        return NextResponse.json({ error: "Klinik bulunamadı." }, { status: 404 });
    }

    // Randevunun bu kliniğe ait olduğunu ve patient_id'yi doğrula
    const { data: appointment, error: apptError } = await supabaseAdmin
        .from("appointments")
        .select("id, patient_id, status")
        .eq("id", appointmentId)
        .eq("clinic_id", clinic.id)
        .single();

    if (apptError || !appointment) {
        return NextResponse.json({ error: "Randevu doğrulanamadı." }, { status: 403 });
    }

    // Anamnez verisini çek
    const { data: anamnesis } = await supabaseAdmin
        .from("patient_anamnesis")
        .select("*")
        .eq("patient_id", appointment.patient_id)
        .maybeSingle();

    return NextResponse.json({ anamnesis: anamnesis ?? null });
}
