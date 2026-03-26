import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Instagram,
  Linkedin,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { LandingNav } from "@/app/components/landing/LandingNav";
import { LandingFaq } from "@/app/components/landing/LandingFaq";
import { LandingPricingButton } from "@/app/components/landing/LandingPricingButton";
import {
  ProductChapterText,
  FullWidthScreenshotShowcase,
  ScreenshotMobileDesktopPair,
} from "@/app/components/landing/ProductChapter";
import nextgencyLogo from "./nextgency-logo-yatay.png";
import heroImg from "./dash2.webp";
import heroImg2 from "./dash1.webp";
import hastImg from "./hasta-detay-desk.webp";
import hastImg2 from "./hasta-detay-mob.webp";
import tedImg from "./tedavi-planları.webp";
import tedImg2 from "./tedavi-detay-mob.webp";
import odmImg from "./odeme.webp";
import odmImg2 from "./odeme-mob.webp";
import randevuDesktopImg from "./randevu.webp";
import randevuMobileImg from "./randevu-olust.webp";
import raporImg1 from "./rapor1.webp";
import raporImg2 from "./rapor2.webp";
import raporImg3 from "./rapor3.webp";
import mesajlarImg from "./mesaj-asis.webp";

// ── SEO DATA ────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Diş kliniği programı nedir?",
    a: "Diş kliniği programı, diş muayenehanelerinin randevu, hasta, tedavi ve ödeme süreçlerini dijital ortamda yönetmesini sağlayan yazılımdır. NextGency OS, tüm bu süreçleri tek bir bulut tabanlı panelde bir araya getirir; kağıt, Excel veya dağınık uygulamalara olan ihtiyacı ortadan kaldırır.",
  },
  {
    q: "Klinik yönetim sistemi ne işe yarar?",
    a: "Klinik yönetim sistemi; randevu oluşturma ve takibi, hasta kayıt ve tedavi geçmişi, ödeme planı yönetimi, WhatsApp ile otomatik hatırlatma ve klinik performans raporlama gibi işlemleri dijitalleştirerek zaman ve hata kaybını ortadan kaldırır. Ekibiniz daha az çabayla daha fazla hastaya hizmet verebilir.",
  },
  {
    q: "WhatsApp hatırlatma sistemi nasıl çalışır?",
    a: "NextGency OS, randevu saatlerine ve ödeme vadelerine göre otomatik bildirimler oluşturur. Panelden onay vererek tek tıkla önceden hazırlanmış mesajı WhatsApp üzerinden hastaya iletebilirsiniz. SMS otomasyon paketi ile bu işlem tamamen otomatik hale gelir; tıklamanıza bile gerek kalmaz.",
  },
  {
    q: "Eski diş hekimliği yazılımımdaki hasta verilerini taşıyabilir miyim?",
    a: "Evet. Profesyonel ekibimiz; mevcut sisteminizdeki hasta kayıtlarını, tedavi geçmişlerini, röntgen arşivlerini ve tüm finansal verileri güvenle NextGency OS altyapısına taşır. Hiçbir veri kaybı yaşamadan dijital dönüşümünüzü tamamlarız.",
  },
  {
    q: "KVKK ve hasta gizliliği standartlarına uygun mu?",
    a: "Kesinlikle. Tüm verileriniz bankaların kullandığı 256-bit AES şifreleme ile korunur ve KVKK uyumlu sunucularımızda, günlük yedekleme protokolleri ile saklanır.",
  },
  {
    q: "Birden fazla hekim veya şubesi olan poliklinikler için uygun mu?",
    a: "Evet, NextGency OS ölçeklenebilir mimarisiyle sınırsız hekim tanımı yapmanıza ve farklı şubelerin süreçlerini tek merkezden koordine etmenize olanak tanır. Gelişmiş yetkilendirme sistemi ile her personelin erişim seviyesini özelleştirebilirsiniz.",
  },
  {
    q: "Sunucu veya donanım kurmam gerekiyor mu?",
    a: "Hayır. NextGency OS %100 bulut tabanlıdır. İnternetin olduğu her yerden, herhangi bir tarayıcı veya tablet üzerinden tüm süreçlerinizi yönetebilirsiniz.",
  },
  {
    q: "Klinik personelimiz sistemi ne kadar sürede öğrenebilir?",
    a: "NextGency OS, klinik ergonomisi gözetilerek tasarlanmıştır. Son derece yalın ve sezgisel arayüzü sayesinde ekibiniz temel fonksiyonları yalnızca 1 saatlik oryantasyonla uzman düzeyinde kullanmaya başlayabilir.",
  },
];

// ── PAGE ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <LandingNav />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO DOCUMENT COVER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-28 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50/20">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-teal-50/60 rounded-full blur-[140px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3" aria-hidden="true" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left — Text */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/60 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" aria-hidden="true" />
                <span className="text-[10px] font-black text-teal-700 uppercase tracking-[0.2em]">NextGency OS Diş Kliniği Yönetim Sistemi</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 mb-6 leading-[1.0]">
                Kliniğinizin tüm operasyonları<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 italic font-serif font-light">tek ekranda.</span>
              </h1>

              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-3 max-w-lg">
                Randevu, tedavi planı, ödeme takibi ve hasta iletişimini tek sistemden yönetin.
              </p>
              <p className="text-sm text-slate-400 font-medium mb-10">
                Diş kliniği programı arayanlar için geliştirildi.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login?demo=true"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                >
                  Canlı Demo İncele <ChevronRight size={14} aria-hidden="true" />
                </Link>
                <LandingPricingButton className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95">
                  Fiyatlandırmayı Gör
                </LandingPricingButton>
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-12 pt-12 border-t border-slate-100">
                {[
                  { v: "99.9%", l: "Uptime" },
                  { v: "256-bit", l: "Şifreleme" },
                  { v: "7/24", l: "Destek" },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <p className="text-lg font-black text-slate-900 leading-none">{v}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Hero screenshot stack */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-16px_rgba(0,0,0,0.16)] border border-slate-200/50 flex flex-col">
                <Image
                  src={heroImg}
                  alt="NextGency OS diş kliniği yönetim sistemi ana dashboard ekranı"
                  className="w-full h-auto object-cover"
                  priority
                />
                <Image
                  src={heroImg2}
                  alt="NextGency OS randevu oluşturma ekranı"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — SYSTEM OVERVIEW STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-y border-slate-100 bg-white py-4">
        <div className="max-w-5xl mx-auto px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-0 gap-y-2">
            {[
              "Randevu Takibi",
              "Hasta Yönetimi",
              "Tedavi Planı",
              "Ödeme Takibi",
              "WhatsApp Otomasyonu",
            ].map((label, i, arr) => (
              <li key={label} className="flex items-center">
                <span className="px-5 py-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.14em]">
                  {label}
                </span>
                {i < arr.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — CHAPTER 01: RANDEVU YÖNETİMİ
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="ozellikler" className="py-24 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <ProductChapterText
              eyebrow="01 / Randevu Yönetimi"
              heading="Diş kliniği randevu takip sistemi ile günlük akışı netleştirin"
              text="Randevuları hızlıca oluşturun, düzenleyin ve gün içindeki yoğunluğu tek ekranda yönetin."
            >
              <ul className="space-y-3">
                {[
                  "Hekim ve koltuk bazlı takvim görünümü",
                  "Anlık durum güncellemeleri (geldi, muayenede, tamamlandı)",
                  "Çakışma önleme ve uyarı sistemi",
                  "Web, telefon ve WhatsApp kanal entegrasyonu",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check size={15} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProductChapterText>

            <ScreenshotMobileDesktopPair
              desktopSrc={randevuDesktopImg}
              desktopAlt="Diş kliniği randevu takip sistemi — günlük randevu listesi ekranı"
              mobileSrc={randevuMobileImg}
              mobileAlt="Diş kliniği randevu yönetimi mobil görünümü"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — CHAPTER 02: HASTA YÖNETİMİ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <ScreenshotMobileDesktopPair
              desktopSrc={hastImg}
              desktopAlt="Diş kliniği hasta yönetim sistemi — hasta listesi ekranı"
              mobileSrc={hastImg2}
              mobileAlt="Diş kliniği hasta yönetimi mobil görünümü"
            />

            <ProductChapterText
              eyebrow="02 / Hasta Yönetimi"
              heading="Hasta geçmişi, iletişim bilgileri ve klinik kayıtlar tek yerde"
              text="Yeni hasta kaydı oluşturun, geçmiş işlemleri görüntüleyin ve tüm hasta bilgilerine tek panelden erişin."
            >
              <ul className="space-y-3">
                {[
                  "Kapsamlı hasta profili (tıbbi geçmiş, alerjiler, KVKK)",
                  "Tedavi geçmişi ve doktor notları",
                  "Finansal özet ve ödeme durumu",
                  "Hızlı arama ve filtreleme",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check size={15} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProductChapterText>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — CHAPTER 03: TEDAVİ PLANI
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <ProductChapterText
              eyebrow="03 / Tedavi Planı"
              heading="Diş kliniği tedavi planı yazılımı ile süreçleri sistemli yönetin"
              text="Planlanan işlemleri, fiyatları ve ilerleme durumunu hasta bazında görüntüleyin."
            >
              <ul className="space-y-3">
                {[
                  "Diş numarasına göre işlem tanımı",
                  "Çoklu seans takibi ve ilerleme göstergesi",
                  "Ödeme planıyla bütünleşik yapı",
                  "Aktif, tamamlanan ve iptal planlara genel bakış",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check size={15} className="text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProductChapterText>

            <ScreenshotMobileDesktopPair
              desktopSrc={tedImg}
              desktopAlt="Diş kliniği tedavi planı yazılımı — plan detay ve ilerleme ekranı"
              mobileSrc={tedImg2}
              mobileAlt="Diş kliniği tedavi planı mobil görünümü"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — CHAPTER 04: ÖDEME YÖNETİMİ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <ScreenshotMobileDesktopPair
              desktopSrc={odmImg}
              desktopAlt="Diş kliniği ödeme yönetimi — tahsilat ve bekleyen ödeme listesi"
              mobileSrc={odmImg2}
              mobileAlt="Diş kliniği ödeme takibi mobil görünümü"
            />

            <ProductChapterText
              eyebrow="04 / Ödeme Yönetimi"
              heading="Hasta ve ödeme takibini tek merkezden yönetin"
              text="Tahsil edilen, bekleyen ve geciken ödemeleri görün; ödeme geçmişini hasta bazında takip edin."
            >
              <ul className="space-y-3">
                {[
                  "Nakit, kart, taksit ve havale takibi",
                  "Ödeme vadesi hatırlatmaları",
                  "Sigorta ve indirim yönetimi",
                  "Hasta bazlı borç ve alacak özeti",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check size={15} className="text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProductChapterText>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — CHAPTER 05: WHATSAPP OTOMASYONU
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="grid lg:grid-cols-2 gap-12 items-end mb-14">
            <ProductChapterText
              eyebrow="05 / WhatsApp Otomasyonu"
              heading="Diş kliniği için WhatsApp hatırlatma ve takip sistemi"
              text="Randevu hatırlatma, memnuniyet ve ödeme mesajlarını sistematik şekilde yönetin."
            >
              <ul className="space-y-3">
                {[
                  "Randevu öncesi otomatik hatırlatma",
                  "Vade günü ödeme bildirimi",
                  "Tedavi sonrası memnuniyet mesajı",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProductChapterText>
            <div className="lg:text-right">
              <p className="text-sm text-slate-400 font-medium max-w-xs lg:ml-auto">
                SMS otomasyon paketi ile mesajlar tıklamanıza bile gerek kalmadan otomatik gönderilir.
              </p>
            </div>
          </div>

          {/* Full-width screenshot */}
          <FullWidthScreenshotShowcase>
            <Image
              src={mesajlarImg}
              alt="Diş kliniği WhatsApp hatırlatma sistemi — akıllı mesaj asistanı randevu ve ödeme bildirimleri"
              className="w-full h-auto object-cover"
            />
          </FullWidthScreenshotShowcase>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 — HOW THE FLOW WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="nasil-calisir" className="py-24 lg:py-40 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.08),transparent_60%)]" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.25em] mb-4">Klinik İş Akışı</p>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
              Klinikte günlük akış nasıl ilerler?
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-[4.5rem] left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-teal-500/30 via-teal-500/60 to-teal-500/30" aria-hidden="true" />

            {[
              {
                step: "01",
                accent: "from-teal-500 to-emerald-500",
                title: "Hasta Kaydı Oluştur",
                desc: "İsim, iletişim ve sağlık bilgilerini girerek hasta profilini saniyeler içinde oluşturun.",
                mockContent: (
                  <div className="space-y-2.5">
                    <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center">
                      <span className="text-[10px] text-white/40 font-semibold">Ad Soyad</span>
                    </div>
                    <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center">
                      <span className="text-[10px] text-white/40 font-semibold">Telefon</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center">
                        <span className="text-[10px] text-white/40 font-semibold">Doğum Tarihi</span>
                      </div>
                      <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center">
                        <span className="text-[10px] text-white/40 font-semibold">Cinsiyet</span>
                      </div>
                    </div>
                    <div className="h-7 bg-teal-500/80 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Kaydet</span>
                    </div>
                  </div>
                ),
              },
              {
                step: "02",
                accent: "from-indigo-500 to-teal-500",
                title: "Randevu & Plan Oluştur",
                desc: "Randevuyu takvime işleyin, tedavi adımlarını ve ödeme planını tanımlayın.",
                mockContent: (
                  <div className="space-y-2.5">
                    <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-semibold">Tarih & Saat</span>
                      <span className="text-[10px] text-teal-400 font-black">26.03 · 14:00</span>
                    </div>
                    <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-semibold">Tedavi Türü</span>
                      <span className="text-[10px] text-teal-400 font-black">Kanal Tedavisi</span>
                    </div>
                    <div className="h-7 bg-white/10 rounded-lg px-3 flex items-center justify-between">
                      <span className="text-[10px] text-white/40 font-semibold">Tedavi Ücreti</span>
                      <span className="text-[10px] text-teal-400 font-black">₺2.500</span>
                    </div>
                    <div className="h-7 bg-teal-500/80 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Randevu Oluştur</span>
                    </div>
                  </div>
                ),
              },
              {
                step: "03",
                accent: "from-emerald-500 to-teal-400",
                title: "Takibi Otomatik Başlat",
                desc: "Sistem randevu hatırlatmasını, ödeme bildirimini ve memnuniyet mesajını otomatik hazırlar.",
                mockContent: (
                  <div className="space-y-2.5">
                    {[
                      { type: "RANDEVU", msg: "Selin Çelik · Yarın 14:00", color: "bg-indigo-500/30 text-indigo-300" },
                      { type: "ÖDEME", msg: "Zeynep Arslan · Vade bugün", color: "bg-amber-500/30 text-amber-300" },
                    ].map((m) => (
                      <div key={m.type} className="bg-white/10 rounded-xl p-3">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${m.color}`}>{m.type}</span>
                        <p className="text-[10px] text-white/70 font-semibold mt-1.5">{m.msg}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <MessageSquare size={9} className="text-emerald-400" aria-hidden="true" />
                          <span className="text-[9px] text-emerald-400 font-black">WhatsApp&apos;ta Gönder</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(({ step, accent, title, desc, mockContent }) => (
              <div key={step} className="relative flex flex-col">
                {/* Step label */}
                <div className="flex items-end gap-4 mb-6">
                  <span className="text-6xl font-black text-white/10 leading-none tabular-nums shrink-0">{step}</span>
                  <div className="pb-1">
                    <h3 className="text-base font-black text-white leading-tight">{title}</h3>
                    <p className="text-[11px] text-white/40 font-medium mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
                {/* Mini UI mock with accent top bar */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex-1">
                  <div className={`h-0.5 bg-gradient-to-r ${accent}`} aria-hidden="true" />
                  <div className="p-4">{mockContent}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9 — CHAPTER 06: RAPORLAMA VE GENEL BAKIŞ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">06 / Raporlama ve Genel Bakış</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-5 leading-tight">
              Tüm klinik verileriniz tek ekranda görünür
            </h2>
            <p className="text-slate-500 font-medium text-[15px] leading-relaxed">
              Günlük yoğunluk, tahsilatlar, tamamlanan işlemler ve bekleyen aksiyonları tek bakışta yönetin.
            </p>
          </div>

          {/* Main screenshot */}
          <FullWidthScreenshotShowcase className="mb-6">
            <Image
              src={raporImg1}
              alt="Diş kliniği yönetim sistemi genel bakış dashboard — günlük performans ve klinik özeti"
              className="w-full h-auto object-cover"
            />
          </FullWidthScreenshotShowcase>

          {/* Secondary screenshots */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-[1.75rem] overflow-hidden shadow-[0_8px_30px_-8px_rgba(0,0,0,0.10)] border border-slate-200/50">
              <Image
                src={raporImg2}
                alt="Diş kliniği gelişmiş finansal analiz ve hekim performans metrikleri"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="rounded-[1.75rem] overflow-hidden shadow-[0_8px_30px_-8px_rgba(0,0,0,0.10)] border border-slate-200/50">
              <Image
                src={raporImg3}
                alt="Diş kliniği randevu ve ciro dağılım raporları"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 10 — COMPARISON
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-40 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-5 leading-tight">
              Dağınık klinik takibinden<br />sistemli yönetime geçin
            </h2>
            <p className="text-slate-500 font-medium text-[15px]">Klinikler genellikle birden fazla araç kullanmak zorunda kalır. NextGency OS hepsini tek çatı altında toplar.</p>
          </div>

          <div className="relative grid md:grid-cols-2 gap-6">
            {/* Center arrow (desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center shadow-md" aria-hidden="true">
              <ArrowRight size={16} className="text-teal-600" />
            </div>

            {/* Without */}
            <div className="bg-white rounded-[2rem] border border-rose-100 p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} className="text-rose-500" aria-hidden="true" />
                </div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Eskisi Gibi</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Kağıt ajanda veya Excel karmaşası",
                  "Kaçırılan randevular, gelmeyen hastalar",
                  "Ödeme takibinde kayıplar",
                  "Ekip içi koordinasyon sorunu",
                  "Raporlama için saatler harcama",
                  "Hasta verilerine her yerden erişememe",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-500">
                    <X size={14} className="text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* With NextGency */}
            <div className="bg-teal-600 rounded-[2rem] p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-white" aria-hidden="true" />
                </div>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">NextGency OS ile</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Dijital randevu takvimi, anlık güncelleme",
                  "Otomatik WhatsApp hatırlatması ile sıfır kayıp",
                  "Anlık ödeme, borç ve taksit takibi",
                  "Rol bazlı yetki sistemi, tam kontrol",
                  "Gerçek zamanlı klinik raporları",
                  "Bulut erişimi, her cihazdan her yerden",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-white">
                    <Check size={14} className="text-white/80 shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 11 — FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="sss" className="py-24 lg:py-40 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-5">
              Sık Sorulan Sorular
            </h2>
            <p className="text-slate-400 font-medium text-[15px]">
              Diş kliniği programı ve klinik yönetim sistemi hakkında merak ettiğiniz her şeyin yanıtı burada.
            </p>
          </div>
          <LandingFaq faqs={faqs} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 12 — FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 lg:p-20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.12),transparent_60%)]" aria-hidden="true" />
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
                Kliniğinizi daha verimli<br />yönetmeye hazır olun.
              </h2>
              <p className="text-white/40 font-medium text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                NextGency OS ile randevu, tedavi, ödeme ve iletişim süreçlerini tek sistemde toplayın.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/login?demo=true"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-teal-500 text-white font-black text-xs uppercase tracking-widest hover:bg-teal-400 transition-all active:scale-95 shadow-xl shadow-teal-500/20"
                >
                  Canlı Demo Talep Et <ChevronRight size={14} aria-hidden="true" />
                </Link>
                <LandingPricingButton className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white/10 border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:bg-white/15 transition-all active:scale-95">
                  Fiyatlandırmayı İncele
                </LandingPricingButton>
              </div>
              {/* Feature chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-10">
                {["Randevu Takibi", "Hasta Yönetimi", "Tedavi Planı", "Ödeme Takibi", "WhatsApp Otomasyonu"].map((f) => (
                  <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 text-[10px] font-black text-white/50 uppercase tracking-wider">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="hakkimizda" className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-16 mb-20 lg:text-left text-center">
            <div className="col-span-1 md:col-span-1">
              <Image src={nextgencyLogo} alt="NextGency OS Diş Kliniği Programı" height={28} className="w-auto mb-8 opacity-90 mx-auto lg:mx-0 invert mix-blend-multiply" />
              <p className="text-slate-400 max-w-xs leading-relaxed text-sm font-medium mx-auto lg:mx-0">
                Diş kliniği programı ve klinik yönetim sistemi alanında uzman ekibiyle diş hekimlerine özel çözümler.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 mb-6 tracking-widest">Sistem</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-semibold">
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">Randevu Yönetimi</a></li>
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">Hasta Takip Programı</a></li>
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">Tedavi Planı</a></li>
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">Ödeme Takibi</a></li>
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">WhatsApp Otomasyonu</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 mb-6 tracking-widest">Destek</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-semibold">
                <li><LandingPricingButton className="hover:text-teal-600 transition-colors text-left w-full text-sm text-slate-400 font-semibold">Fiyatlandırma</LandingPricingButton></li>
                <li><a href="#sss" className="hover:text-teal-600 transition-colors">Sıkça Sorulanlar</a></li>
                <li><Link href="/login" className="hover:text-teal-600 transition-colors">Sistem Girişi</Link></li>
                <li><Link href="/iletisim" className="hover:text-teal-600 transition-colors">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 mb-6 tracking-widest">Yasal</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-semibold">
                <li><Link href="/teslimat-ve-kullanim" className="hover:text-teal-600 transition-colors">Teslimat ve Kullanım</Link></li>
                <li><Link href="/satis-politikasi" className="hover:text-teal-600 transition-colors">Satış Politikası</Link></li>
                <li><Link href="/iptal-ve-iade" className="hover:text-teal-600 transition-colors">İptal ve İade</Link></li>
                <li><Link href="/mesafeli-satis-sozlesmesi" className="hover:text-teal-600 transition-colors">Mesafeli Satış Sözleşmesi</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">© 2026 NextGency OS Diş Kliniği Programı</p>
              <span className="hidden md:block w-1 h-1 bg-slate-200 rounded-full" aria-hidden="true" />
              <a href="https://nextgency360.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-teal-600 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 group">
                NextGency360.com <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </a>
            </div>
            <div className="flex gap-6">
              <a href="https://www.instagram.com/nextgency360" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-teal-600 transition-all hover:scale-110" aria-label="Instagram">
                <Instagram size={18} aria-hidden="true" />
              </a>
              <a href="https://www.linkedin.com/company/nextgency360" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-teal-600 transition-all hover:scale-110" aria-label="LinkedIn">
                <Linkedin size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
