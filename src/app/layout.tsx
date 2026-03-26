import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Diş Kliniği Programı | NextGency OS Klinik Yönetim Sistemi",
  description: "Diş kliniği programı: randevu takibi, hasta yönetimi, ödeme takibi ve WhatsApp otomasyonu tek panelde. Diş hekimleri için klinik yönetim sistemi.",
  keywords: [
    "diş kliniği programı",
    "diş kliniği yönetim sistemi",
    "klinik yönetim programı",
    "diş hekimi yazılımı",
    "randevu takip sistemi",
    "hasta takip programı",
    "diş kliniği otomasyonu",
    "klinik yazılımı",
    "hasta yönetim sistemi",
    "diş kliniği randevu takip sistemi",
    "diş kliniği hasta ve ödeme takibi",
    "diş kliniği WhatsApp hatırlatma sistemi",
    "diş kliniği tedavi planı yazılımı",
  ],
  openGraph: {
    title: "Diş Kliniği Programı | NextGency OS Klinik Yönetim Sistemi",
    description: "Diş kliniği programı: randevu takibi, hasta yönetimi, ödeme takibi ve WhatsApp otomasyonu tek panelde. Diş hekimleri için klinik yönetim sistemi.",
    url: "https://clinic.nextgency360.com",
    siteName: "NextGency OS",
    locale: "tr_TR",
    type: "website",
  },
  alternates: {
    canonical: "https://clinic.nextgency360.com",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "NextGency",
  "alternateName": "NextGency OS",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Dental Practice Management Software",
  "operatingSystem": "Web",
  "url": "https://clinic.nextgency360.com",
  "description": "Diş klinikleri için geliştirilmiş bulut tabanlı klinik yönetim sistemi. Randevu takibi, hasta yönetimi, tedavi planı, ödeme takibi ve WhatsApp otomasyonu tek panelde.",
  "inLanguage": "tr",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "TRY",
    "availability": "https://schema.org/InStock",
  },
  "featureList": [
    "Randevu yönetimi ve takibi",
    "Hasta kartı ve tedavi geçmişi",
    "Tedavi planı oluşturma",
    "Ödeme ve tahsilat takibi",
    "WhatsApp otomasyonu",
    "Klinik performans raporları",
    "Personel ve yetki yönetimi",
    "Bulut tabanlı erişim"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "47"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Diş kliniği programı nedir?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Diş kliniği programı, diş muayenehanelerinin randevu, hasta, tedavi ve ödeme süreçlerini dijital ortamda yönetmesini sağlayan yazılımdır. NextGency OS, tüm bu süreçleri tek bir bulut tabanlı panelde bir araya getirir."
      }
    },
    {
      "@type": "Question",
      "name": "Klinik yönetim sistemi ne işe yarar?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Klinik yönetim sistemi; randevu oluşturma ve takibi, hasta kayıt ve tedavi geçmişi, ödeme planı yönetimi, WhatsApp ile otomatik hatırlatma ve klinik performans raporlama gibi işlemleri dijitalleştirerek zaman ve hata kaybını ortadan kaldırır."
      }
    },
    {
      "@type": "Question",
      "name": "WhatsApp hatırlatma nasıl çalışır?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "NextGency OS, randevu saatlerine ve ödeme vadelerine göre otomatik bildirimler oluşturur. Sistemde onay vererek tek tıkla önceden hazırlanmış mesajı WhatsApp üzerinden hastaya iletebilirsiniz. SMS otomasyon paketi ile bu işlem tamamen otomatik hale gelir."
      }
    },
    {
      "@type": "Question",
      "name": "Eski diş hekimliği yazılımımdaki hasta verilerini NextGency OS'e taşıyabilir miyim?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evet. Profesyonel ekibimiz; mevcut sisteminizdeki hasta kayıtlarını, tedavi geçmişlerini, röntgen arşivlerini ve tüm finansal verileri güvenle NextGency OS dental altyapısına taşır. Hiçbir veri kaybı yaşamadan dijital dönüşümünüzü tamamlarız."
      }
    },
    {
      "@type": "Question",
      "name": "Dental CRM sisteminiz KVKK ve hasta gizliliği standartlarına uygun mu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Kesinlikle. NextGency OS, hasta verilerinin korunması noktasında en yüksek standartları karşılar. Tüm verileriniz bankaların kullandığı 256-bit AES şifreleme ile korunur ve KVKK uyumlu sunucularımızda, günlük yedekleme protokolleri ile saklanır."
      }
    },
    {
      "@type": "Question",
      "name": "Birden fazla diş hekimi veya şubesi olan poliklinikler için uygun mu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Evet, NextGency OS ölçeklenebilir bir mimariye sahiptir. Sınırsız hekim tanımı yapabilir, farklı şubelerdeki tedavi ve ödeme süreçlerini tek bir merkezden koordine edebilirsiniz. Gelişmiş yetkilendirme sistemi ile her personelin erişim seviyesini özelleştirebilirsiniz."
      }
    },
    {
      "@type": "Question",
      "name": "Sistemi kullanmak için diş kliniğime bir sunucu veya donanım kurmam gerekiyor mu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Hayır. NextGency OS %100 bulut tabanlı bir sistemdir. Kliniğinize pahalı sunucular kurmanıza gerek kalmaz. İnternetin olduğu her yerden, herhangi bir tarayıcı veya tablet üzerinden tüm süreçlerinizi %100 performansla yönetebilirsiniz."
      }
    },
    {
      "@type": "Question",
      "name": "Klinik personelimiz sistemi ne kadar sürede öğrenebilir?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "NextGency OS, 'klinik ergonomisi' göz önüne alınarak tasarlanmıştır. Son derece yalın ve sezgisel bir arayüze sahip olduğu için ekibiniz sistemin temel fonksiyonlarını sadece 1 saatlik bir oryantasyonla uzman seviyesinde kullanmaya başlayabilir."
      }
    }
  ]
};

import * as Sentry from "@sentry/nextjs";
import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className="antialiased bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <Script
          id="schema-software"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <Script
          id="schema-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <Sentry.ErrorBoundary fallback={<p>Bir hata oluştu. Lütfen sayfayı yenileyiniz.</p>}>
          <Providers>{children}</Providers>
        </Sentry.ErrorBoundary>
      </body>
    </html>
  );
}

