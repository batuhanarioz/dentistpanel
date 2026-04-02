import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Zap, Bell, ShieldCheck, CreditCard, Users, BarChart3, Calendar, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { trackPricingView } from "@/lib/analytics";

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WA_ICON = (
    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72 1.054 3.73 1.612 5.766 1.612h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual" | "pilot">("annual");
    const [prices, setPrices] = useState({ monthly: 1499, annual: 14990, smsAddon: 399, trialDays: 7 });

    useEffect(() => {
        if (!isOpen) return;
        trackPricingView();
        const fetchPrices = async () => {
            const { data, error } = await supabase
                .from("platform_settings")
                .select("monthly_price, annual_price, sms_addon_price, trial_days")
                .eq("id", "global")
                .single();
            if (!error && data) {
                setPrices({ monthly: data.monthly_price, annual: data.annual_price, smsAddon: data.sms_addon_price, trialDays: data.trial_days });
            }
        };
        fetchPrices();
    }, [isOpen]);

    if (!isOpen) return null;

    const annualPricePerMonth = Math.round(prices.annual / 12);
    const currentPrice = billingCycle === "monthly" ? prices.monthly : billingCycle === "annual" ? annualPricePerMonth : 0;
    const saving = prices.monthly - annualPricePerMonth;

    const features = [
        { icon: Calendar, text: "Sınırsız Randevu Yönetimi" },
        { icon: Users, text: "Sınırsız Hasta Kaydı" },
        { icon: Zap, text: "Sınırsız Hekim & Personel" },
        { icon: CreditCard, text: "Finansal Yönetim & Kasa" },
        { icon: BarChart3, text: "Klinik Analiz Raporları" },
        { icon: ShieldCheck, text: "Bulut Tabanlı Güvenli Veri" },
        { icon: Bell, text: "Sistem İçi Bildirimler" },
    ];

    const pilotFeatures = [
        { title: "Tam Kapsamlı Erişim", desc: "Tüm premium özelliklere sınırsız erişim." },
        { title: "Birlikte Geliştirme", desc: "Geri bildirimlerinizle sisteme yön verin." },
        { title: "Özel Yazılım Revizeleri", desc: "Özellik taleplerinizi doğrudan mühendislere iletin." },
        { title: "Stratejik İş Ortaklığı", desc: "Referans klinik olarak markamızda yer alın." },
    ];

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/75 backdrop-blur-xl" onClick={onClose}>
            <div className="flex min-h-full items-center justify-center p-3 md:p-6">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── HEADER ── */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-base font-black text-slate-900">Basit ve Şeffaf Fiyatlandırma</h2>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {billingCycle === "pilot" ? "Sektörün geleceğini birlikte tasarlayalım." : "Tüm özellikler tek pakette — kliniğinize özel."}
                            </p>
                        </div>
                        {/* Toggle + close */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                                <button onClick={() => setBillingCycle("monthly")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === "monthly" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Aylık</button>
                                <button onClick={() => setBillingCycle("annual")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === "annual" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                                    Yıllık
                                    <span className="bg-emerald-100 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded-full font-black">%20</span>
                                </button>
                                <button onClick={() => setBillingCycle("pilot")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${billingCycle === "pilot" ? "bg-indigo-600 text-white shadow" : "text-indigo-600 hover:bg-indigo-50"}`}>
                                    <Sparkles size={11} /> Pilot
                                </button>
                            </div>
                            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile toggle */}
                    <div className="sm:hidden flex gap-2 px-5 pt-4">
                        <button onClick={() => setBillingCycle("monthly")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${billingCycle === "monthly" ? "bg-black text-white border-black" : "border-slate-200 text-slate-500"}`}>Aylık</button>
                        <button onClick={() => setBillingCycle("annual")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${billingCycle === "annual" ? "bg-black text-white border-black" : "border-slate-200 text-slate-500"}`}>Yıllık %20 İndirim</button>
                        <button onClick={() => setBillingCycle("pilot")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${billingCycle === "pilot" ? "bg-indigo-600 text-white border-indigo-600" : "border-indigo-200 text-indigo-600"}`}><Sparkles size={11} /> Pilot</button>
                    </div>

                    {/* ── BODY ── */}
                    <div className="p-5 md:p-6">
                        {billingCycle !== "pilot" ? (
                            <div className="grid md:grid-cols-5 gap-4">
                                {/* Main card */}
                                <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                    <div className="p-5 border-b border-slate-100">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NextGency OS Premium</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{currentPrice.toLocaleString("tr-TR")} ₺</span>
                                                    <span className="text-sm text-slate-400 font-bold">/ ay</span>
                                                </div>
                                                {billingCycle === "annual" && (
                                                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                                                        <Check size={12} /> Aylık {saving} ₺ tasarruf · Yılda {prices.annual.toLocaleString("tr-TR")} ₺
                                                    </p>
                                                )}
                                                {billingCycle === "monthly" && (
                                                    <p className="text-xs text-slate-400 font-medium mt-1">Yıllık geçerek aylık {saving} ₺ tasarruf edin</p>
                                                )}
                                            </div>
                                            <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl">
                                                <ShieldCheck size={20} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Paket İçeriği</p>
                                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                                            {features.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="bg-teal-100 p-1 rounded-md shrink-0">
                                                        <f.icon size={11} className="text-teal-700" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-600 leading-tight">{f.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Addon card */}
                                <div className="md:col-span-2 flex flex-col gap-3">
                                    <div className="flex-1 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 flex flex-col">
                                        <span className="inline-flex items-center gap-1.5 bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 w-fit border border-teal-500/20">
                                            <Zap size={10} /> Eklenti
                                        </span>
                                        <p className="text-base font-black text-white mb-1">Akıllı Otomasyon</p>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">Randevu & ödeme hatırlatmalarını otomatik SMS ile gönderin.</p>
                                        <div className="space-y-2 mb-4">
                                            {["Randevu Öncesi Hatırlatma", "Randevu Sonrası Kontrol", "Borç & Ödeme Hatırlatma"].map((t) => (
                                                <div key={t} className="flex items-center gap-2 text-slate-300">
                                                    <Check size={13} className="text-teal-400 shrink-0" />
                                                    <span className="text-xs">{t}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto">
                                            <span className="text-xl font-black text-white">399 ₺</span>
                                            <span className="text-xs text-slate-500 font-bold ml-1">/ ay + kullanım</span>
                                            <p className="text-[10px] text-teal-400 font-black uppercase tracking-wider mt-1">Mesaj başı 0.35 ₺</p>
                                        </div>
                                    </div>

                                    <a
                                        href={`https://wa.me/905444412180?text=${encodeURIComponent("Merhaba, NextGency OS fiyatları hakkında bilgi almak istiyorum.")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95"
                                    >
                                        {WA_ICON}
                                        WhatsApp ile Bilgi Al
                                    </a>
                                </div>
                            </div>
                        ) : (
                            /* Pilot mode */
                            <div className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {pilotFeatures.map((f) => (
                                        <div key={f.title} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                                            <p className="text-sm font-black text-slate-800 mb-1">{f.title}</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <a
                                    href={`https://wa.me/905444412180?text=${encodeURIComponent("Merhaba, Pilot Klinik programına başvurmak istiyorum.")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-black transition-all active:scale-95"
                                >
                                    {WA_ICON}
                                    Hemen Pilot Klinik Başvurusu Yap
                                </a>
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="px-5 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                            <Check size={12} className="text-teal-500" />
                            {prices.trialDays} Günlük Ücretsiz Deneme Süresi
                        </p>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                            <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-[10px] text-slate-400 hover:text-teal-600 font-semibold transition-colors">Mesafeli Satış</Link>
                            <Link href="/iptal-ve-iade" target="_blank" className="text-[10px] text-slate-400 hover:text-teal-600 font-semibold transition-colors">İptal & İade</Link>
                            <Link href="/satis-politikasi" target="_blank" className="text-[10px] text-slate-400 hover:text-teal-600 font-semibold transition-colors">Satış Politikası</Link>
                            <Link href="/teslimat-ve-kullanim" target="_blank" className="text-[10px] text-slate-400 hover:text-teal-600 font-semibold transition-colors">Teslimat</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
