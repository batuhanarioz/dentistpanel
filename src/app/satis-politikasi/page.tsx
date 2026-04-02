import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection, LegalInfoBox } from "@/app/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Satış Politikası | NextGency OS",
  description: "NextGency OS dijital abonelik satış politikası: fiyatlandırma, ödeme yöntemleri, fatura ve abonelik koşulları.",
};

export default function SatisPolitikasiPage() {
  return (
    <LegalLayout
      title="Satış Politikası"
      description="NextGency OS abonelik hizmetine ilişkin fiyatlandırma, ödeme, fatura ve genel satış koşulları aşağıda belirtilmiştir."
      badge="Satış"
    >
      <LegalInfoBox color="teal">
        NextGency OS, diş kliniklerine yönelik dijital bir SaaS aboneliğidir. Satın alınan ürün; fiziksel bir mal değil, bulut tabanlı yazılım erişim hakkıdır.
      </LegalInfoBox>

      <div className="mt-10 space-y-0">
        <LegalSection title="1. Satıcı Bilgileri">
          <ul className="space-y-1">
            <li><strong>Ticari Unvan:</strong> NextGency Yapay Zeka ve Otomasyon Ajansı</li>
            <li><strong>Marka Adı:</strong> NextGency OS</li>
            <li><strong>Konum:</strong> Ankara, Türkiye</li>
            <li><strong>E-posta:</strong> <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline">clinic@nextgency360.com</a></li>
            <li><strong>Telefon:</strong> <a href="tel:+905444412180" className="text-teal-600 hover:underline">+90 544 441 21 80</a></li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Hizmet Tanımı">
          <p>
            NextGency OS; randevu yönetimi, hasta takibi, tedavi planlaması, ödeme yönetimi ve WhatsApp otomasyonu işlevlerini kapsayan, diş kliniklerine özel bulut tabanlı bir klinik yönetim yazılımıdır.
          </p>
          <p>
            Hizmet, belirli bir abonelik dönemi için kullanım hakkı şeklinde sunulmakta olup abonelik dönemi içinde tüm güncellemeler ve teknik destek dahildir.
          </p>
        </LegalSection>

        <LegalSection title="3. Abonelik Planları ve Fiyatlandırma">
          <p>
            Hizmet, <strong>aylık</strong> veya <strong>yıllık</strong> abonelik seçenekleriyle sunulmaktadır. Güncel fiyat bilgilerine{" "}
            <Link href="/#fiyatlandirma" className="text-teal-600 hover:underline font-black">
              fiyatlandırma sayfasından
            </Link>{" "}
            ulaşabilirsiniz.
          </p>
          <ul className="space-y-1 list-disc list-inside pl-2">
            <li>Tüm fiyatlar Türk Lirası (TRY) cinsindendir ve KDV dahildir.</li>
            <li>Yıllık aboneliklerde aylık aboneliğe kıyasla indirim uygulanır.</li>
            <li>Fiyatlar önceden bildirim yapılmak kaydıyla değiştirilebilir; mevcut abonelikler dönem sonuna kadar mevcut fiyattan devam eder.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Ödeme Yöntemleri">
          <p>
            Ödemeler <strong>PAYTR</strong> altyapısı üzerinden güvenli olarak gerçekleştirilmektedir. Kabul edilen ödeme araçları:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Kredi kartı (Visa, Mastercard, American Express)</li>
            <li>Banka kartı (Debit kart)</li>
            <li>Taksitli ödeme (banka ve kart türüne göre değişir)</li>
          </ul>
          <p>
            Tüm ödeme işlemleri 256-bit SSL şifreleme ile korunmaktadır. Kart bilgileriniz NextGency OS sistemlerinde saklanmaz.
          </p>
        </LegalSection>

        <LegalSection title="5. Fatura">
          <p>
            Abonelik ödemelerinin ardından e-fatura veya e-arşiv fatura, kayıtlı e-posta adresinize iletilir. Fatura bilgilerinizin güncellenmesi için{" "}
            <Link href="/iletisim" className="text-teal-600 hover:underline font-black">
              destek hattı
            </Link>
            nı kullanabilirsiniz.
          </p>
        </LegalSection>

        <LegalSection title="6. Deneme Süresi">
          <p>
            Yeni abonelikler için belirlenmiş süre boyunca ücretsiz deneme sunulmaktadır. Deneme süresi sona ermeden iptal edilmesi durumunda herhangi bir ücret tahsil edilmez.
          </p>
          <p>
            Deneme süresi dolduğunda abonelik otomatik olarak ücretli döneme geçer. Ücretlendirme öncesinde hatırlatma e-postası gönderilir.
          </p>
        </LegalSection>

        <LegalSection title="7. Abonelik Yenileme">
          <p>
            Abonelik, seçilen dönem (aylık/yıllık) sonunda otomatik olarak yenilenir. Yenileme işleminden önce kayıtlı e-posta adresinize bildirim gönderilir. Otomatik yenilemeyi durdurmak için aboneliğinizi dönem sona ermeden iptal etmeniz gerekmektedir.
          </p>
        </LegalSection>

        <LegalSection title="8. İptal ve İade">
          <p>
            İptal ve iade koşulları için{" "}
            <Link href="/iptal-ve-iade" className="text-teal-600 hover:underline font-black">
              İptal ve İade Politikası
            </Link>
            {'ı'} inceleyiniz.
          </p>
        </LegalSection>
      </div>
    </LegalLayout>
  );
}
