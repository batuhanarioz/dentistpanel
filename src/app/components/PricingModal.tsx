import React, { useState, useEffect } from "react";
import { Check, MessageCircle, Zap, Bell, ShieldCheck, CreditCard, Users, BarChart3, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual" | "pilot">("annual");
    const [prices, setPrices] = useState({
        monthly: 1499,
        annual: 14990,
        smsAddon: 399,
        trialDays: 7
    });

    useEffect(() => {
        if (isOpen) {
            const fetchPrices = async () => {
                const { data, error } = await supabase
                    .from("platform_settings")
                    .select("*")
                    .eq("id", "global")
                    .single();

                if (!error && data) {
                    setPrices({
                        monthly: data.monthly_price,
                        annual: data.annual_price,
                        smsAddon: data.sms_addon_price,
                        trialDays: data.trial_days
                    });
                }
            };
            fetchPrices();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const monthlyPrice = prices.monthly;
    const annualPriceTotal = prices.annual;
    const annualPricePerMonth = Math.round(prices.annual / 12);
    const smsAddonPrice = prices.smsAddon;

    let currentPrice = billingCycle === "monthly" ? monthlyPrice : annualPricePerMonth;
    if (billingCycle === "pilot") currentPrice = 0;

    const features = [
        { icon: Calendar, text: "Sınırsız Randevu Yönetimi" },
        { icon: Users, text: "Sınırsız Hasta Kaydı ve Takibi" },
        { icon: Zap, text: "Sınırsız Hekim ve Personel Tanımı" },
        { icon: CreditCard, text: "Gelişmiş Finansal Yönetim & Kasa" },
        { icon: BarChart3, text: "Detaylı Klinik Analiz Raporları" },
        { icon: ShieldCheck, text: "Bulut Tabanlı %100 Güvenli Veri" },
        { icon: Bell, text: "Sistem İçi Bildirimler" },
        { icon: MessageCircle, text: "7/24 Teknik Destek & Eğitim" },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-4xl mx-auto overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-black px-8 py-12 text-center overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-teal-500 rounded-full blur-[100px]"></div>
                        <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-emerald-500 rounded-full blur-[100px]"></div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative z-10">
                        <h2 className="text-4xl font-black text-white tracking-tight mb-4">Basit ve Şeffaf Fiyatlandırma</h2>
                        <p className="text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                            {billingCycle === "pilot"
                                ? "Sektörün geleceğini birlikte tasarlayalım. Kliniğinize özel çözümler üretiyoruz."
                                : "Tüm özellikler tek bir pakette. Kliniğinizin büyüklüğü ne olursa olsun, ihtiyacınız olan her şey burada."}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 bg-slate-50 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Billing Toggle */}
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${billingCycle === "monthly"
                                    ? "bg-black text-white shadow-md"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                Aylık
                            </button>
                            <button
                                onClick={() => setBillingCycle("annual")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === "annual"
                                    ? "bg-black text-white shadow-md"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                Yıllık
                                <span className="bg-emerald-100 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
                                    En Avantajlı
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={() => setBillingCycle("pilot")}
                            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border-2 ${billingCycle === "pilot"
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                                : "bg-white text-indigo-600 border-indigo-100 hover:border-indigo-200"
                                }`}
                        >
                            <Sparkles size={16} />
                            Pilot Kliniğimiz Olun
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8 items-start">
                        {/* Main Plan Card */}
                        <div className={`${billingCycle === "pilot" ? "lg:col-span-5" : "lg:col-span-3"} bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col transition-all duration-300`}>
                            <div className="p-8 border-b border-slate-50">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">
                                            {billingCycle === "pilot" ? "Pilot Klinik Paketi" : "NextGency OS Premium"}
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-1">
                                            {billingCycle === "pilot" ? "Gelişim Ortağı Özel Paketi" : "Sınırsız Kullanım Paketi"}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-2xl ${billingCycle === "pilot" ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600"}`}>
                                        {billingCycle === "pilot" ? <Sparkles size={24} /> : <ShieldCheck size={24} />}
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                        {currentPrice.toLocaleString("tr-TR")} ₺
                                    </span>
                                    {billingCycle !== "pilot" && <span className="text-lg text-slate-400 font-bold">/ ay</span>}
                                    {billingCycle === "pilot" && <span className="text-lg text-indigo-600 font-bold">İlk Ay Ücretsiz</span>}
                                </div>
                                <div className="h-8 mt-3">
                                    {billingCycle === "annual" && (
                                        <p className="text-sm text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                            <Check size={16} /> Yıllık ödemede aylık {prices.monthly - Math.round(prices.annual / 12)} ₺ tasarruf
                                        </p>
                                    )}
                                    {billingCycle === "pilot" && (
                                        <p className="text-sm text-indigo-600 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                            <Sparkles size={16} /> Kliniğe özel ücretsiz revize imkanı
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50/50 flex-1">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
                                    {billingCycle === "pilot" ? "Gelişim Ortağı Ayrıcalıkları" : "Paket İçeriği"}
                                </h4>

                                {billingCycle === "pilot" ? (
                                    <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-white p-2 rounded-xl shadow-sm">
                                                <ShieldCheck size={18} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Tam Kapsamlı Erişim</p>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sistemdeki tüm premium özelliklere sınırsız ve eksiksiz erişim hakkına sahip olursunuz.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-white p-2 rounded-xl shadow-sm">
                                                <Zap size={18} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Birlikte Geliştirme</p>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sektörel tecrübenizle sistemi deneyimleyip, iş akışınızı hızlandıracak geri bildirimlerde bulunursunuz.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-white p-2 rounded-xl shadow-sm">
                                                <Sparkles size={18} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Özel Yazılım Revizeleri</p>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Kliniğiniz için kritik olan özellik taleplerinizi mühendislerimize doğrudan iletebilir ve sisteme entegrasyonuna öncülük edebilirsiniz.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 bg-white p-2 rounded-xl shadow-sm">
                                                <Users size={18} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Stratejik İş Ortaklığı</p>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Memnuniyetiniz durumunda; başarı hikayenizi sosyal medya ve reklamlarımızda referans göstererek sizi markamızın elçisi ilan ediyoruz.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-y-4 gap-x-6">
                                        {features.map((feature, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className="mt-0.5 bg-teal-100 p-1 rounded-md">
                                                    <feature.icon size={14} className="text-teal-700" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 leading-tight">
                                                    {feature.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Addon Component */}
                        {billingCycle !== "pilot" && (
                            <div className="lg:col-span-2 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
                                <div className="bg-gradient-to-br from-slate-900 to-black rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                                        <Zap size={80} className="text-teal-400" />
                                    </div>

                                    <span className="inline-block bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-teal-500/20">
                                        Süper Güç Ekletin
                                    </span>
                                    <h3 className="text-xl font-bold text-white mb-3">Akıllı Otomasyon</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                        Randevu ve ödeme hatırlatmalarını OTOMATİK SMS ile gönderin. Personelinizin yükünü azaltın.
                                    </p>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <Check size={16} className="text-teal-500" />
                                            <span className="text-xs font-medium">Randevu Öncesi Hatırlatma Mesajı</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <Check size={16} className="text-teal-500" />
                                            <span className="text-xs font-medium">Randevu Sonrası Kontrol Mesajı</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <Check size={16} className="text-teal-500" />
                                            <span className="text-xs font-medium">Borç ve Ödeme Hatırlatma Mesajı</span>
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white">399 ₺</span>
                                        <span className="text-xs text-slate-500 font-bold">/ ay + Kullanım</span>
                                    </div>
                                    <p className="mt-2 text-[10px] text-teal-400 font-black uppercase tracking-widest">
                                        Mesaj başı sadece 0.35 ₺ • Kullandığın kadar öde
                                    </p>
                                </div>

                                <a
                                    href={`https://wa.me/905444412180?text=${encodeURIComponent(
                                        "Merhaba, NextGency OS fiyatları ve otomasyon paketi hakkında detaylı bilgi almak istiyorum."
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-3 py-5 rounded-[2rem] text-lg font-black transition-all shadow-xl shadow-emerald-500/10 active:scale-95 group"
                                >
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.054 3.73 1.612 5.766 1.612h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    <span>WhatsApp ile Bilgi Al</span>
                                </a>
                            </div>
                        )}

                        {billingCycle === "pilot" && (
                            <div className="lg:col-span-5 animate-in slide-in-from-bottom-4 duration-500">
                                <a
                                    href={`https://wa.me/905444412180?text=${encodeURIComponent(
                                        "Merhaba, Pilot Klinik programınız hakkında bilgi almak ve başvurmak istiyorum."
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-3 py-6 rounded-[2.5rem] text-xl font-black transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 group"
                                >
                                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.054 3.73 1.612 5.766 1.612h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    <span>Hemen Pilot Klinik Başvurusu Yap</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Notes */}
                {billingCycle !== "pilot" && (
                    <div className="bg-white border-t border-slate-100 px-8 py-6 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                                <Check size={14} className="text-teal-500" />
                                {prices.trialDays} Günlük Ücretsiz Deneme Süresi
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
                                Sistemi Şimdi Keşfedin, Sonra Karar Verin
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
