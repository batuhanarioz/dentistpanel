"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { ClinicSettings } from "@/types/database";
import { updateClinicSettings } from "@/lib/api";

const PLACEHOLDERS = [
    { key: "{patient_name}", label: "HASTA ADI", color: "from-indigo-500 to-indigo-600" },
    { key: "{patient_surname}", label: "HASTA SOYADI", color: "from-indigo-400 to-indigo-500" },
    { key: "{appointment_time}", label: "RANDEVU SAATİ", color: "from-violet-500 to-violet-600" },
    { key: "{appointment_date}", label: "RANDEVU TARİHİ", color: "from-sky-500 to-sky-600" },
    { key: "{doctor_name}", label: "HEKİM ADI", color: "from-violet-400 to-violet-500" },
    { key: "{clinic_name}", label: "KLİNİK ADI", color: "from-rose-500 to-rose-600" }
];

type WhatsAppMessageType = "ONLINE_APPROVE" | "ONLINE_REJECT" | "ONLINE_LOCATION";

const DEFAULT_TEMPLATES: Record<WhatsAppMessageType, string> = {
    ONLINE_APPROVE: "Sayın {patient_name}, {clinic_name} bünyesindeki randevu talebiniz onaylanmıştır. {appointment_date} günü saat {appointment_time}'da sizinle görüşmek üzere. Sağlıklı günler dileriz.",
    ONLINE_REJECT: "Sayın {patient_name}, {appointment_date} tarihli randevu talebiniz kliniğimizdeki yoğunluk nedeniyle onaylanamamıştır. Size daha uygun bir saat planlamak için lütfen bizi arayınız.",
    ONLINE_LOCATION: "Sayın {patient_name}, kliniğimizin konumu şöyledir: https://maps.google.com/?q={clinic_name}. Gidiş hattını bu link üzerinden takip edebilirsiniz. Bekliyoruz."
};

const WA_ICONS: Record<WhatsAppMessageType, string> = {
    ONLINE_APPROVE: "✅", ONLINE_REJECT: "❌", ONLINE_LOCATION: "📍"
};

const WA_TITLES: Record<WhatsAppMessageType, string> = {
    ONLINE_APPROVE: 'Randevu Onay Mesajı', ONLINE_REJECT: 'Randevu Red Mesajı', ONLINE_LOCATION: 'Konum Paylaşımı'
};

const WA_DESCS: Record<WhatsAppMessageType, string> = {
    ONLINE_APPROVE: 'Randevu onaylandığında hastaya gidecek profesyonel taslak.', 
    ONLINE_REJECT: 'Randevu onaylanamadığında hastaya çözüm sunan taslak.',
    ONLINE_LOCATION: 'Hastaların kliniği bulmasını kolaylaştıran konum taslağı.'
};

export function WhatsAppSettings() {
    const clinic = useClinic();
    const [localSettings, setLocalSettings] = useState<ClinicSettings | null>(clinic.clinicSettings);
    const [activeMessage, setActiveMessage] = useState<WhatsAppMessageType>("ONLINE_APPROVE");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (clinic.clinicSettings) setLocalSettings(clinic.clinicSettings);
    }, [clinic.clinicSettings]);

    const handleSave = async () => {
        if (!clinic.clinicId || !localSettings) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const { error } = await updateClinicSettings(clinic.clinicId, {
                ...localSettings,
                appointment_channels: clinic.clinicSettings?.appointment_channels ?? []
            });
            if (error) {
                setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
            } else {
                await clinic.refreshClinicData?.();
                setSaveMessage({ type: 'success', text: "Ayarlar başarıyla kaydedildi." });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch {
            setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const updateMessageTemplate = (type: WhatsAppMessageType, text: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            message_templates: {
                ...((localSettings.message_templates || {}) as Record<string, string>) as any,
                [type]: text
            }
        });
    };

    const renderPreview = (text: string) => {
        return text
            .replace(/{patient_name}/g, "Zeynep")
            .replace(/{patient_surname}/g, "Arslan")
            .replace(/{appointment_time}/g, "14:30")
            .replace(/{appointment_date}/g, "25.04.2024")
            .replace(/{doctor_name}/g, "Dt. Selin Yıldız")
            .replace(/{clinic_name}/g, clinic.clinicName || "Klinik");
    };

    if (!localSettings) return null;

    const currentTemplate = (localSettings.message_templates as Record<string, string>)?.[activeMessage] || DEFAULT_TEMPLATES[activeMessage];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Bilgi Kartı - Görünürlük Düzeltildi - Renk Yumuşatıldı */}
            <div className="bg-emerald-600 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-100/50 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-xl shadow-inner">📲</div>
                        <div>
                            <h2 className="text-base font-black uppercase tracking-widest">NASIL KULLANILIR?</h2>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter text-emerald-100">Online Randevu Asistanı • WhatsApp Taslakları</p>
                        </div>
                    </div>
                    <div className="max-w-3xl space-y-2">
                        <p className="text-xs font-black leading-relaxed">
                            Bu bölümdeki taslaklar, <span className="underline underline-offset-4 decoration-white/40 font-black">"Online Randevu Yönetimi"</span> sayfasındaki hızlı cevap butonlarında hazır olarak karşınıza çıkar.
                        </p>
                        <p className="text-[11px] font-bold opacity-90 leading-relaxed bg-emerald-700/30 p-3 rounded-2xl border border-white/10">
                            Hastaya tek tek mesaj yazmak yerine; Onay, Red veya Konum butonlarına bastığınızda burada tanımladığınız şablonlar WhatsApp'ınıza otomatik akar. 
                            Dinamik değişkenleri (Mavi/Mor butonlar) kullanarak mesajın hastaya özel (Adı, Saati vb.) hazırlanmasını sağlayabilirsiniz.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200/60 p-5 sm:p-8 shadow-xl shadow-slate-200/20 relative overflow-hidden group/container">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover/container:bg-emerald-500/10 transition-colors duration-700" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
                    <div className="space-y-1">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                            WhatsApp Taslak Yönetimi
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Profesyonel İletişim Şablonları</p>
                    </div>
                    <div className="hidden lg:block">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="h-12 px-8 rounded-2xl bg-emerald-600 text-white text-[11px] font-black shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/save"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771z" /></svg>
                            }
                            TASLAKLARI VERİTABANINA KAYDET
                        </button>
                    </div>
                </div>

                {saveMessage && (
                    <div className={`mb-8 p-5 rounded-[24px] border text-sm font-bold flex items-center gap-4 relative z-10 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                        {saveMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                    <div className="md:col-span-4 lg:col-span-3 space-y-2.5 pr-0 md:pr-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Taslak Seçimi</h3>
                        {(["ONLINE_APPROVE", "ONLINE_REJECT", "ONLINE_LOCATION"] as WhatsAppMessageType[]).map((type) => {
                            const isActive = activeMessage === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setActiveMessage(type)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'hover:bg-slate-50 text-slate-500 bg-slate-50/30'}`}
                                >
                                    <span className="text-base">{WA_ICONS[type]}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{type === "ONLINE_APPROVE" ? "ONAY MESAJI" : type === "ONLINE_REJECT" ? "RED MESAJI" : "KONUM PAYLAŞIMI"}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="md:col-span-8 lg:col-span-9">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            <div className="space-y-6">
                                <div className="p-4 rounded-[22px] bg-emerald-50/40 border border-emerald-100/50">
                                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-1">{WA_TITLES[activeMessage]}</h4>
                                    <p className="text-[10px] text-emerald-700/70 font-bold italic">{WA_DESCS[activeMessage]}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Metin Editörü</h4>
                                        <button onClick={() => setShowResetConfirm(true)} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Fabrika Ayarlarına Dön</button>
                                    </div>

                                    <div className="relative bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm focus-within:ring-8 focus-within:ring-emerald-500/5 focus-within:border-emerald-500/30 transition-all">
                                        <textarea
                                            id={`wa-template-editor-${activeMessage}`}
                                            value={currentTemplate}
                                            onChange={(e) => updateMessageTemplate(activeMessage, e.target.value)}
                                            rows={6}
                                            className="w-full bg-transparent p-6 text-sm font-semibold leading-relaxed text-slate-800 outline-none resize-none"
                                            placeholder="WhatsApp mesajınızı buraya yazın..."
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {PLACEHOLDERS.map(p => (
                                            <button
                                                key={p.key}
                                                onClick={() => {
                                                    const textarea = document.getElementById(`wa-template-editor-${activeMessage}`) as HTMLTextAreaElement;
                                                    if (textarea) {
                                                        const start = textarea.selectionStart;
                                                        const newText = currentTemplate.substring(0, start) + p.key + currentTemplate.substring(textarea.selectionEnd);
                                                        updateMessageTemplate(activeMessage, newText);
                                                        setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + p.key.length, start + p.key.length); }, 0);
                                                    }
                                                }}
                                                className={`px-2 py-1.5 rounded-lg bg-gradient-to-r ${p.color} text-white text-[8px] font-black uppercase tracking-tighter hover:scale-105 transition-all`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="relative w-64 h-[500px] bg-slate-900 rounded-[40px] p-2.5 shadow-2xl ring-4 ring-slate-800 origin-top scale-[0.9]">
                                    <div className="w-full h-full bg-[#E5DDD5] rounded-[32px] overflow-hidden flex flex-col relative">
                                        <div className="bg-emerald-800 p-3 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[10px] text-white">WA</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-[10px] font-black truncate">{clinic.clinicName || "Klinik"}</p>
                                                <p className="text-white/70 text-[8px] font-bold">İşletme Hesabı</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                            <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[90%] relative">
                                                <p className="text-[10px] leading-relaxed text-slate-800 font-bold whitespace-pre-wrap">
                                                    {renderPreview(currentTemplate)}
                                                </p>
                                                <p className="text-[8px] text-slate-400 text-right mt-1">10:45 ✓✓</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-8 text-center w-full">
                                        <span className="bg-slate-800 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">ÖNİZLEME MOTORU</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {showResetConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl">
                            <h3 className="text-lg font-black text-slate-900 mb-2">Taslağı Sıfırla</h3>
                            <p className="text-sm font-medium text-slate-500 mb-6">Varsayılan taslağa dönmek istediğinize emin misiniz?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-11 bg-slate-50 text-slate-500 rounded-xl font-black text-[10px] uppercase">Vazgeç</button>
                                <button onClick={() => { updateMessageTemplate(activeMessage, DEFAULT_TEMPLATES[activeMessage]); setShowResetConfirm(false); }} className="flex-1 h-11 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase">Sıfırla</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
