import { NextRequest, NextResponse } from "next/server";
import { webAppointmentSchema } from "@/lib/validations/appointment";

// Web randevu formu için API taslağı.
// Örn: Klinik web sitesindeki widget bu endpoint'e POST atar.

export async function POST(req: NextRequest) {
  const validation = webAppointmentSchema.safeParse(await req.json().catch(() => ({})));
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { } = validation.data;

  // Taslak akış:
  // 1) clinicSlug üzerinden ilgili clinic_id bulunur
  // 2) Bu kliniğe ait (telefon numarasına göre) hasta var mı kontrol edilir, yoksa minimal hasta kaydı açılır
  // 3) appointments tablosuna status = 'pending', channel = 'web' ile kayıt atılır
  // 4) Resepsiyon için görev/notification oluşturulur

  return NextResponse.json({
    ok: true,
    message: "Web randevu isteği taslak olarak alındı (mock).",
  });
}

