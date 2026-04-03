import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { rateLimit } from "@/lib/rate-limit";

// Güvenlik: Her IP 5 dakikada en fazla 3 kayıt yapabilir.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";

    const { allowed } = await rateLimit(
        `checkin_save:${ip}`,
        RATE_LIMIT,
        RATE_WINDOW_MS
    );

    if (!allowed) {
        return NextResponse.json(
            { error: "Çok fazla istek. Lütfen bekleyiniz." },
            { status: 429 }
        );
    }

    let body: {
        appointmentId?: string;
        slug?: string;
        anamnesisData?: Record<string, unknown>;
        skipAnamnesis?: boolean;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const { appointmentId, slug, anamnesisData, skipAnamnesis } = body;

    if (!appointmentId || !slug) {
        return NextResponse.json({ error: "Eksik bilgi." }, { status: 400 });
    }

    if (!skipAnamnesis && !anamnesisData) {
        return NextResponse.json({ error: "Eksik bilgi." }, { status: 400 });
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

    // Randevunun bu kliniğe ait olduğunu doğrula + hasta id'sini al
    const { data: appointment, error: apptError } = await supabaseAdmin
        .from("appointments")
        .select("id, patient_id, status")
        .eq("id", appointmentId)
        .eq("clinic_id", clinic.id)
        .single();

    if (apptError || !appointment) {
        return NextResponse.json(
            { error: "Randevu doğrulanamadı." },
            { status: 403 }
        );
    }

    // İptal/tamamlanmış randevular için kayıt engelle
    const blockedStatuses = ["cancelled", "completed", "no_show"];
    if (blockedStatuses.includes(appointment.status)) {
        return NextResponse.json(
            { error: "Bu randevu için anamnez kaydı yapılamaz." },
            { status: 409 }
        );
    }

    // KVKK rızasını kaydet (form doldurma veya atlama — her ikisi de KVKK onayından geçti)
    await supabaseAdmin.from("patient_consents").insert({
        clinic_id: clinic.id,
        patient_id: appointment.patient_id,
        consent_type: "kvkk_checkin",
        ip_address: ip,
        user_agent: req.headers.get("user-agent") ?? null,
    });

    // skipAnamnesis modunda sadece arrived status güncellemesi yap, anamneze dokunma
    if (skipAnamnesis) {
        await supabaseAdmin
            .from("appointments")
            .update({ status: "arrived" })
            .eq("id", appointmentId)
            .eq("status", "confirmed");
        return NextResponse.json({ success: true });
    }

    // Güvenli alan listesi — sadece izin verilen alanlar kaydedilir
    const ALLOWED_FIELDS = new Set([
        "systemic_conditions", "systemic_other",
        "current_medications", "uses_anticoagulants", "anticoagulant_name",
        "allergies_list", "allergies_other",
        "previous_surgeries",
        "is_pregnant", "pregnancy_month", "is_breastfeeding",
        "has_pacemaker", "has_prosthetic_joint", "had_organ_transplant",
        "dental_anxiety", "bad_anesthesia_history", "prolonged_bleeding_history",
        "smoking_status", "alcohol_status",
        "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
        "additional_notes",
    ]);

    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(anamnesisData!)) {
        if (ALLOWED_FIELDS.has(key)) {
            safeData[key] = value;
        }
    }

    const now = new Date().toISOString();

    const { error: saveError } = await supabaseAdmin
        .from("patient_anamnesis")
        .upsert(
            {
                ...safeData,
                patient_id: appointment.patient_id,
                clinic_id: clinic.id,
                filled_by: "PATIENT",
                filled_at: now,
                updated_at: now,
            },
            { onConflict: "patient_id" }
        );

    if (saveError) {
        console.error("Anamnesis save error:", saveError);
        return NextResponse.json(
            { error: "Kayıt sırasında hata oluştu." },
            { status: 500 }
        );
    }

    // Randevu durumunu 'arrived' olarak güncelle
    await supabaseAdmin
        .from("appointments")
        .update({ status: "arrived" })
        .eq("id", appointmentId)
        .eq("status", "confirmed"); // sadece confirmed olanı güncelle

    return NextResponse.json({ success: true });
}
