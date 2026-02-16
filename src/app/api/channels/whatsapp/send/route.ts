import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppSchema } from "@/lib/validations/whatsapp";

// WhatsApp üzerinden mesaj/şablon gönderimi için abstraction katmanı taslağı.
// UI veya otomasyon katmanı yalnızca bu endpoint'i bilir; altta Twilio/360dialog gibi sağlayıcılar saklanır.

export async function POST(req: NextRequest) {
  const validation = sendWhatsAppSchema.safeParse(await req.json().catch(() => ({})));
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { } = validation.data;

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

