/**
 * GET /api/recall/refresh
 *
 * Vercel Cron tarafından her gün saat 07:00 UTC (10:00 İstanbul) çağrılır.
 * Tüm aktif klinikleri tarayıp recall süresi dolan hastaları kuyruğa ekler.
 *
 * GÜVENLİK: CRON_SECRET header ile korunur — Vercel otomatik ekler.
 * Manuel test: Authorization: Bearer {CRON_SECRET} ile GET isteği at.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function GET(req: NextRequest) {
    // ── Güvenlik ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });

    const results = {
        clinicsProcessed: 0,
        itemsCreated: 0,
        errors: [] as string[],
    };

    // ── Aktif klinikleri çek ──────────────────────────────────────────────────
    const { data: clinics, error: clinicErr } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .in("subscription_status", ["active", "trial"]);

    if (clinicErr || !clinics?.length) {
        console.error("[Recall Refresh] Klinik hatası:", clinicErr);
        return NextResponse.json(results);
    }

    // ── Tüm klinikleri paralel işle ───────────────────────────────────────────
    const clinicResults = await Promise.allSettled(
        clinics.map(clinic => processClinic(clinic.id, today))
    );

    for (const result of clinicResults) {
        results.clinicsProcessed++;
        if (result.status === "fulfilled") {
            results.itemsCreated += result.value.created;
            if (result.value.error) results.errors.push(result.value.error);
        } else {
            const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
            results.errors.push(msg);
        }
    }

    console.log("[Recall Refresh] Tamamlandı:", results);
    return NextResponse.json(results);
}

async function processClinic(clinicId: string, today: string): Promise<{ created: number; error?: string }> {
    // 1. Bu kliniğin recall tanımlı tedavi türlerini al
    const { data: treatments } = await supabaseAdmin
        .from("treatment_definitions")
        .select("name, recall_interval_days")
        .eq("clinic_id", clinicId)
        .not("recall_interval_days", "is", null);

    if (!treatments?.length) return { created: 0 };

    // İsim → gün sayısı map'i (normalize edilmiş key)
    const treatmentMap = new Map<string, number>(
        treatments.map(t => [t.name.toLowerCase().trim(), t.recall_interval_days as number])
    );

    // 2. Completed randevuları bul (boş treatment_type hariç)
    const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("id, patient_id, treatment_type, starts_at")
        .eq("clinic_id", clinicId)
        .eq("status", "completed")
        .not("patient_id", "is", null)
        .not("treatment_type", "is", null)
        .neq("treatment_type", "");

    if (!appointments?.length) return { created: 0 };

    // Mevcut recall kayıtlarını al
    const { data: existingRecalls } = await supabaseAdmin
        .from("recall_queue")
        .select("appointment_id")
        .eq("clinic_id", clinicId);

    const existingSet = new Set((existingRecalls ?? []).map(r => r.appointment_id));

    // 3. Uygun randevuları filtrele — SADECE tam eşleşme (case-insensitive + trim)
    const toInsert: {
        clinic_id: string;
        patient_id: string;
        appointment_id: string;
        treatment_type: string;
        last_treatment_date: string;
        recall_due_at: string;
    }[] = [];

    for (const appt of appointments) {
        if (existingSet.has(appt.id)) continue;

        const treatmentKey = (appt.treatment_type as string).toLowerCase().trim();
        if (!treatmentKey) continue;

        // Tam eşleşme önce dene; yoksa tanım ismini içerip içermediğine bak (min 4 karakter)
        const days = treatmentMap.get(treatmentKey)
            ?? Array.from(treatmentMap.entries()).find(
                ([k]) => k.length >= 4 && treatmentKey === k
            )?.[1];

        if (!days) continue;

        // Tedavi tarihi (date only)
        const treatmentDate = (appt.starts_at as string).slice(0, 10);

        // recall_due_at = tedavi tarihi + interval gün
        const dueDate = new Date(treatmentDate);
        dueDate.setDate(dueDate.getDate() + days);
        const dueDateStr = dueDate.toLocaleDateString("sv-SE");

        // Sadece bugün veya geçmişte olan recall'ları ekle
        if (dueDateStr > today) continue;

        toInsert.push({
            clinic_id: clinicId,
            patient_id: appt.patient_id as string,
            appointment_id: appt.id,
            treatment_type: appt.treatment_type as string,
            last_treatment_date: treatmentDate,
            recall_due_at: dueDateStr,
        });
    }

    if (!toInsert.length) return { created: 0 };

    // 4. INSERT (ON CONFLICT DO NOTHING)
    const { error: insertErr, count } = await supabaseAdmin
        .from("recall_queue")
        .upsert(toInsert, { onConflict: "clinic_id,appointment_id", ignoreDuplicates: true })
        .select("id");

    if (insertErr) return { created: 0, error: `${clinicId}: ${insertErr.message}` };
    return { created: count ?? toInsert.length };
}
