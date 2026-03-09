"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Stethoscope,
  ShieldCheck,
  Zap,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Database,
  Lock,
  Smartphone,
  Plus,
  Minus,
  TrendingUp,
  Clock,
  Layout,
  Bell,
  LineChart,
  Wallet,
  Globe,
  ClipboardList,
  Instagram,
  Linkedin
} from "lucide-react";
import { PricingModal } from "@/app/components/PricingModal";
import { InterfaceShowcase } from "@/app/components/landing/InterfaceShowcase";
import nextgencyLogo from "./nextgency-logo-yatay.png";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      title: "Akıllı Randevu Hatırlatmaları",
      description: "Randevu saatlerini otomatik hatırlatarak gelmeme oranlarını minimuma indirin.",
      icon: Bell,
      color: "text-teal-600",
      bg: "bg-teal-50"
    },
    {
      title: "Ödeme ve Tahsilat Yönetimi",
      description: "Tahsilatları, borçları ve ödeme planlarını dijital asistanınızla tek merkezden yönetin.",
      icon: Wallet,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      title: "Hasta Kartı & Tedavi Geçmişi",
      description: "Hastanızın tüm tıbbi ve finansal geçmişine saniyeler içinde, tek tıkla ulaşın.",
      icon: ClipboardList,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Performans & Ciro Analizi",
      description: "Hekim performansını ve klinik verimliliğini anlık, gerçek zamanlı verilerle ölçün.",
      icon: LineChart,
      color: "text-rose-600",
      bg: "bg-rose-50"
    },
    {
      title: "Yetki & Personel Yönetimi",
      description: "Personel bazlı sayfa ve işlem yetkilendirmesi ile sistemde tam kontrol sağlayın.",
      icon: ShieldCheck,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Akıllı Bildirimler",
      description: "Kritik işlemler ve önemli hatırlatmalardan her an, her yerden haberdar olun.",
      icon: Zap,
      color: "text-orange-600",
      bg: "bg-orange-50"
    },
    {
      title: "Kasa & Finans Takibi",
      description: "Kliniğinizin nakit akışını, gelir ve giderlerini profesyonel raporlarla izleyin.",
      icon: TrendingUp,
      color: "text-cyan-600",
      bg: "bg-cyan-50"
    },
    {
      title: "Bulut Erişimi",
      description: "Verilerinize internetin olduğu her yerden, her cihazla %100 güvenle erişin.",
      icon: Globe,
      color: "text-blue-600",
      bg: "bg-blue-50"
    }
  ];


  const stats = [
    { value: "%85", label: "Operasyonel Hız Artışı", sub: "Manuel iş yükünde azalma" },
    { value: "%30", label: "Randevu Kayıp Önleme", sub: "Akıllı SMS otomasyonu ile" },
    { value: "Sınırsız", label: "Hasta Kapasitesi", sub: "Bulut üzerinde ölçeklenebilir" },
    { value: "7/24", label: "Canlı Destek", sub: "Uzman mühendis ekibimizle" }
  ];

  const testimonials = [
    {
      name: "Arif ÇAKIR",
      title: "Diş Hekimi",
      text: "NextGency OS kullanmaya başladığımızdan beri ajanda karmaşası bitti. Hastalarımızın borç takibini saniyeler içinde görebiliyoruz. Kesinlikle her modern kliniğin ihtiyacı olan bir sistem.",
      initials: "AÇ"
    },
    {
      name: "Beyza Yiğit",
      title: "Ortodonti Uzmanı",
      text: "Hasta geçmişine ve ödeme detaylarına her cihazdan ulaşabilmek büyük özgürlük. Finansal raporlama kısmı ise klinik yönetimine bakışımı tamamen değiştirdi.",
      initials: "BY"
    },
    {
      name: "İrem Balcı",
      title: "Klinik Koordinatörü",
      text: "Personel yönetimi ve günlük kasa takibi için harika bir asistan. Karmakarışık Excel tablolarından kurtulup tamamen dijitalleşmek performansımızı %40 artırdı.",
      initials: "İB"
    }
  ];

  const faqs = [
    {
      q: "Eski diş hekimliği yazılımımdaki hasta verilerini NextGency OS'e taşıyabilir miyim?",
      a: "Evet. Profesyonel ekibimiz; mevcut sisteminizdeki hasta kayıtlarını, tedavi geçmişlerini, röntgen arşivlerini ve tüm finansal verileri güvenle NextGency OS dental altyapısına taşır. Hiçbir veri kaybı yaşamadan dijital dönüşümünüzü tamamlarız."
    },
    {
      q: "Dental CRM sisteminiz KVKK ve hasta gizliliği standartlarına uygun mu?",
      a: "Kesinlikle. NextGency OS, hasta verilerinin korunması noktasında en yüksek standartları karşılar. Tüm verileriniz bankaların kullandığı 256-bit AES şifreleme ile korunur ve KVKK uyumlu sunucularımızda, günlük yedekleme protokolleri ile saklanır."
    },
    {
      q: "WhatsApp dental otomasyonu ve randevu hatırlatma nasıl çalışıyor?",
      a: "Sistemimiz, randevu başlangıç ve bitiş saatlerine göre otomatik olarak tetiklenip anasayfanıza mesaj göndermeniz gerektiği bildirimini düşürüyor. Bu sayede tek tıkla whatsapp'a geçiş yapıp hastanıza özel olarak hazırlanmış mesajı gönderebiliyorsunuz. Tabi SMS otomasyonu ek paketi satın alırsanız tıklamanıza bile gerek kalmadan sistem zamanlamayı otomatik olarak ayarlayıp gönderimi de kendisi gerçekleştiriyor."
    },
    {
      q: "Birden fazla diş hekimi veya şubesi olan poliklinikler için uygun mu?",
      a: "Evet, NextGency OS ölçeklenebilir bir mimariye sahiptir. Sınırsız hekim tanımı yapabilir, farklı şubelerdeki tedavi ve ödeme süreçlerini tek bir merkezden koordine edebilirsiniz. Gelişmiş yetkilendirme sistemi ile her personelin erişim seviyesini özelleştirebilirsiniz."
    },
    {
      q: "Sistemi kullanmak için diş kliniğime bir sunucu veya donanım kurmam gerekiyor mu?",
      a: "Hayır. NextGency OS %100 bulut tabanlı bir sistemdir. Kliniğinize pahalı sunucular kurmanıza gerek kalmaz. İnternetin olduğu her yerden, herhangi bir tarayıcı veya tablet üzerinden tüm süreçlerinizi %100 performansla yönetebilirsiniz."
    },
    {
      q: "Klinik personelimiz (asistanlar ve sekreterya) sistemi ne kadar sürede öğrenebilir?",
      a: "NextGency OS, 'klinik ergonomisi' göz önüne alınarak tasarlanmıştır. Son derece yalın ve sezgisel bir arayüze sahip olduğu için ekibiniz sistemin temel fonksiyonlarını sadece 1 saatlik bir oryantasyonla uzman seviyesinde kullanmaya başlayabilir."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/30 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-700 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 py-4 shadow-sm" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image src={nextgencyLogo} alt="NextGency Logo" height={36} className="w-auto invert mix-blend-multiply" priority />
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-10">
              <a href="#showcase" className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors">Arayüz</a>
              <a href="#ozellikler" className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors">Özellikler</a>
              <button
                onClick={() => setIsPricingOpen(true)}
                className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors"
              >
                Fiyatlandırma
              </button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest text-white bg-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-black/10"
              >
                Sistem Girişi
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 pt-2 pb-8 space-y-4">
              <a href="#showcase" className="block py-4 text-sm font-bold tracking-widest uppercase text-slate-500" onClick={() => setIsMenuOpen(false)}>Arayüz</a>
              <a href="#ozellikler" className="block py-4 text-sm font-bold tracking-widest uppercase text-slate-500" onClick={() => setIsMenuOpen(false)}>Özellikler</a>
              <button
                className="block w-full text-left py-4 text-sm font-bold tracking-widest uppercase text-slate-500"
                onClick={() => { setIsPricingOpen(true); setIsMenuOpen(false); }}
              >
                Fiyatlandırma
              </button>
              <Link href="/login" className="block w-full text-center py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs" onClick={() => setIsMenuOpen(false)}>Sistem Girişi</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-50/40 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[150px] -z-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-slate-50 border border-slate-100 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={14} className="text-teal-600" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">NextGency OS Diş Kliniği Yönetim Sistemi</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 mb-10 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            Diş Kliniği Yönetiminde <br />
            <span className="italic font-serif font-light text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 italic-glow px-2">&quot;OS&quot;</span> Devri
          </h1>

          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-500 mb-14 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            NextGency OS, modern diş hekimleri ve klinikler için tasarlanmış yüksek performanslı bir dental işletim sistemidir. Verimliliği sadece konuşmuyoruz, onu muayenehanenizin standartı haline getiriyoruz.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Link
              href="/login?demo=true"
              className="w-full sm:w-auto px-12 py-5 rounded-full bg-black text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-800 hover:-translate-y-1 active:scale-95 shadow-2xl shadow-black/20"
            >
              Şimdi Keşfedin
            </Link>
            <button
              onClick={() => setIsPricingOpen(true)}
              className="w-full sm:w-auto px-12 py-5 rounded-full bg-white border border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
            >
              Fiyatlandırma
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Section (Numerical Proof) */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group border-r border-slate-100 last:border-0">
                <p className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-4 group-hover:text-teal-600 transition-colors duration-500">{stat.value}</p>
                <p className="text-xs font-black uppercase tracking-widest text-slate-800 mb-1">{stat.label}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interface Showcase (Visual Proof) */}
      <InterfaceShowcase />

      {/* Features Grid */}
      <section id="ozellikler" className="py-32 lg:py-48 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.95]"> <span className="italic font-serif font-dark text-slate-600">Diş Kliniğinizi Yönetmek</span> Artık Çok Daha Kolay</h2>
            <p className="text-lg text-slate-500 font-medium">NextGency Diş Kliniği Yönetim Yazılımı, muayenehanenizin ihtiyacı olan tüm operasyonel araçları tek bir merkezde toplar.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-[2rem] border border-slate-200/50 p-8 hover:border-teal-400/30 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col items-center text-center"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  <feature.icon className={feature.color} size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight leading-tight">{feature.title}</h3>
                <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 lg:py-56 bg-gradient-to-b from-slate-100 to-white text-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-7xl font-black tracking-tighter mb-8 leading-none italic font-serif text-teal-600">Profesyonel Görüşler</h2>
            <p className="text-teal-600 font-black text-sm uppercase tracking-[0.3em]">NextGency Dental CRM İle Dönüşen Diş Klinikleri</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((item, i) => (
              <div key={i} className="bg-white border border-slate-100 p-12 rounded-[3.5rem] relative group hover:border-teal-400/30 transition-all duration-500 shadow-sm hover:shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <MessageSquare size={60} fill="currentColor" className="text-slate-900" />
                </div>
                <p className="text-lg font-medium italic text-slate-500 leading-relaxed mb-12">&quot;{item.text}&quot;</p>
                <div className="flex items-center gap-5 pt-8 border-t border-slate-50">
                  <div className="w-14 h-14 rounded-full bg-teal-600 flex items-center justify-center font-black text-white text-lg shadow-xl shadow-teal-500/10">
                    {item.initials}
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-900 leading-none mb-2">{item.name}</p>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{item.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="sss" className="py-32 lg:py-48 bg-gradient-to-b from-slate-50 to-white border-y border-slate-200/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6">Aklınızda Soru İşareti <br /> <span className="italic font-serif font-light text-slate-400">Kalmasın</span></h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 rounded-[2rem] overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-8 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors"
                >
                  <span className="font-black text-lg text-slate-900 leading-tight pr-8">{faq.q}</span>
                  <div className={`p-2 rounded-full transition-all ${activeFaq === idx ? "bg-teal-600 text-white" : "bg-white text-slate-300 shadow-sm"}`}>
                    {activeFaq === idx ? <Minus size={16} /> : <Plus size={16} />}
                  </div>
                </button>
                {activeFaq === idx && (
                  <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-slate-500 font-medium leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-black rounded-[4rem] p-12 lg:p-24 overflow-hidden relative shadow-[0_60px_120px_-20px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4 animate-pulse">
              <Zap size={600} fill="currentColor" className="text-white" />
            </div>

            <div className="relative z-10 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-[0.9]">
                  Geleceğin Diş Kliniğini <br /> <span className="italic font-serif font-light text-white/50">Sizinle Birlikte</span> Kuralım.
                </h2>
                <p className="text-white/40 text-lg font-medium leading-relaxed mb-10 max-w-lg">NextGency Diş Kliniği İşletim Sistemi ile dijitalleşmeye bugün başlayın, farkı muayenehanenizde hissedin.</p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <button
                    onClick={() => setIsPricingOpen(true)}
                    className="px-14 py-6 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    Paketleri İncele <ChevronRight size={16} />
                  </button>
                  <Link
                    href="/login"
                    className="px-12 py-6 rounded-full bg-transparent border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all text-center flex items-center justify-center"
                  >
                    Sistem Girişi
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="hakkimizda" className="bg-gradient-to-b from-slate-50 to-white py-32 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-20 mb-24 lg:text-left text-center">
            <div className="col-span-1 md:col-span-2">
              <Image src={nextgencyLogo} alt="NextGency Logo" height={32} className="w-auto mb-10 opacity-90 mx-auto lg:mx-0 invert mix-blend-multiply" />
              <p className="text-slate-400 max-w-sm leading-relaxed text-sm font-medium mx-auto lg:mx-0">
                NextGency OS, dental sağlık teknolojilerinde uzman kadrosuyla diş hekimlerine özel gelecek nesil hasta yönetimi ve operasyonel altyapılar sunar.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase spacing-[0.2em] text-slate-900 mb-8 tracking-widest">OS Ekosistemi</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-bold tracking-tight">
                <li><a href="#ozellikler" className="hover:text-teal-600 transition-colors">Özellikler</a></li>
                <li><button onClick={() => setIsPricingOpen(true)} className="hover:text-teal-600 transition-colors">Fiyatlandırma</button></li>
                <li><Link href="/login" className="hover:text-teal-600 transition-colors">Sistem Girişi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase spacing-[0.2em] text-slate-900 mb-8 tracking-widest">Akademi</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-bold tracking-tight">
                <li><a href="#" className="hover:text-teal-600 transition-colors">OS Kullanım Rehberi</a></li>
                <li><a href="#sss" className="hover:text-teal-600 transition-colors">Sıkça Sorulanlar</a></li>
                <li><a href="#" className="hover:text-teal-600 transition-colors">KVKK & Gizlilik</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest text-center">© 2025 NextGency OS Diş Kliniği Yönetim Sistemi</p>
              <span className="hidden md:block w-1 h-1 bg-slate-200 rounded-full"></span>
              <a href="https://nextgency360.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-teal-600 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 group">
                nextgency360.com <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="flex gap-8">
              <a href="https://www.instagram.com/nextgency360" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-teal-600 transition-all transform hover:scale-110">
                <Instagram size={20} />
              </a>
              <a href="https://www.linkedin.com/company/nextgency360" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-teal-600 transition-all transform hover:scale-110">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
        
        body {
            overflow-x: hidden;
            background-color: #ffffff;
        }

        .font-serif {
            font-family: 'Playfair Display', serif;
        }

        .italic-glow {
            position: relative;
            display: inline-block;
        }
        
        .italic-glow::after {
            content: '';
            position: absolute;
            bottom: 2px;
            left: 0;
            width: 100%;
            height: 30%;
            background: rgba(20, 184, 166, 0.15);
            z-index: -1;
            filter: blur(8px);
        }
      `}</style>
    </div>
  );
}
