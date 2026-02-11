import { NextRequest, NextResponse } from "next/server";

// WhatsApp üzerinden mesaj/şablon gönderimi için abstraction katmanı taslağı.
// UI veya otomasyon katmanı yalnızca bu endpoint'i bilir; altta Twilio/360dialog gibi sağlayıcılar saklanır.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Beklenen minimal payload (taslak):
  // {
  //   clinicId: string;
  //   toPhone: string;
  //   template: string; // örn: "appointment_reminder"
  //   variables?: Record<string, string>;
  // }

  if (!body?.clinicId || !body?.toPhone || !body?.template) {
    return NextResponse.json(
      { ok: false, message: "Zorunlu alanlar eksik." },
      { status: 400 }
    );
  }

  // Taslak akış:
  // 1) clinicId ve template adına göre message_templates tablosundan içerik çek
  // 2) Sağlayıcının gerektirdiği forma dönüştür
  // 3) Sağlayıcı HTTP API çağrısı yap
  // 4) notifications tablosunda log tut

  return NextResponse.json({
    ok: true,
    message: "WhatsApp gönderim taslağı çalıştı (mock).",
  });
}

