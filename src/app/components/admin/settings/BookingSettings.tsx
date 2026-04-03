"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { QRCodeGenerator } from "../../ui/QRCodeGenerator";
import { PremiumFeatureModal } from "../../ui/PremiumFeatureModal";
import { useConfirm } from "@/app/context/ConfirmContext";
import { toast } from "react-hot-toast";

export function BookingSettings() {
    const { confirm } = useConfirm();
    const clinic = useClinic();
    const [showRestrictModal, setShowRestrictModal] = useState(false);
    const [isOnlineBookingEnabled, setIsOnlineBookingEnabled] = useState(
        clinic.clinicSettings?.is_online_booking_enabled ?? false
    );
    const [onlineBookingConfig, setOnlineBookingConfig] = useState(
        clinic.clinicSettings?.online_booking_config ?? {
            use_service_duration: true,
            slot_duration: 30,
            buffer_time: 10,
            min_lead_time_hours: 2,
            pending_expiry_hours: 12,
            max_days_ahead: 30,
            slot_display_interval: 15,
            allowed_services: [],
            required_fields: ["phone", "full_name"]
        }
    );
    const [isSettingsConfirmed, setIsSettingsConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isEligible = clinic.subscriptionStatus === 'active' || clinic.billingCycle === 'pilot';

    useEffect(() => {
        if (clinic.clinicSettings) {
            setIsOnlineBookingEnabled(clinic.clinicSettings.is_online_booking_enabled ?? false);
            if (clinic.clinicSettings.online_booking_config) {
                setOnlineBookingConfig(clinic.clinicSettings.online_booking_config);
            }
        }
    }, [clinic.clinicSettings]);

    const handleSaveConfig = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("clinic_settings")
                .upsert({
                    clinic_id: clinic.clinicId,
                    is_online_booking_enabled: isOnlineBookingEnabled,
                    online_booking_config: onlineBookingConfig
                }, { onConflict: 'clinic_id' });
            if (error) throw error;
            setSaveMessage({ type: "success", text: "Tüm yapılandırmalar başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSaveMessage({ type: "error", text: `Hata: ${(err as any).message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleEnabled = async () => {
        if (!clinic.clinicId) return;

        // Restriction Check
        if (!isEligible && !isOnlineBookingEnabled) {
            setShowRestrictModal(true);
            return;
        }

        const confirmMsg = isOnlineBookingEnabled
            ? "Sistemi kapatmak üzeresiniz. Randevu alımı durdurulacak. Onaylıyor musunuz?"
            : "Sistemi aktif hale getiriyorsunuz. Hastalar randevu alabilecek. Devam edilsin mi?";

        confirm({
            title: isOnlineBookingEnabled ? "Sistemi Kapat" : "Sistemi Aktif Et",
            message: confirmMsg,
            variant: isOnlineBookingEnabled ? "danger" : "info",
            onConfirm: async () => {
                if (!isOnlineBookingEnabled && !isSettingsConfirmed) {
                    toast.error("Lütfen önce tüm ayarları gözden geçirdiğinizi onaylayın.");
                    return;
                }
                setIsLoading(true);
                try {
                    const newVal = !isOnlineBookingEnabled;
                    const { error } = await supabase
                        .from("clinic_settings")
                        .upsert({
                            clinic_id: clinic.clinicId,
                            is_online_booking_enabled: newVal,
                            online_booking_config: onlineBookingConfig
                        }, { onConflict: 'clinic_id' });
                    if (error) throw error;
                    setIsOnlineBookingEnabled(newVal);
                    if (newVal) setIsSettingsConfirmed(false);
                    setSaveMessage({ type: "success", text: `Sistem başarıyla ${newVal ? 'aktif' : 'pasif'} edildi.` });
                    setTimeout(() => setSaveMessage(null), 3000);
                } catch {
                    setSaveMessage({ type: "error", text: "Bir hata oluştu." });
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    if (!clinic.clinicId) return null;

    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clinic.nextgency360.com'}/randevu/${clinic.clinicSlug}`;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">

                {/* ── 1. HEADER + DURUM GÖSTERGESİ ── */}
                <div className="p-5 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/30 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">Online Randevu Portalı</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Dijital Erişim Ayarları</p>
                        </div>
                    </div>

                    {/* Pulse Durum Göstergesi */}
                    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-sm transition-all ${isOnlineBookingEnabled
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-100 border-slate-200'
                        }`}>
                        <span className={`relative flex h-2.5 w-2.5`}>
                            {isOnlineBookingEnabled && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnlineBookingEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOnlineBookingEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isOnlineBookingEnabled ? 'SİSTEM AKTİF' : 'SİSTEM PASİF'}
                        </span>
                    </div>
                </div>

                {/* Save Message */}
                {saveMessage && (
                    <div className={`mx-8 mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                        {saveMessage.text}
                    </div>
                )}

                {/* ── 2. BİLGİ KARTI (Sistem Açıklaması) ── */}
                <div className="px-8 pt-8">
                    <div className="p-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-lg font-black uppercase tracking-tight mb-1">Bu Sistem Nasıl Çalışır?</h4>
                            <p className="text-white/70 text-[11px] font-bold mb-5 uppercase tracking-widest">Online randevu modülüne genel bakış</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    {
                                        step: "1",
                                        title: "Hasta Erişimi",
                                        text: "Hastalar, paylaştığınız link veya QR kod ile size özel randevu portalına ulaşır. Ad, soyad ve telefon bilgilerini girerek devam ederler."
                                    },
                                    {
                                        step: "2",
                                        title: "Akıllı Takvim",
                                        text: "Hekimlerinizin güncel çalışma saatleri ve belirlediğiniz tedavi süreleri baz alınarak müsait slotlar otomatik hesaplanır. Çakışan slotlar gösterilmez."
                                    },
                                    {
                                        step: "3",
                                        title: "Onay Süreci",
                                        text: "Hasta uygun slotu seçer ve randevu isteği sisteme düşer. 'Otomatik Onay' kapalıysa siz onaylayana kadar randevu takvime işlenmez."
                                    }
                                ].map(({ step, title, text }) => (
                                    <div key={step} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">{step}</div>
                                            <span className="text-xs font-black uppercase tracking-wide">{title}</span>
                                        </div>
                                        <p className="text-xs font-bold leading-relaxed opacity-80">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3. AYARLAR (Settings Grid) ── */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sol: Rezervasyon Kuralları */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Rezervasyon Kuralları</h4>
                        </div>

                        {/* Manuel onay bilgi bandı */}
                        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <span className="text-lg shrink-0">✅</span>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-emerald-800">Her Zaman Manuel Onay</p>
                                    <select
                                        value={onlineBookingConfig.pending_expiry_hours || 12}
                                        onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, pending_expiry_hours: Number(e.target.value) }))}
                                        className="bg-indigo-600 border border-indigo-500 rounded-xl px-3 py-1.5 text-[10px] font-black text-white outline-none shadow-lg shadow-indigo-200/50 hover:bg-indigo-700 transition-all cursor-pointer"
                                    >
                                        {[6, 12, 24, 48, 72].map(v => <option key={v} value={v} className="text-slate-900 bg-white">{v} Saat İçinde Onayla</option>)}
                                    </select>
                                </div>
                                <p className="text-[10px] font-bold text-emerald-700/80 mt-1 leading-relaxed">
                                    Gelen talepler belirlenen süre içinde onaylanmazsa otomatik olarak düşer.
                                    Talepleri <strong>Online Yönetimi</strong> sayfasından yönetebilirsiniz.
                                </p>
                            </div>
                        </div>

                        {/* Tedavi Süresi / Sabit Slot — Mutually Exclusive */}
                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-100">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Randevu Süresi Modu</p>
                            </div>

                            {/* Tedavi Süresini Kullan */}
                            <div
                                onClick={() => setOnlineBookingConfig(prev => ({ ...prev, use_service_duration: true }))}
                                className={`flex items-center justify-between p-4 cursor-pointer transition-all ${onlineBookingConfig.use_service_duration
                                    ? 'bg-indigo-50 border-b border-indigo-100'
                                    : 'bg-white border-b border-slate-100 opacity-60 hover:opacity-80'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-slate-700">Tedavi Süresini Kullan</p>
                                        {onlineBookingConfig.use_service_duration && (
                                            <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase">Aktif</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Süre tedavi türüne göre belirlenir (Önerilen)</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${onlineBookingConfig.use_service_duration
                                    ? 'border-indigo-600 bg-indigo-600'
                                    : 'border-slate-300'
                                    }`}>
                                    {onlineBookingConfig.use_service_duration && (
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </div>
                            </div>

                            {/* Sabit Slot */}
                            <div
                                onClick={() => setOnlineBookingConfig(prev => ({ ...prev, use_service_duration: false }))}
                                className={`flex items-center justify-between p-4 cursor-pointer transition-all ${!onlineBookingConfig.use_service_duration
                                    ? 'bg-amber-50'
                                    : 'bg-white opacity-60 hover:opacity-80'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-slate-700">Sabit Slot Süresi</p>
                                        {!onlineBookingConfig.use_service_duration && (
                                            <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase">Aktif</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Tüm randevular sabit süreyle alınır</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        disabled={onlineBookingConfig.use_service_duration}
                                        value={onlineBookingConfig.slot_duration}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, slot_duration: Number(e.target.value) }))}
                                        className={`bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none transition-all ${onlineBookingConfig.use_service_duration ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} dk</option>)}
                                    </select>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!onlineBookingConfig.use_service_duration
                                        ? 'border-amber-500 bg-amber-500'
                                        : 'border-slate-300'
                                        }`}>
                                        {!onlineBookingConfig.use_service_duration && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ön Hazırlık Süresi ve Lead Time - Full Width Stacking */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex flex-col gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-xs font-black text-slate-700">Hazırlık Payı (Ara Süre)</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Randevular arası temizlik ve sterilizasyon süresi</p>
                                </div>
                                <select
                                    value={onlineBookingConfig.buffer_time || 0}
                                    onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, buffer_time: Number(e.target.value) }))}
                                    className="bg-white border border-slate-200 rounded-[14px] px-4 py-2.5 text-xs font-black text-slate-900 outline-none shadow-sm hover:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all w-full"
                                >
                                    {[0, 5, 10, 15, 20, 30].map(v => <option key={v} value={v}>{v === 0 ? 'Mola Yok / Hemen Arka Arkaya' : `${v} Dakika Hazırlık Süresi`}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-xs font-black text-slate-700">En Erken Randevu Zamanı</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Şu andan itibaren en erken kaç saat sonrasına randevu açalım?</p>
                                </div>
                                <select
                                    value={onlineBookingConfig.min_lead_time_hours || 2}
                                    onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, min_lead_time_hours: Number(e.target.value) }))}
                                    className="bg-white border border-slate-200 rounded-[14px] px-4 py-2.5 text-xs font-black text-slate-900 outline-none shadow-sm hover:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all w-full"
                                >
                                    {[1, 2, 4, 6, 12, 24, 48].map(v => <option key={v} value={v}>{v} Saat Sonrasına En Erken Randevu</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Takvim Ayarları */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Takvim Ayarları</h4>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-xs font-black text-slate-700">Görünürlük (Gün)</p>
                                <p className="text-[10px] text-slate-400 font-medium">Kaç gün sonrasına kadar takvimi açalım?</p>
                            </div>
                            <select
                                value={onlineBookingConfig.max_days_ahead}
                                onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, max_days_ahead: Number(e.target.value) }))}
                                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                            >
                                {[7, 14, 30, 60, 90].map(v => <option key={v} value={v}>{v} gün</option>)}
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-xs font-black text-slate-700">Randevu Aralığı (Dakika)</p>
                                <p className="text-[10px] text-slate-400 font-medium">Saatler kaç dk arayla gösterilsin?</p>
                            </div>
                            <select
                                value={(onlineBookingConfig as any).slot_display_interval || 15}
                                onChange={(e) => setOnlineBookingConfig(prev => ({ ...prev, slot_display_interval: Number(e.target.value) }))}
                                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                            >
                                {[15, 30, 60].map(v => <option key={v} value={v}>{v} dk</option>)}
                            </select>
                        </div>

                        <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Sistemi Aktif Etmeden Önce</span>
                            </div>
                            <ul className="space-y-2">
                                {[
                                    { icon: '🦷', text: '"Tedavi Türleri" sekmesinden tedavilerinizi süreleriyle tanımlayın. Tedavi Süresi modu bunu kullanır.' },
                                    { icon: '👨‍⚕️', text: '"Hekim Saatleri" sekmesinden hekimlerinizin çalışma saatlerini güncel tutun. Müsait slotlar buradan hesaplanır.' },
                                    { icon: '📅', text: 'Aşağıdan yapılandırmayı kaydetmeyi unutmayın. Kaydedilmeyen ayarlar sistem aktif olsa bile geçersizdir.' },
                                ].map(({ icon, text }) => (
                                    <li key={text} className="flex items-start gap-2 text-[10px] font-bold text-indigo-700/80 leading-relaxed">
                                        <span className="shrink-0 mt-0.5">{icon}</span>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Kaydet Butonu */}
                        <button
                            onClick={handleSaveConfig}
                            disabled={isLoading}
                            className="w-full h-12 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            YAPILANDIRMAYI KAYDET
                        </button>
                    </div>
                </div>

                {/* ── 4. QR & LİNK ── */}
                <div className="mx-8 mb-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Erişim Portalı</h4>
                        </div>
                        {/* ! Uyarı İkonu */}
                        <div className="group relative">
                            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center cursor-help text-amber-600 hover:bg-amber-200 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 leading-relaxed">
                                QR kod veya link çalışmıyorsa sistemi kapatıp geliştiriciyle iletişime geçin.
                            </div>
                        </div>
                    </div>

                    <div className={`transition-all duration-700 ${isOnlineBookingEnabled ? 'opacity-100 scale-100 ring-8 ring-emerald-500/5' : 'opacity-30 grayscale blur-[2px] pointer-events-none'}`}>
                        <QRCodeGenerator
                            value={bookingUrl}
                            title={`${clinic.clinicName} Randevu QR`}
                            description="Kameranızı okutarak randevu sayfasına gidin."
                        />
                    </div>

                    <div className="mt-8 w-full max-w-lg space-y-4">
                        <div className="flex w-full flex-col sm:flex-row gap-2 p-1.5 sm:p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <input
                                readOnly
                                value={bookingUrl}
                                className="flex-1 bg-transparent px-4 py-2 sm:py-0 text-xs font-bold text-slate-600 outline-none truncate"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(bookingUrl);
                                    setSaveMessage({ type: "success", text: "Link kopyalandı!" });
                                    setTimeout(() => setSaveMessage(null), 2000);
                                }}
                                className="px-5 py-3 sm:py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-black active:scale-95 transition-all w-full sm:w-auto"
                            >
                                KOPYALA
                            </button>
                        </div>

                        {/* Geliştirici Uyarısı - Responsive */}
                        <div className="p-4 sm:p-5 bg-rose-50 border border-rose-100 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="text-rose-500 mt-0.5 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-wide">Bağlantı Sorunu mu Var?</p>
                                    <p className="text-[10px] font-bold text-rose-600/80 mt-0.5 leading-relaxed">
                                        Erişim hatası alıyorsanız teknik destek ekibimizle görüşün.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (typeof window !== 'undefined' && (window as any).openSupportModal) {
                                        (window as any).openSupportModal();
                                    }
                                }}
                                className="w-full sm:w-auto shrink-0 px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-200"
                            >
                                Destek Al
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── 5. AKTİVASYON PANELİ (En Altta) ── */}
                <div className="p-8 bg-slate-900 text-white flex flex-col items-center gap-5 mt-auto">
                    {!isOnlineBookingEnabled && (
                        <label className="flex items-center gap-3 cursor-pointer group px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                            <input
                                type="checkbox"
                                checked={isSettingsConfirmed}
                                onChange={e => setIsSettingsConfirmed(e.target.checked)}
                                className="w-5 h-5 rounded border-white/20 text-indigo-500 focus:ring-indigo-500 bg-transparent"
                            />
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">
                                Tüm ayarları gözden geçirdim ve onaylıyorum
                            </span>
                        </label>
                    )}

                    <button
                        onClick={handleToggleEnabled}
                        disabled={isLoading || (!isOnlineBookingEnabled && !isSettingsConfirmed)}
                        className={`h-14 px-12 rounded-[22px] flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-40 disabled:grayscale ${isOnlineBookingEnabled
                            ? "bg-rose-600 shadow-2xl shadow-rose-900/40 hover:bg-rose-700"
                            : "bg-emerald-600 shadow-2xl shadow-emerald-900/40 hover:bg-emerald-700"
                            }`}
                    >
                        {isLoading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : isOnlineBookingEnabled
                                ? <><span>⚡</span> SİSTEMİ KAPAT</>
                                : <><span>🚀</span> SİSTEMİ AKTİF ET</>
                        }
                    </button>

                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest text-center">
                        {isOnlineBookingEnabled
                            ? 'Sistem yayında · Hastalar randevu alabilir durumda'
                            : 'Sistem kapalı · Aktif etmeden önce ayarları kaydedin'}
                    </p>
                </div>

            </div>

            <PremiumFeatureModal
                isOpen={showRestrictModal}
                onClose={() => setShowRestrictModal(false)}
                title="Online Randevu Portalı"
                description="Hastalarınızın size 7/24 internet üzerinden ulaşmasını sağlayan bu modül, yalnızca abonelerimiz ve pilot kliniklerimiz için sunulmaktadır."
                features={[
                    "7/24 Randevu Kabulü",
                    "Akıllı Çakışma Kontrolü",
                    "Otomatik Onay Sistemi",
                    "Özelleştirilebilir Randevu Slotları"
                ]}
            />
        </div>
    );
}
