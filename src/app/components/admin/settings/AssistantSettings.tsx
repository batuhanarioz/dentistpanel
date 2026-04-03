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
    { key: "{amount}", label: "ÖDEME TUTARI", color: "from-emerald-500 to-emerald-600" },
    { key: "{clinic_name}", label: "KLİNİK ADI", color: "from-rose-500 to-rose-600" }
];

type MessageType = "REMINDER" | "SATISFACTION" | "PAYMENT" | "BIRTHDAY" | "DELAY" | "FOLLOWUP" | "INCOMPLETE" | "NEW_PATIENT" | "LAB_TRACKING";

const DEFAULT_TEMPLATES: Record<MessageType, string> = {
    REMINDER: "Sayın {patient_name}, bugün saat {appointment_time}'da {clinic_name} bünyesinde Dr. {doctor_name} ile randevunuz bulunmaktadır. Lütfen randevu saatinizden 10 dakika önce klinikte olunuz.",
    SATISFACTION: "Sayın {patient_name}, kliniğimizdeki bugünkü tedaviniz tamamlanmıştır. Deneyiminizi iyileştirmemize yardımcı olmak için lütfen kısa anketimizi doldurur musunuz? Teşekkürler.",
    PAYMENT: "Sayın {patient_name}, {appointment_date} tarihli tedaviniz için kalan ödemeniz {amount} TL'dir. En kısa sürede kliniğimizle iletişime geçmenizi rica ederiz.",
    BIRTHDAY: "Sayın {patient_name}, {clinic_name} ailesi olarak yeni yaşınızı kutlar, sağlıklı ve mutlu yıllar dileriz. Doğum gününüz kutlu olsun! 🎉",
    DELAY: "Sayın {patient_name}, kliniğimizdeki yoğunluk nedeniyle randevu saatinizde {appointment_time} dakikalık bir gecikme yaşanacaktır. Anlayışınız için teşekkür ederiz.",
    FOLLOWUP: "Sayın {patient_name}, operasyon sonrası durumunuzu merak ediyoruz. Herhangi bir ağrı veya beklenmedik bir durum yaşamanız halinde lütfen kliniğimizi arayınız.",
    INCOMPLETE: "Hoş geldiniz Sayın {patient_name}, profil bilgilerinizde eksiklik bulunmaktadır. Daha iyi hizmet verebilmemiz için lütfen kayıt birimine uğrayınız.",
    NEW_PATIENT: "Hoş geldiniz Sayın {patient_name}! {clinic_name} ailesine katıldığınız için teşekkür ederiz. Randevularınız ve tedavileriniz için her zaman yanınızdayız.",
    LAB_TRACKING: "Sayın {patient_name}, laboratuvar işlemleriniz tamamlanmıştır. Randevu oluşturmak için kliniğimizle iletişime geçebilirsiniz."
};

const MESSAGE_LABELS: Record<MessageType, string> = {
    REMINDER: 'Hatırlat', SATISFACTION: 'Memnuniyet', PAYMENT: 'Ödeme', BIRTHDAY: 'Doğum',
    DELAY: 'Gecikme', FOLLOWUP: 'Cerrahi', INCOMPLETE: 'Eksik', NEW_PATIENT: 'Yeni', LAB_TRACKING: 'Lab'
};

const MESSAGE_ICONS: Record<MessageType, string> = {
    REMINDER: "⏰", SATISFACTION: "⭐️", PAYMENT: "💳", BIRTHDAY: "🎂",
    DELAY: "⏳", FOLLOWUP: "🩹", INCOMPLETE: "⚠️", NEW_PATIENT: "👋", LAB_TRACKING: "🧪"
};

const MESSAGE_TITLES: Record<MessageType, string> = {
    REMINDER: 'Randevu Hatırlatıcı', SATISFACTION: 'Memnuniyet Anketi', PAYMENT: 'Ödeme Takip',
    BIRTHDAY: 'Doğum Günü Kutlama', DELAY: 'Gecikme Uyarısı', FOLLOWUP: 'Operasyon Takip',
    INCOMPLETE: 'Eksik Veri Takibi', NEW_PATIENT: 'Hoş Geldin Mesajı', LAB_TRACKING: 'Laboratuvar Takip'
};

const MESSAGE_DESCS: Record<MessageType, string> = {
    REMINDER: 'Randevudan önce hastaya onay mesajı iletir.', SATISFACTION: 'Tedavi sonrası anket gönderir.',
    PAYMENT: 'Ödemesi gecikenlere hatırlatma yapar.', BIRTHDAY: 'Özel kutlama mesajları iletir.',
    DELAY: 'İşlem başlamamışsa personeli uyarır.', FOLLOWUP: 'Operasyon sonrası durumu sorar.',
    INCOMPLETE: 'Eksik veri uyarısı verir.', NEW_PATIENT: 'Hoş geldin mesajı yollar.', LAB_TRACKING: 'Laboratuvar takibi yapar.'
};

export function AssistantSettings() {
    const clinic = useClinic();
    const [localSettings, setLocalSettings] = useState<ClinicSettings | null>(clinic.clinicSettings);
    const [activeMessage, setActiveMessage] = useState<MessageType>("REMINDER");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (clinic.clinicSettings) setLocalSettings(clinic.clinicSettings);
    }, [clinic.clinicSettings]);

    const handleSaveAssistant = async () => {
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
                setSaveMessage({ type: 'success', text: "Ayarlar başarıyla kaydedildi." });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch {
            setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const updateMessageTemplate = (type: MessageType, text: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            message_templates: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...((localSettings.message_templates || {}) as Record<string, string>) as any,
                [type]: text
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateTiming = (type: MessageType, field: string, value: any) => {
        if (!localSettings) return;
        const currentTimings = (localSettings.assistant_timings as Record<string, { value: number; unit: string }>) || {};
        const currentTypeTiming = currentTimings[type] || { value: 1, unit: 'hours' };
        setLocalSettings({
            ...localSettings,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assistant_timings: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(currentTimings as any),
                [type]: { ...currentTypeTiming, [field]: value }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        });
    };

    const renderPreview = (text: string) => {
        return text
            .replace(/{patient_name}/g, "Zeynep")
            .replace(/{patient_surname}/g, "Arslan")
            .replace(/{appointment_time}/g, "14:30")
            .replace(/{appointment_date}/g, "25.04.2024")
            .replace(/{doctor_name}/g, "Dt. Selin Yıldız")
            .replace(/{amount}/g, "1.250")
            .replace(/{clinic_name}/g, clinic.clinicName || "Klinik");
    };

    if (!localSettings) return null;

    const timings = (localSettings.assistant_timings as Record<string, { value: number; unit: string }>) || {};
    const activeTiming = timings[activeMessage] || { value: 1, unit: 'hours' };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[32px] border border-slate-200/60 p-5 sm:p-8 shadow-xl shadow-slate-200/20 relative overflow-hidden group/container">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover/container:bg-indigo-500/10 transition-colors duration-700" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover/container:bg-violet-500/10 transition-colors duration-700" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Akıllı Mesaj Asistanı</h2>
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Otomatik İletişim</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <button
                            onClick={handleSaveAssistant}
                            disabled={isLoading}
                            className="h-11 px-7 rounded-2xl bg-indigo-600 text-white text-[11px] font-black shadow-lg shadow-indigo-100/80 hover:shadow-indigo-200/90 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/save"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                                <svg className="w-4 h-4 group-hover/save:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            }
                            Kaydet
                        </button>
                    </div>
                </div>

                {/* Mobile Fixed Save Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                    <button
                        onClick={handleSaveAssistant}
                        disabled={isLoading}
                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> :
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        }
                        AYARLARI KAYDET
                    </button>
                </div>

                {saveMessage && (
                    <div className={`mb-8 p-5 rounded-[24px] border text-sm font-bold animate-in zoom-in-95 slide-in-from-top-4 flex items-center gap-4 transition-all duration-300 relative z-10 ${saveMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100/50 text-emerald-800 shadow-lg shadow-emerald-500/5'
                        : 'bg-rose-50 border-rose-100/50 text-rose-800 shadow-lg shadow-rose-500/5'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${saveMessage.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={saveMessage.type === 'success' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                            </svg>
                        </div>
                        {saveMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                    {/* Left: Message Type Tabs */}
                    <div className="md:col-span-4 lg:col-span-3 space-y-2.5 pr-0 md:pr-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">İletişim Türleri</h3>
                        <div className="relative">
                            <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-hide snap-x snap-mandatory">
                                {(["REMINDER", "SATISFACTION", "PAYMENT", "BIRTHDAY", "DELAY", "FOLLOWUP", "INCOMPLETE", "NEW_PATIENT", "LAB_TRACKING"] as MessageType[]).map((type) => {
                                    const isActive = activeMessage === type;
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setActiveMessage(type)}
                                            className={`group/cat w-auto md:w-full flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl transition-all duration-300 relative shrink-0 md:shrink snap-center ${isActive
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50 border border-indigo-400/30'
                                                : 'hover:bg-slate-50 border border-transparent text-slate-500'
                                                }`}
                                        >
                                            <span className={`text-base transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60'}`}>
                                                {MESSAGE_ICONS[type]}
                                            </span>
                                            <span className={`text-[11px] font-black whitespace-nowrap tracking-tight ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                                {MESSAGE_LABELS[type]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Editor & Preview */}
                    <div className="md:col-span-8 lg:col-span-9">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            <div className="space-y-8">
                                {/* Explainer */}
                                <div className="p-3.5 rounded-[22px] bg-indigo-50/40 border border-indigo-100/50 mb-3 animate-in slide-in-from-right-4 duration-500 group/guide relative overflow-hidden">
                                    <div className="flex gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-indigo-100/50">
                                            <span className="text-base">💡</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-0.5">{MESSAGE_TITLES[activeMessage]}</h4>
                                            <p className="text-[10px] text-indigo-700/70 font-bold leading-tight italic">{MESSAGE_DESCS[activeMessage]}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Timing */}
                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3 shadow-inner">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-3 bg-indigo-600 rounded-full" />
                                        Zamanlama
                                    </h4>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="number"
                                                    value={activeTiming.value}
                                                    onChange={(e) => updateTiming(activeMessage, 'value', parseInt(e.target.value))}
                                                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none shadow-sm"
                                                />
                                            </div>
                                            <div className="flex-[1.5]">
                                                <select
                                                    value={activeTiming.unit}
                                                    onChange={(e) => updateTiming(activeMessage, 'unit', e.target.value)}
                                                    className="w-full h-10 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none shadow-sm appearance-none cursor-pointer"
                                                >
                                                    <option value="minutes">Dakika</option>
                                                    <option value="hours">Saat</option>
                                                    <option value="days">Gün</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white border border-indigo-100/50 rounded-2xl">
                                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                                🔍 Randevu saatinden <span className="text-indigo-600">{activeTiming.value} {activeTiming.unit === 'minutes' ? 'dakika' : activeTiming.unit === 'hours' ? 'saat' : 'gün'}</span> {activeMessage === 'REMINDER' ? 'önce' : 'sonra'} kliniğe asistan hatırlatma bildirimi gönderilecektir.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Editor */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                            Mesaj Taslağı
                                        </h4>
                                        <button
                                            onClick={() => setShowResetConfirm(true)}
                                            className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all duration-300 flex items-center gap-2 border border-slate-200/50 group/reset"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover/reset:shadow-sm transition-all group-hover/reset:rotate-180 duration-500">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                </svg>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Varsayılan Temaya Dön</span>
                                        </button>
                                    </div>

                                    {showResetConfirm && (
                                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowResetConfirm(false)} />
                                            <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100/50">
                                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-xl font-black text-slate-900 mb-2">Taslağı Sıfırla</h3>
                                                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                                                        Seçili taslağı profesyonel varsayılan haline döndürmek istediğinize emin misiniz? <br /><b className="text-indigo-600">Bu işlem geri alınamaz.</b>
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setShowResetConfirm(false)}
                                                            className="flex-1 px-6 py-3.5 rounded-2xl bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                                        >
                                                            Vazgeç
                                                        </button>
                                                        <button
                                                            onClick={() => { updateMessageTemplate(activeMessage, DEFAULT_TEMPLATES[activeMessage]); setShowResetConfirm(false); }}
                                                            className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100/50 transition-all active:scale-95"
                                                        >
                                                            Evet, Sıfırla
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative group/editor bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm focus-within:ring-8 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all">
                                        <textarea
                                            id={`template-editor-${activeMessage}`}
                                            value={(localSettings.message_templates as Record<string, string>)?.[activeMessage] || ""}
                                            onChange={(e) => updateMessageTemplate(activeMessage, e.target.value)}
                                            spellCheck="false"
                                            rows={6}
                                            className="w-full bg-transparent p-7 text-sm font-semibold leading-relaxed text-slate-900 caret-indigo-600 outline-none transition-all resize-none z-20 relative custom-scrollbar overflow-y-auto"
                                            style={{ fontFamily: 'inherit' }}
                                            placeholder="Mesajınızı yazın..."
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {PLACEHOLDERS.map(p => (
                                            <button
                                                key={p.key}
                                                onClick={() => {
                                                    const textarea = document.getElementById(`template-editor-${activeMessage}`) as HTMLTextAreaElement;
                                                    if (textarea) {
                                                        const start = textarea.selectionStart;
                                                        const end = textarea.selectionEnd;
                                                        const currentText = (localSettings.message_templates as Record<string, string>)?.[activeMessage] || "";
                                                        const newText = currentText.substring(0, start) + p.key + currentText.substring(end);
                                                        updateMessageTemplate(activeMessage, newText);
                                                        setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + p.key.length, start + p.key.length); }, 0);
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-xl bg-gradient-to-r ${p.color} text-white text-[9px] font-black uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-sm border border-white/20`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold italic px-1">
                                        💡 <span className="text-indigo-500 font-black">{"{...}"}</span> etiketlerini kullanarak mesajı kişiselleştirebilirsiniz. Yukarıdaki butonlara basarak otomatik ekleme yapabilirsiniz.
                                    </p>
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div className="flex flex-col items-center lg:items-end xl:items-center">
                                <div className="relative w-72 h-[600px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-8 ring-slate-800 scale-90 lg:scale-[0.85] xl:scale-100 origin-top">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-30 flex items-center justify-center">
                                        <div className="w-10 h-1 bg-slate-800 rounded-full" />
                                    </div>
                                    <div className="w-full h-full bg-[#E5DDD5] rounded-[38px] overflow-hidden flex flex-col relative border-4 border-slate-900/10">
                                        <div className="h-6 bg-[#075E54] w-full flex justify-between items-center px-6 pt-1 text-[8px] text-white/80 font-bold">
                                            <span>10:45</span>
                                            <div className="flex items-center gap-1">
                                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> 100%
                                            </div>
                                        </div>
                                        <div className="bg-[#075E54] p-4 flex items-center gap-3 shadow-md relative z-10">
                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                                <div className="w-full h-full bg-indigo-500/40 flex items-center justify-center text-[10px] text-white font-black italic">IDK</div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-black truncate leading-tight uppercase tracking-tight">{clinic.clinicName || "Dentist Panel"}</p>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                                                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-tighter">İşletme Hesabı</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-lg shadow-slate-900/5 max-w-[90%] relative animate-in slide-in-from-left-4 duration-500">
                                                <p className="text-[12px] leading-relaxed text-slate-800 font-bold whitespace-pre-wrap">
                                                    {renderPreview((localSettings.message_templates as Record<string, string>)?.[activeMessage] || "")}
                                                </p>
                                                <div className="flex justify-end mt-2 items-center gap-1">
                                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">10:45</span>
                                                    <svg className="w-3.5 h-3.5 text-[#34B7F1]" fill="currentColor" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-4.24l-1.41-1.41L9 13.17 4.17 8.35c-.78-.78-2.04-.78-2.82 0-.78.78-.78 2.04 0 2.82l6.24 6.24c.78.78 2.05.78 2.83 0l12.82-12.82z" /></svg>
                                                </div>
                                                <div className="absolute -left-2.5 top-0 w-3 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                                            </div>
                                        </div>
                                        <div className="bg-[#f0f2f5]/95 backdrop-blur p-3 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shrink-0">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                                            </div>
                                            <div className="flex-1 h-10 bg-white rounded-full border border-slate-200/50 px-4 flex items-center border">
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full" />
                                            </div>
                                            <div className="w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#128C7E]/20 shrink-0">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-10 text-center w-full">
                                        <span className="bg-slate-800 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border border-slate-700">CANLI ÖNİZLEME</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
