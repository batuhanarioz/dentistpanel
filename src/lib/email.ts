import { Resend } from "resend";

const FROM = "NextGency OS <onboarding@nextgency360.com>";
const BASE_URL = "https://clinic.nextgency360.com";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── Welcome ───────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, clinicName: string, trialDays: number) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Hoş geldiniz! ${clinicName} kliniğiniz hazır 🎉`,
    html: `<!DOCTYPE html><html lang="tr"><body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:#0f172a;border-radius:12px;padding:10px 20px;">
      <span style="color:#fff;font-weight:900;font-size:18px;letter-spacing:-0.5px;">NextGency OS</span>
    </div>
  </div>
  <h1 style="font-size:22px;font-weight:900;color:#0f172a;margin:0 0 12px;">Kliniğiniz hazır, hoş geldiniz!</h1>
  <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
    <strong>${clinicName}</strong> kliniğiniz NextGency OS'te oluşturuldu.
    <strong>${trialDays} günlük ücretsiz deneme süreniz</strong> başladı — hiçbir ücret alınmayacak.
  </p>
  <a href="${BASE_URL}/login" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;margin-bottom:24px;">
    Kliniğe Giriş Yap →
  </a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#64748b;font-size:12px;margin:0 0 8px;"><strong>İlk adımlar:</strong></p>
  <ul style="color:#64748b;font-size:12px;line-height:1.8;padding-left:16px;margin:0;">
    <li>Kliniğinizin çalışma saatlerini ve hekimlerini tanımlayın</li>
    <li>İlk randevunuzu oluşturun</li>
    <li>WhatsApp otomasyonunu aktive edin</li>
  </ul>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#94a3b8;font-size:11px;margin:0;">Sorunuz mu var? <a href="mailto:clinic@nextgency360.com" style="color:#0d9488;">clinic@nextgency360.com</a></p>
</div></body></html>`,
  });
}

// ─── Day 3 ─────────────────────────────────────────────────────────────────
export async function sendTrialDay3Email(to: string, clinicName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${clinicName} — Sistemi keşfettiniz mi?`,
    html: `<!DOCTYPE html><html lang="tr"><body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
  <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:0 0 12px;">Denemenizin 3. günü 👋</h1>
  <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
    Merhaba, <strong>${clinicName}</strong> ekibi! Sistemi kullanmaya başladınız mı?
    En çok zaman kazandıran 3 özelliği denemenizi öneririz:
  </p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:20px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;">✓ Randevu hatırlatma — hasta no-show'unu %40 azaltır</p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;">✓ Tedavi planı — hasta memnuniyetini artırır</p>
    <p style="margin:0;font-size:13px;font-weight:700;color:#166534;">✓ Ödeme takibi — gecikmiş alacakları göster</p>
  </div>
  <a href="${BASE_URL}/login" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;margin-bottom:24px;">
    Sisteme Git →
  </a>
  <p style="color:#94a3b8;font-size:11px;margin:0;">Sorunuz mu var? <a href="https://wa.me/905444412180" style="color:#0d9488;">WhatsApp'tan yazın</a></p>
</div></body></html>`,
  });
}

// ─── Day 6 / Ending Soon ───────────────────────────────────────────────────
export async function sendTrialEndingSoonEmail(to: string, clinicName: string, daysLeft: number) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${clinicName} — Denemeniz ${daysLeft} gün sonra bitiyor`,
    html: `<!DOCTYPE html><html lang="tr"><body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
    <p style="margin:0;font-size:13px;font-weight:800;color:#9a3412;">⏰ Deneme süreniz ${daysLeft} gün içinde sona eriyor</p>
  </div>
  <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:0 0 12px;">Kliniğinizi kaybetmeyin</h1>
  <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
    <strong>${clinicName}</strong> kliniğinizdeki tüm hasta verileri, randevular ve tedavi planları
    abonelik aktif olduğu sürece korunuyor. Şimdi aboneliğe geçin, kaldığınız yerden devam edin.
  </p>
  <a href="${BASE_URL}/login" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;margin-bottom:16px;">
    Aboneliğe Geç →
  </a>
  <p style="color:#64748b;font-size:12px;margin:0 0 24px;">
    Yıllık abonelikte aylık %20 tasarruf. 7 gün içinde iptal ederseniz tam iade.
  </p>
  <p style="color:#94a3b8;font-size:11px;margin:0;">Sorularınız için <a href="https://wa.me/905444412180" style="color:#0d9488;">WhatsApp</a> veya <a href="mailto:clinic@nextgency360.com" style="color:#0d9488;">e-posta</a></p>
</div></body></html>`,
  });
}

// ─── Trial Expired ─────────────────────────────────────────────────────────
export async function sendTrialExpiredEmail(to: string, clinicName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${clinicName} — Deneme süreniz sona erdi`,
    html: `<!DOCTYPE html><html lang="tr"><body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
  <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:0 0 12px;">Deneme süreniz tamamlandı</h1>
  <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
    <strong>${clinicName}</strong> kliniğinizin ücretsiz deneme süresi sona erdi.
    Verileriniz 30 gün boyunca güvende tutulacak. Aboneliğinizi aktive ederek kaldığınız yerden devam edebilirsiniz.
  </p>
  <a href="${BASE_URL}/login" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;margin-bottom:24px;">
    Aboneliği Aktive Et →
  </a>
  <p style="color:#94a3b8;font-size:11px;margin:0;">Sorularınız için <a href="https://wa.me/905444412180" style="color:#0d9488;">WhatsApp</a></p>
</div></body></html>`,
  });
}
