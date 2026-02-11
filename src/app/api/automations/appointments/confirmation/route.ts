import { NextRequest, NextResponse } from "next/server";

// Bu endpoint, hastaya giden onay linkinin hedefi olacak.
// Örn: https://panel.domain.com/api/automations/appointments/confirmation?token=...

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  // Taslak akış:
  // 1) Token'ı decode et (içinde appointment_id, patient_id vb. olabilir)
  // 2) Supabase'de ilgili randevunun varlığını ve hastanın eşleştiğini doğrula
  // 3) status = 'confirmed' olarak güncelle
  // 4) İsteğe bağlı olarak resepsiyona/personel paneline bildirim gönder

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Geçersiz veya eksik token." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Randevu onayı otomasyon taslağı çalıştı (mock).",
  });
}

