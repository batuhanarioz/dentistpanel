import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection, LegalInfoBox } from "@/app/components/landing/LegalLayout";
import { WhatsAppButton } from "@/app/components/landing/WhatsAppButton";

export const metadata: Metadata = {
  title: "İptal ve İade Politikası | NextGency OS",
  description: "NextGency OS dijital abonelik iptali, deneme süresi sona erdirme ve iade talep koşulları.",
};

export default function IptalIadePage() {
  return (
    <LegalLayout
      title="İptal ve İade Politikası"
      description="NextGency OS dijital aboneliğinizi nasıl iptal edebileceğinizi ve iade koşullarını bu sayfada bulabilirsiniz."
      badge="İptal & İade"
    >
      <LegalInfoBox color="amber">
        Bu politika yalnızca dijital yazılım aboneliği hizmeti için geçerlidir. Fiziksel ürün iadesi söz konusu değildir. Tüketici hakları kapsamında mesafeli satış hükümleri uygulanır.
      </LegalInfoBox>

      <div className="mt-10 space-y-0">
        <LegalSection title="1. Deneme Süresi İptali">
          <p>
            Aboneliğiniz henüz <strong>ücretsiz deneme süresi</strong> içindeyse, deneme süresi sona ermeden önce iptal etmeniz durumunda hiçbir ücret tahsil edilmez. Kart bilgilerinizden herhangi bir kesinti yapılmaz.
          </p>
          <p>
            İptal için:{" "}
            <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline font-black">
              clinic@nextgency360.com
            </a>{" "}
            adresine aboneliğinizle ilişkili e-posta adresinizden iptal talebinizi iletmeniz yeterlidir.
          </p>
        </LegalSection>

        <LegalSection title="2. Aktif Abonelik İptali">
          <p>
            Ücretli döneme geçmiş aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal işlemi, mevcut ödeme döneminin sonunda geçerli olur; bu süre zarfında hizmete erişiminiz devam eder.
          </p>
          <p>
            Örnek: Aylık aboneliğinizi ay ortasında iptal etmeniz durumunda, dönem sonuna kadar (aya kadar) hizmetten yararlanmaya devam edersiniz.
          </p>
        </LegalSection>

        <LegalSection title="3. İptal Nasıl Yapılır?">
          <p>İptal talebinizi aşağıdaki yöntemlerden biriyle iletebilirsiniz:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>E-posta:</strong>{" "}
              <a href="mailto:clinic@nextgency360.com" className="text-teal-600 hover:underline">
                clinic@nextgency360.com
              </a>{" "}
              {`— Konu satırına "Abonelik İptali" yazarak aboneliğinizle ilişkili e-posta adresinizden gönderin.`}
            </li>
            <li>
              <strong>Telefon:</strong>{" "}
              <a href="tel:+905444412180" className="text-teal-600 hover:underline">
                +90 544 441 21 80
              </a>{" "}
              — Hafta içi 09:00–18:00.
            </li>
            <li>
              <strong>WhatsApp:</strong> Aşağıdaki butonu kullanarak mesaj gönderebilirsiniz.
            </li>
          </ul>
          <div className="mt-4">
            <WhatsAppButton
              label="WhatsApp ile İptal Talebi"
              message="Merhaba, NextGency OS aboneliğimi iptal etmek istiyorum."
              variant="outline"
            />
          </div>
        </LegalSection>

        <LegalSection title="4. İade Koşulları">
          <p>
            NextGency OS, dijital bir yazılım hizmeti sunduğundan, hizmetin kullanılmaya başlandıktan sonraki dönemlere ait ücretler için iade işlemi gerçekleştirilmez. Bununla birlikte aşağıdaki istisnalar geçerlidir:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Teknik arıza kaynaklı kesintiler:</strong> NextGency OS altyapısından kaynaklanan ve 48 saatten uzun süren erişim kesintilerinde orantılı iade veya dönem uzatımı değerlendirilebilir.
            </li>
            <li>
              <strong>Hatalı/mükerrer ödeme:</strong> Sistem hatası sonucunda mükerrer ödeme gerçekleşmesi durumunda fazla tutar iade edilir. İşlem süresi banka prosedürlerine göre 3–10 iş günüdür.
            </li>
            <li>
              <strong>Deneme süresi iptali:</strong> Deneme süresi içinde yapılan iptallerde herhangi bir ücret tahsil edilmez.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Yıllık Abonelik İadesi">
          <p>
            Yıllık aboneliğin satın alınmasından itibaren <strong>7 (yedi) gün</strong> içinde herhangi bir kullanım olmadan iptal talebinde bulunulması durumunda, ödenen tutar tam olarak iade edilir.
          </p>
          <p>
            {`7 günlük sürenin geçmesinin ardından yapılan iptal taleplerinde, kalan aylara orantılı iade değerlendirmesi yapılır; bu inisiyatif NextGency OS'a aittir.`}
          </p>
        </LegalSection>

        <LegalSection title="6. İade Süreci">
          <p>
            Onaylanan iadeler, ödemenin gerçekleştirildiği kart veya hesaba iade edilir. İşlem süresi ilgili bankanın prosedürlerine bağlı olup genellikle <strong>3–10 iş günü</strong> içinde tamamlanır.
          </p>
        </LegalSection>

        <LegalSection title="7. Tüketici Hakları">
          <p>
            Türk Tüketicinin Korunması Hakkında Kanun (6502) kapsamındaki haklarınız saklıdır.{" "}
            <Link href="/mesafeli-satis-sozlesmesi" className="text-teal-600 hover:underline font-black">
              Mesafeli Satış Sözleşmesi
            </Link>
            {'nde'} ayrıntılı bilgiye ulaşabilirsiniz.
          </p>
        </LegalSection>
      </div>
    </LegalLayout>
  );
}
