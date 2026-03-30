"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
    BarChart3,
    Users,
    MessageSquare,
    Activity,
    ShieldCheck,
    MousePointer2,
    Check
} from "lucide-react";

// Importing images
import rapor_genel from "../../rapor.webp"; // Büyük grafikli dashboard
import rapor_siralamalar from "../../rapor-3.webp"; // Sıralama ve dağılım
import rapor_analiz from "../../rapor-2.webp"; // Hekim analitiği kutuları
import mesajlar from "../../akilli-mesaj-asistani.webp";
import hasta_ozet from "../../hasta.webp"; // Profil üst kısım
import hasta_detay from "../../hasta-2.webp"; // Detaylı geçmiş

export function InterfaceShowcase() {
    const [pendingMessages, setPendingMessages] = useState([1, 2, 3]);
    const [activePatientCard, setActivePatientCard] = useState<"ozet" | "detay">("ozet");
    const [activeReport, setActiveReport] = useState(0);

    const reports = [
        { src: rapor_genel, alt: "Diş Kliniği Yönetim Sistemi Raporlama Ekranı" },
        { src: rapor_analiz, alt: "Diş Kliniği Gelişmiş Finansal Analiz ve Hekim Performansı" }
    ];

    const nextReport = () => setActiveReport((prev) => (prev + 1) % reports.length);

    return (
        <section id="showcase" className="py-24 lg:py-40 bg-gradient-to-b from-slate-100 to-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
                        <Activity size={14} className="text-teal-600" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diş Kliniği İşletim Sistemi</span>
                    </div>
                    <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.9]">
                        Klinik Verilerinizi<br /><span className="italic font-serif font-light text-slate-400">Tek Ekranda Görün</span>
                    </h2>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col gap-8">

                    {/* 1. Messaging - FULL WIDTH HORIZONTAL */}
                    <div className="w-full group relative bg-slate-50 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700">
                        <div className="p-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="max-w-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-teal-500 rounded-2xl shadow-lg shadow-teal-100 text-white">
                                        <MessageSquare size={20} />
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">Akıllı Mesaj Asistanı</h3>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Vaktinizi Geri Kazanın</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                                    Randevu hatırlatmaları, ödeme bildirimleri ve memnuniyet anketleri... Hepsi sistem tarafından otomatik bildirilir, gönderdiğinizde tek tıkla listeden temizlenir.
                                </p>
                                {pendingMessages.length === 0 && (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 text-xs font-black uppercase tracking-wider animate-in fade-in slide-in-from-left duration-700">
                                        <ShieldCheck size={16} /> Tüm Bildirimler Gönderildi!
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 w-full relative">
                                <div className={`relative transition-all duration-700 ${pendingMessages.length === 0 ? "opacity-30 blur-sm scale-95" : "opacity-100 scale-100"}`}>
                                    <Image
                                        src={mesajlar}
                                        alt="Diş Kliniği Yönetim Sistemi Akıllı Mesaj Asistanı"
                                        className="w-full h-auto object-contain rounded-2xl shadow-2xl group-hover:scale-[1.03] transition-transform duration-1000"
                                    />

                                    {/* Mock Interactive Buttons overlaid on cards in the image */}
                                    {pendingMessages.includes(1) && (
                                        <button
                                            onClick={() => setPendingMessages(prev => prev.filter(m => m !== 1))}
                                            className="absolute top-[12%] right-[8%] p-2.5 bg-white shadow-xl rounded-xl border border-teal-100 text-teal-600 hover:bg-teal-600 hover:text-white transition-all transform hover:scale-110 active:scale-90 group/btn"
                                            title="Gönderildi Olarak İşaretle"
                                        >
                                            <Check size={18} className="stroke-[3px]" />
                                            <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Gönderildi</span>
                                        </button>
                                    )}
                                    {pendingMessages.includes(2) && (
                                        <button
                                            onClick={() => setPendingMessages(prev => prev.filter(m => m !== 2))}
                                            className="absolute top-[42%] right-[8%] p-2.5 bg-white shadow-xl rounded-xl border border-teal-100 text-teal-600 hover:bg-teal-600 hover:text-white transition-all transform hover:scale-110 active:scale-90 group/btn"
                                            title="Gönderildi Olarak İşaretle"
                                        >
                                            <Check size={18} className="stroke-[3px]" />
                                            <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Gönderildi</span>
                                        </button>
                                    )}
                                    {pendingMessages.includes(3) && (
                                        <button
                                            onClick={() => setPendingMessages(prev => prev.filter(m => m !== 3))}
                                            className="absolute top-[72%] right-[8%] p-2.5 bg-white shadow-xl rounded-xl border border-teal-100 text-teal-600 hover:bg-teal-600 hover:text-white transition-all transform hover:scale-110 active:scale-90 group/btn"
                                            title="Gönderildi Olarak İşaretle"
                                        >
                                            <Check size={18} className="stroke-[3px]" />
                                            <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Gönderildi</span>
                                        </button>
                                    )}
                                </div>

                                {pendingMessages.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                        <button
                                            onClick={() => setPendingMessages([1, 2, 3])}
                                            className="px-6 py-3 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-teal-700 transition-all flex items-center gap-2"
                                        >
                                            <Activity size={16} /> Listeyi Yenile
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Middle Grid: Dashboard & Patient */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Dashboard Overview */}
                        <div className="lg:col-span-8 group relative bg-slate-50 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700">
                            <div className="p-10 pb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                                        <BarChart3 className="text-white" size={20} />
                                    </div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[11px]">Dental Analiz Merkezi</h3>
                                </div>
                            </div>
                            <div className="px-10 pb-10">
                                <Image
                                    src={rapor_siralamalar}
                                    alt="Diş Kliniği Yönetimi Akıllı Analiz Merkezi"
                                    className="w-full h-auto object-contain rounded-2xl shadow-2xl border border-white group-hover:scale-[1.01] transition-transform duration-1000"
                                />
                            </div>
                        </div>

                        {/* Patient Profile - COMPACT */}
                        <div className="lg:col-span-4 group relative bg-slate-50 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col">
                            <div className="p-10 pb-6">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 bg-rose-500 rounded-2xl shadow-lg shadow-rose-100">
                                        <Users className="text-white" size={20} />
                                    </div>
                                    <div className="flex bg-white rounded-xl p-1 border border-slate-200">
                                        <button
                                            onClick={() => setActivePatientCard("ozet")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activePatientCard === "ozet" ? "bg-slate-900 text-white" : "text-slate-400"}`}
                                        >
                                            Özet
                                        </button>
                                        <button
                                            onClick={() => setActivePatientCard("detay")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activePatientCard === "detay" ? "bg-slate-900 text-white" : "text-slate-400"}`}
                                        >
                                            Detay
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 pb-10 flex flex-col justify-between flex-grow">
                                <div className="relative">
                                    <div className={`transition-all duration-700 ${activePatientCard === "ozet" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none translate-y-4"}`}>
                                        <Image src={hasta_ozet} alt="Diş Kliniği Paneli Hasta Bilgi Kartı Özet" className="w-full h-auto object-contain rounded-2xl shadow-xl border border-white" />
                                    </div>
                                    <div className={`transition-all duration-700 ${activePatientCard === "detay" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none translate-y-4"}`}>
                                        <Image src={hasta_detay} alt="Diş Kliniği Hasta Bilgi Kartı Detay" className="w-full h-auto object-contain rounded-2xl shadow-xl border border-white" />
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <h4 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-2">Bütünleşik Hasta Kartı</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        {activePatientCard === "ozet" ? "Ad-soyad, telefon ve ödeme istatistikleri." : "Tıbbi geçmiş, hekim notları ve röntgenler."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Detailed Excellence - THE BLACK CARD */}
                    <div className="w-full group relative bg-black rounded-[4rem] overflow-hidden shadow-3xl shadow-slate-400 transition-all duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900/40 to-black z-10"></div>
                        <div className="p-12 md:p-20 relative z-20 flex flex-col lg:flex-row items-center gap-16">
                            <div className="max-w-lg lg:shrink-0">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-black text-teal-400 uppercase tracking-widest mb-8">
                                    <ShieldCheck size={14} /> Kusursuz Veri Yönetimi
                                </div>
                                <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                                    Detaylarda Gizli <br /> <span className="text-white/40 italic font-serif font-light">Mükemmellik</span>
                                </h3>
                                <p className="text-white/60 text-lg font-medium leading-relaxed mb-8">
                                    Diş kliniği yönetiminin her aşamasını dijitalleştiren bu yapı, hataya yer bırakmaz. Verileriniz her saniye güvende ve muayenehanenizde elinizin altında.
                                </p>
                            </div>
                            <div
                                className="flex-grow w-full cursor-pointer group/report relative select-none"
                                onClick={nextReport}
                            >
                                <div className="relative overflow-hidden rounded-[2rem]">
                                    {reports.map((report, idx) => (
                                        <div
                                            key={idx}
                                            className={`transition-all duration-700 ${activeReport === idx ? "opacity-100 scale-100 relative z-10" : "opacity-0 scale-95 absolute inset-0 pointer-events-none"}`}
                                        >
                                            <Image
                                                src={report.src}
                                                alt={report.alt}
                                                className="w-full h-auto object-contain rounded-[2rem] shadow-[-20px_20px_60px_rgba(0,0,0,0.8)] group-hover/report:scale-[1.02] transition-all duration-1000"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Click interaction hint */}
                                <div className="absolute -bottom-6 -right-6 bg-white/10 backdrop-blur-xl border border-white/20 text-white p-4 rounded-3xl shadow-2xl z-20 group-hover/report:bg-teal-500/90 group-hover/report:scale-110 transition-all duration-500 group-active:scale-90 overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <MousePointer2 size={18} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Tıkla & Değiştir</span>
                                    </div>
                                </div>

                                {/* Pagination Dots */}
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                                    {reports.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 transition-all duration-500 rounded-full ${activeReport === i ? "w-10 bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.6)]" : "w-4 bg-white/20"}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Detail */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-slate-100">
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 uppercase tracking-widest">99.9%</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uptime Garantisi</p>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 uppercase tracking-widest">256-Bit</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Veri Şifreleme</p>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 uppercase tracking-widest">7/24</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canlı Destek</p>
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 uppercase tracking-widest">Bulut</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Her Cihazdan Erişim</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
