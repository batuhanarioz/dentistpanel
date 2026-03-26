import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection, LegalInfoBox } from "@/app/components/landing/LegalLayout";

export const metadata: Metadata = {
  title: "Teslimat ve Kullanım Koşulları | NextGency OS",
  description: "NextGency OS dijital abonelik hizmetinin teslimat yöntemi, aktivasyon süreci ve kullanım koşulları.",
};

export default function TeslimatPage() {
  return (
    <LegalLayout
      title="Teslimat ve Kullanım Koşulları"
      description="NextGency OS, yalnızca dijital bir SaaS (Software as a Service) hizmetidir. Fiziksel ürün veya kargo teslimatı söz konusu değildir."
      badge="Teslimat"
    >
      <LegalInfoBox color="teal">
        <strong>Önemli:</strong> NextGency OS, bulut tabanlı bir yazılım aboneliği hizmetidir. Satın alınan ürün; fiziksel bir kargo ya da elden teslim içermez. Hizmet, ödemenin onaylanmasının ardından dijital ortamda, hesap aktivasyonu yoluyla sağlanır.
      </LegalInfoBox>

      <div className="mt-10 space-y-0">
        <LegalSection title="1. Hizmetin Niteliği">
          <p>
            NextGency OS, diş kliniklerine özel randevu yönetimi, hasta takibi, tedavi planlaması, ödeme takibi ve WhatsApp otomasyonu işlevlerini tek bir dijital panel üzerinden sunan bulut tabanlı bir yönetim yazılımıdır.
          </p>
          <p>
            Bu hizmet; bir yazılım ürününün dijital lisansı ve erişim hakkı olup taşınabilir ya da kargoya verilebilir herhangi bir fiziksel unsur içermemektedir.
          </p>
        </LegalSection>

        <LegalSection title="2. Dijital Teslimat Yöntemi">
          <p>
            Ödemenin başarıyla tamamlanmasının ardından, aboneliğiniz sistem tarafından otomatik olarak aktive edilir. Aktivasyon aşağıdaki adımlarla gerçekleşir:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>Ödeme onayı alındıktan sonra hesabınız sisteme tanımlanır.</li>
            <li>Kayıt sırasında belirttiğiniz e-posta adresine giriş bilgileriniz iletilir.</li>
            <li>Tarayıcı üzerinden <strong>clinic.nextgency360.com</strong> adresine erişerek sistemi kullanmaya başlayabilirsiniz.</li>
          </ol>
          <p>
            Bu süreç genellikle ödemenin onaylanmasından itibaren <strong>birkaç dakika</strong> içinde tamamlanır. Teknik bir gecikme yaşanması halinde en geç <strong>24 saat</strong> içinde hesabınız aktive edilir.
          </p>
        </LegalSection>

        <LegalSection title="3. Fiziksel Kargo / Teslimat Yoktur">
          <p>
            Satın aldığınız ürün bir yazılım erişim aboneliğidir. Herhangi bir fiziksel ürün, kutu, CD, USB veya donanım bileşeni gönderilmez; kargo veya posta yoluyla teslimat gerçekleştirilmez.
          </p>
        </LegalSection>

        <LegalSection title="4. Erişim ve Kullanım">
          <p>
            Hizmete internet bağlantısı olan her ortamdan, herhangi bir modern web tarayıcısı (Chrome, Safari, Firefox, Edge) aracılığıyla erişilebilir. Özel bir yazılım kurulumu gerekmez.
          </p>
          <p>
            Sistemi; masaüstü bilgisayar, dizüstü bilgisayar ve tablet üzerinden kullanabilirsiniz.
          </p>
        </LegalSection>

        <LegalSection title="5. Deneme Süresi">
          <p>
            Yeni aboneliklerde, ödeme bilgilerinin sisteme girilmesinin ardından belirlenmiş deneme süresi boyunca hizmet ücretsiz olarak kullanılabilir. Deneme süresi içinde iptal edilmesi durumunda herhangi bir ücret tahsil edilmez.
          </p>
          <p>
            Deneme süresi sona erdiğinde ve abonelik devam ediyorsa seçilen plan ücreti otomatik olarak tahsil edilir.
          </p>
        </LegalSection>

        <LegalSection title="6. Abonelik Sürekliliği">
          <p>
            Abonelikler, <strong>aylık</strong> veya <strong>yıllık</strong> dönemler için sunulmaktadır. Seçilen dönem sonunda aboneliğin iptal edilmemesi halinde yenileme gerçekleşir.
          </p>
          <p>
            Aboneliğinizi istediğiniz zaman durdurabilir ve sonlandırabilirsiniz. Ayrıntılar için{" "}
            <Link href="/iptal-ve-iade" className="text-teal-600 hover:underline font-black">
              İptal ve İade Politikası
            </Link>
            {'ı'} inceleyiniz.
          </p>
        </LegalSection>

        <LegalSection title="7. Teknik Destek">
          <p>
            Aktivasyon veya erişim sorunu yaşamanız durumunda{" "}
            <Link href="/iletisim" className="text-teal-600 hover:underline font-black">
              İletişim
            </Link>{" "}
            sayfamızdan bize ulaşabilir ya da doğrudan{" "}
            <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline font-black">
              clinic@nextgency360.com
            </a>{" "}
            adresine e-posta gönderebilirsiniz.
          </p>
        </LegalSection>
      </div>
    </LegalLayout>
  );
}
