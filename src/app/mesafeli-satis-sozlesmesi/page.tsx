import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection, LegalInfoBox } from "@/app/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi | NextGency OS",
  description: "NextGency OS dijital abonelik hizmetine ait mesafeli satış sözleşmesi. 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında hazırlanmıştır.",
};

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <LegalLayout
      title="Mesafeli Satış Sözleşmesi"
      description="Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında NextGency OS dijital abonelik hizmetine ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir."
      badge="Sözleşme"
    >
      <LegalInfoBox color="teal">
        Bu sözleşme, elektronik ortamda kurulmakta olup taraflar arasında bağlayıcıdır. Satın alma işlemini tamamlamadan önce sözleşmeyi dikkatlice okumanız tavsiye edilir.
      </LegalInfoBox>

      <div className="mt-10 space-y-0">
        <LegalSection title="Madde 1 — Taraflar">
          <div className="space-y-4">
            <div>
              <p className="font-black text-slate-800 mb-2">SATICI</p>
              <ul className="space-y-1">
                <li><strong>Ticari Unvan:</strong> NextGency Yapay Zeka ve Otomasyon Ajansı</li>
                <li><strong>Marka Adı:</strong> NextGency OS</li>
                <li><strong>Konum:</strong> İstanbul, Türkiye</li>
                <li><strong>E-posta:</strong>{" "}<a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline">clinic@nextgency360.com</a></li>
                <li><strong>Telefon:</strong>{" "}<a href="tel:+905444412180" className="text-teal-600 hover:underline">+90 544 441 21 80</a></li>
              </ul>
            </div>
            <div>
              <p className="font-black text-slate-800 mb-2">ALICI</p>
              <p>
                {`Abonelik kaydı sırasında sisteme girilen bilgilerle tanımlanan gerçek veya tüzel kişi (bundan böyle "Alıcı" olarak anılacaktır).`}
              </p>
            </div>
          </div>
        </LegalSection>

        <LegalSection title="Madde 2 — Sözleşmenin Konusu">
          <p>
            {`Bu sözleşme; Alıcı'nın NextGency OS platformu üzerinden satın aldığı dijital SaaS (Software as a Service) abonelik hizmetinin teslim, kullanım ve ödeme koşullarını, tarafların hak ve yükümlülüklerini 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde düzenlemektedir.`}
          </p>
        </LegalSection>

        <LegalSection title="Madde 3 — Hizmet Bilgileri">
          <p>Satın alınan hizmetin temel özellikleri:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong>Hizmet Adı:</strong> NextGency OS Diş Kliniği Yönetim Sistemi</li>
            <li><strong>Hizmet Türü:</strong> Bulut tabanlı dijital yazılım aboneliği (SaaS)</li>
            <li>
              <strong>Kapsam:</strong> Randevu yönetimi, hasta takibi, tedavi planlaması, ödeme yönetimi ve WhatsApp otomasyonu işlevleri
            </li>
            <li><strong>Erişim:</strong> Tarayıcı tabanlı; kurulum gerektirmez</li>
            <li><strong>Abonelik Dönemi:</strong> {`Aylık veya yıllık (Alıcı'nın seçimine göre)`}</li>
          </ul>
          <p>
            Güncel fiyat bilgilerine{" "}
            <Link href="/#fiyatlandirma" className="text-teal-600 hover:underline font-black">
              fiyatlandırma sayfasından
            </Link>{" "}
            ulaşabilirsiniz. Tüm fiyatlar KDV dahildir ve Türk Lirası (TRY) cinsinden belirtilmiştir.
          </p>
        </LegalSection>

        <LegalSection title="Madde 4 — Teslimat Koşulları">
          <p>
            Hizmet, fiziksel bir ürün veya kargo içermemektedir. Teslimat, ödemenin onaylanmasının ardından dijital ortamda aşağıdaki şekilde gerçekleştirilir:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>{`Ödeme onayı alındıktan sonra Alıcı'nın hesabı sistem tarafından otomatik olarak aktive edilir.`}</li>
            <li>Kayıtlı e-posta adresine giriş bilgileri iletilir.</li>
            <li>
              Alıcı,{" "}<strong>clinic.nextgency360.com</strong>{" "}adresine tarayıcı üzerinden erişerek hizmeti kullanmaya başlayabilir.
            </li>
          </ol>
          <p>
            Aktivasyon süreci genellikle birkaç dakika içinde tamamlanır; teknik bir gecikme yaşanması halinde en geç <strong>24 saat</strong> içinde hesap aktive edilir.
          </p>
        </LegalSection>

        <LegalSection title="Madde 5 — Ödeme Koşulları">
          <p>
            Ödemeler, <strong>PAYTR</strong> ödeme altyapısı üzerinden 256-bit SSL şifreleme ile güvenli biçimde gerçekleştirilmektedir. Kabul edilen ödeme araçları:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Kredi kartı (Visa, Mastercard, American Express)</li>
            <li>Banka kartı (Debit kart)</li>
            <li>Taksitli ödeme (banka ve kart türüne göre değişir)</li>
          </ul>
          <p>
            Kart bilgileri NextGency OS sistemlerinde saklanmaz. Abonelik dönem sonunda otomatik olarak yenilenir; yenileme öncesinde kayıtlı e-posta adresine bildirim gönderilir.
          </p>
        </LegalSection>

        <LegalSection title="Madde 6 — Cayma Hakkı">
          <p>
            {`6502 sayılı Kanun'un 49. maddesi uyarınca dijital içerik ve hizmetlerde cayma hakkına ilişkin aşağıdaki koşullar geçerlidir:`}
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              Hizmetin ifasına başlanmadan önce Alıcı, sözleşme tarihinden itibaren{" "}
              <strong>14 (on dört) gün</strong> içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
            </li>
            <li>
              {`Alıcı'nın açık onayıyla `}<strong>deneme süresi içinde hizmeti kullanmaya başlaması</strong>{` halinde cayma hakkı sona erer. Deneme süresi sonunda ücretli aboneliğe geçilmesi durumunda da aynı kural uygulanır.`}
            </li>
            <li>
              Yıllık aboneliğin satın alınmasından itibaren <strong>7 (yedi) gün</strong> içinde herhangi bir kullanım olmaksızın iptal talebinde bulunulması durumunda ödenen tutar tam olarak iade edilir.
            </li>
          </ul>
          <p>
            Cayma hakkını kullanmak için{" "}
            <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline font-black">
              clinic@nextgency360.com
            </a>{" "}
            adresine e-posta göndermek yeterlidir.
          </p>
        </LegalSection>

        <LegalSection title="Madde 7 — İptal ve İade">
          <p>
            İptal ve iade koşulları için{" "}
            <Link href="/iptal-ve-iade" className="text-teal-600 hover:underline font-black">
              İptal ve İade Politikası
            </Link>
            {'ı'} inceleyiniz. Ana koşullar:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Ücretli döneme geçmiş abonelikler mevcut dönem sonunda iptal edilebilir; kalan süre için hizmete erişim devam eder.</li>
            <li>Teknik arızadan kaynaklanan 48 saatten uzun erişim kesintilerinde orantılı iade veya dönem uzatımı değerlendirilebilir.</li>
            <li>Hatalı/mükerrer ödemelerde fazla tutar 3–10 iş günü içinde iade edilir.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Madde 8 — Satıcının Yükümlülükleri">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Hizmeti eksiksiz ve kesintisiz sunmak için gerekli teknik altyapıyı sağlamak</li>
            <li>Planlı bakım çalışmalarını önceden bildirmek</li>
            <li>Kişisel verileri KVKK kapsamında korumak ve üçüncü taraflarla paylaşmamak</li>
            <li>Abonelik yenileme ve fiyat değişikliklerini önceden e-posta ile bildirmek</li>
            <li>Teknik destek taleplerini mesai saatleri içinde (hafta içi 09:00–18:00) yanıtlamak</li>
          </ul>
        </LegalSection>

        <LegalSection title="Madde 9 — Alıcının Yükümlülükleri">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Kayıt sırasında gerçek ve güncel bilgi vermek</li>
            <li>Hesap güvenliğini sağlamak; giriş bilgilerini üçüncü şahıslarla paylaşmamak</li>
            <li>Hizmeti yalnızca kendi kliniği adına ve hukuka uygun biçimde kullanmak</li>
            <li>Sistemin güvenliğini tehdit eden eylemlerde bulunmamak</li>
            <li>Abonelik bedellerini zamanında ödemek</li>
          </ul>
        </LegalSection>

        <LegalSection title="Madde 10 — Gizlilik ve Kişisel Veriler">
          <p>
            {`Alıcı'ya ait kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) hükümleri doğrultusunda işlenmektedir. Veriler; hizmetin sunulması, abonelik yönetimi ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılmakta olup üçüncü taraflarla açık rıza alınmadan paylaşılmamaktadır.`}
          </p>
        </LegalSection>

        <LegalSection title="Madde 11 — Uyuşmazlık Çözümü">
          <p>
            Bu sözleşmeden doğan uyuşmazlıklarda Türk hukuku uygulanır. Tüketici hakları kapsamındaki şikayetler için;{" "}
            <strong>Tüketici Hakem Heyeti</strong> veya <strong>Tüketici Mahkemeleri</strong> yetkilidir. Şikayet ve itirazlarınızı{" "}
            <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline font-black">
              clinic@nextgency360.com
            </a>{" "}
            adresine iletebilir ya da{" "}
            <Link href="/iletisim" className="text-teal-600 hover:underline font-black">
              İletişim
            </Link>{" "}
            sayfamızı kullanabilirsiniz.
          </p>
        </LegalSection>

        <LegalSection title="Madde 12 — Yürürlük">
          <p>
            {`Bu sözleşme, Alıcı'nın abonelik kaydını tamamlaması ve ödeme adımını onaylaması ile birlikte yürürlüğe girer. Alıcı, satın alma işlemini gerçekleştirerek bu sözleşmenin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini beyan etmiş sayılır.`}
          </p>
        </LegalSection>
      </div>
    </LegalLayout>
  );
}
