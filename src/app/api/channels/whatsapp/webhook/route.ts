import { NextRequest, NextResponse } from "next/server";

// WhatsApp Business API webhook taslağı.
// Sağlayıcı (ör. Twilio, 360dialog vb.) bu endpoint'e POST yapar.

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);

  // Güvenlik:
  // - Sağlayıcıya özel imza/secret header'ı doğrulanmalı (örn. X-Signature).
  // - IP allowlist / rate limit uygulanmalı.

  // Taslak akış:
  // 1) İmza doğrulaması
  // 2) Gelen mesajın tipine göre ayrıştırma (text, template response vb.)
  // 3) `incoming_messages` veya `events` tablosuna ham event kaydı
  // 4) Eğer şablon cevabı bir randevu onayı/iptali ise ilgili appointment kaydının güncellenmesi
  // 5) Klinik panelindeki birleşik gelen kutusuna mesajın yansıması

  if (!payload) {
    return NextResponse.json(
      { ok: false, message: "Geçersiz payload." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "WhatsApp webhook taslağı çağrıldı (mock).",
  });
}

