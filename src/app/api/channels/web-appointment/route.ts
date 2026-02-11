import { NextRequest, NextResponse } from "next/server";

// Web randevu formu için API taslağı.
// Örn: Klinik web sitesindeki widget bu endpoint'e POST atar.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Beklenen minimal payload (taslak):
  // {
  //   clinicSlug: string;
  //   fullName: string;
  //   phone: string;
  //   preferredTime: string;
  //   notes?: string;
  // }

  if (!body?.clinicSlug || !body?.fullName || !body?.phone) {
    return NextResponse.json(
      { ok: false, message: "Zorunlu alanlar eksik." },
      { status: 400 }
    );
  }

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

