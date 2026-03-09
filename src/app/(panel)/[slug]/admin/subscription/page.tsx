"use client";

import { useState, useEffect } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { PaymentHistory } from "@/types/database";
import {
    Check,
    ShieldCheck,
    CreditCard,
    Sparkles,
    History,
    AlertCircle,
    Calendar as CalendarIcon,
    ChevronRight,
    Zap,
    Users,
    BarChart3,
    MessageCircle
} from "lucide-react";

export default function SubscriptionPage() {
    const clinic = useClinic();
    usePageHeader("Abonelik", "Paket yönetimi ve faturalandırma takibi");

    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual" | "pilot">("annual");
    const [payments, setPayments] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPayments() {
            if (!clinic.clinicId) return;
            const { data } = await supabase
                .from("payment_history")
                .select("*")
                .eq("clinic_id", clinic.clinicId)
                .order("created_at", { ascending: false });

            if (data) setPayments(data);
            setLoading(false);
        }
        fetchPayments();
    }, [clinic.clinicId]);

    const monthlyPrice = 1199;
    const annualPricePerMonth = 999;
    let currentPrice = billingCycle === "monthly" ? monthlyPrice : annualPricePerMonth;
    if (billingCycle === "pilot") currentPrice = 0;

    const features = [
        { icon: CalendarIcon, text: "Sınırsız Randevu Yönetimi" },
        { icon: Users, text: "Sınırsız Hasta Kaydı ve Takibi" },
        { icon: Zap, text: "Sınırsız Hekim ve Personel Tanımı" },
        { icon: CreditCard, text: "Gelişmiş Finansal Yönetim & Kasa" },
        { icon: BarChart3, text: "Detaylı Klinik Analiz Raporları" },
        { icon: ShieldCheck, text: "Bulut Tabanlı %100 Güvenli Veri" },
        { icon: MessageCircle, text: "7/24 Teknik Destek & Eğitim" },
    ];

    if (!clinic.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Yetkisiz Erişim</p>
                <p className="text-xs text-slate-500">Bu sayfayı yalnızca yönetici yetkisine sahip kullanıcılar görüntüleyebilir.</p>
            </div>
        );
    }

    const trialDaysLeft = clinic.currentPeriodEnd
        ? Math.max(0, Math.ceil((new Date(clinic.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const isTrial = clinic.subscriptionStatus === 'trialing';

    const automationsEnabled = clinic.clinicSettings?.notification_settings
        ? Object.values(clinic.clinicSettings.notification_settings).some(val => val === true)
        : false;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* 1. Mevcut Durum Özeti */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -m-8 h-32 w-32 rounded-full bg-indigo-50/50 blur-3xl group-hover:bg-indigo-100/50 transition-colors" />

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mevcut Abonelik</h3>
                                {isTrial ? (
                                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm animate-pulse">
                                        Ücretsiz Deneme
                                    </span>
                                ) : (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm">
                                        Aktif Abonelik
                                    </span>
                                )}
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {clinic.billingCycle === 'pilot' ? "Pilot Klinik Paketi" : "NextGency OS Premium"}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 font-medium">
                                {isTrial
                                    ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı.`
                                    : clinic.billingCycle === 'annual' ? "Yıllık Plan • Avantajlı Kullanım" : "Aylık Plan • Esnek Kullanım"}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-xs font-bold text-slate-700">Sistem Durumu: Aktif</span>
                            </div>
                            {clinic.currentPeriodEnd && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {isTrial ? "Deneme Bitiş" : "Sıradaki Ödeme"}
                                    </p>
                                    <p className="text-sm font-black text-slate-900">
                                        {new Date(clinic.currentPeriodEnd).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                            Planı Değiştir
                        </button>
                        <button className="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                            Fatura Bilgilerim
                        </button>
                    </div>
                </div>

                <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 shadow-xl shadow-indigo-200 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={100} className="text-white" />
                    </div>
                    <div className="relative">
                        <h4 className="text-white/80 text-xs font-black uppercase tracking-widest mb-1">Akıllı Otomasyon</h4>
                        <h2 className="text-white text-xl font-bold leading-tight">İletişimi Serbest Bırakın</h2>
                        <p className="text-indigo-100/70 text-[11px] mt-2 leading-relaxed">
                            Randevu hatırlatmalarını ve ödeme bildirimlerini otomatize ederek zaman kazanın.
                        </p>
                    </div>
                    <div className="relative mt-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 inline-block w-full">
                            <div className="flex items-center justify-between">
                                <span className="text-white text-[10px] font-black uppercase">Durum</span>
                                {automationsEnabled ? (
                                    <span className="text-emerald-400 text-[10px] font-black uppercase">Aktif</span>
                                ) : (
                                    <span className="text-indigo-200 text-[10px] font-black uppercase">Kapalı</span>
                                )}
                            </div>
                            <button className="w-full mt-3 bg-white text-indigo-700 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                                Ayarları Yönet
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Paket Seçenekleri */}
            <div className="pt-12">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Size Uygun Planı Seçin</h2>
                    <p className="text-slate-500 font-medium mt-2">Daha fazla özellik için paketinizi yükseltebilirsiniz.</p>
                </div>

                <div className="flex justify-center mb-10">
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${billingCycle === "monthly"
                                ? "bg-black text-white shadow-md"
                                : "text-slate-500 hover:bg-slate-50"
                                }`}
                        >
                            Aylık
                        </button>
                        <button
                            onClick={() => setBillingCycle("annual")}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${billingCycle === "annual"
                                ? "bg-black text-white shadow-md"
                                : "text-slate-500 hover:bg-slate-50"
                                }`}
                        >
                            Yıllık
                            <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">
                                %20 İndirim
                            </span>
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Premium Plan */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-10 border-b border-slate-50">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">NextGency OS Premium</h3>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">Sınırsız Kullanım, Maksimum Performans</p>
                                </div>
                                <div className="h-14 w-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                                    <ShieldCheck size={32} />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black text-slate-900 tracking-tighter">
                                    {currentPrice.toLocaleString("tr-TR")} ₺
                                </span>
                                {billingCycle !== "pilot" && <span className="text-xl text-slate-400 font-bold">/ ay</span>}
                                {billingCycle === "pilot" && <span className="text-xl text-indigo-600 font-black ml-2 uppercase tracking-widest">Pilot Paket</span>}
                            </div>
                            {billingCycle === "annual" && (
                                <p className="text-sm text-emerald-600 font-bold mt-4 flex items-center gap-2 bg-emerald-50 w-fit px-4 py-1.5 rounded-full">
                                    <Check size={18} /> Yıllık ödemede aylık 200 ₺ tasarruf
                                </p>
                            )}
                        </div>

                        <div className="p-10 bg-slate-50/30 flex-1 grid sm:grid-cols-2 gap-6">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="mt-1 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                        <feature.icon size={18} className="text-teal-600" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 leading-snug">
                                        {feature.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="p-10 border-t border-slate-100 bg-white">
                            <button className="w-full bg-black text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]">
                                {clinic.billingCycle === billingCycle ? "Mevcut Planınız" : "Bu Plana Geçiş Yap"}
                            </button>
                        </div>
                    </div>

                    {/* Pilot Clinic / Help Card */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 transform scale-150 rotate-12">
                                <Sparkles size={120} />
                            </div>
                            <h3 className="text-xl font-black mb-4 tracking-tight">Pilot Kliniğimiz Olun</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed mb-8 font-medium">
                                Sektörün geleceğini birlikte tasarlayalım. Kliniğinize özel çözümler ve öncelikli destekle sisteme entegrasyon sağlayın.
                            </p>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3 text-sm font-bold">
                                    <div className="bg-white/20 p-1 rounded-lg"><Check size={16} /></div>
                                    1 Ay Ücretsiz Kullanım
                                </li>
                                <li className="flex items-center gap-3 text-sm font-bold">
                                    <div className="bg-white/20 p-1 rounded-lg"><Check size={16} /></div>
                                    Özel Revize Talepleri
                                </li>
                            </ul>
                            <button
                                onClick={() => window.open(`https://wa.me/905444412180?text=${encodeURIComponent("Merhaba, Pilot Klinik programınız hakkında bilgi almak istiyorum.")}`, '_blank')}
                                className="w-full bg-white text-indigo-700 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
                            >
                                Detaylı Bilgi & Başvuru
                            </button>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-between flex-1">
                            <div>
                                <h3 className="text-lg font-black mb-2">Desteğe mi ihtiyacınız var?</h3>
                                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                                    Fatura işlemleri veya paket seçimleri hakkında her zaman bizimle iletişime geçebilirsiniz.
                                </p>
                            </div>
                            <button
                                onClick={() => (window as any).openSupportModal?.()}
                                className="flex items-center justify-between w-full mt-8 group text-left"
                            >
                                <span className="text-xs font-black uppercase tracking-widest group-hover:text-teal-400 transition-colors">Destek Merkezine Git</span>
                                <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-teal-400 group-hover:text-teal-400 transition-all">
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Ödeme Geçmişi */}
            <div className="pt-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ödeme Geçmişi</h3>
                            <p className="text-xs text-slate-500 font-medium">Geçmiş ödemeleriniz ve fatura dökümleri.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutar</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-slate-400 text-xs">Yükleniyor...</td>
                                    </tr>
                                ) : payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <CreditCard className="h-8 w-8 text-slate-200" />
                                                <p className="text-xs font-bold text-slate-400">Henüz bir ödeme kaydı bulunmuyor.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {new Date(payment.created_at).toLocaleDateString("tr-TR")}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{payment.package_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium capitalize">{payment.billing_period}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-black text-slate-900">{payment.amount.toLocaleString("tr-TR")} {payment.currency}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                    payment.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    <div className={`h-1 w-1 rounded-full ${payment.status === 'paid' ? 'bg-emerald-500' :
                                                        payment.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                                                        }`} />
                                                    {payment.status === 'paid' ? 'Başarılı' : payment.status === 'failed' ? 'Hata' : 'Beklemede'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1 ml-auto">
                                                    Faturayı İndir
                                                    <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
