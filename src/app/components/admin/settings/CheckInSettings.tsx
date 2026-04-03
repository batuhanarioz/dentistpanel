"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { QRCodeGenerator } from "../../ui/QRCodeGenerator";
import { getCheckinUrl } from "@/lib/config";
import { PremiumFeatureModal } from "../../ui/PremiumFeatureModal";
import { supabase } from "@/lib/supabaseClient";
import { useConfirm } from "@/app/context/ConfirmContext";
import { toast } from "react-hot-toast";

export function CheckInSettings() {
    const { confirm } = useConfirm();
    const clinic = useClinic();
    const [showRestrictModal, setShowRestrictModal] = useState(false);
    const [isCheckinEnabled, setIsCheckinEnabled] = useState(
        clinic.clinicSettings?.is_checkin_enabled ?? false
    );
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (clinic.clinicSettings) {
            setIsCheckinEnabled(clinic.clinicSettings.is_checkin_enabled ?? false);
        }
    }, [clinic.clinicSettings]);

    if (!clinic.clinicId) return null;

    const isEligible = clinic.subscriptionStatus === 'active' || clinic.billingCycle === 'pilot';

    const handleToggleEnabled = async () => {
        if (!clinic.clinicId) return;

        // Restriction Check for Premium Feature
        if (!isEligible && !isCheckinEnabled) {
            setShowRestrictModal(true);
            return;
        }

        const confirmMsg = isCheckinEnabled
            ? "QR Check-in sistemini kapatmak üzeresiniz. Hastalar form dolduramayacak. Onaylıyor musunuz?"
            : "QR Check-in sistemini aktif hale getiriyorsunuz. Hastalar bekleme salonunda giriş yapabilecek. Devam edilsin mi?";

        confirm({
            title: isCheckinEnabled ? "Sistemi Kapat" : "Sistemi Aktif Et",
            message: confirmMsg,
            variant: isCheckinEnabled ? "danger" : "info",
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const newVal = !isCheckinEnabled;
                    const { error } = await supabase
                        .from("clinic_settings")
                        .upsert({
                            clinic_id: clinic.clinicId,
                            is_checkin_enabled: newVal
                        }, { onConflict: 'clinic_id' });
                    if (error) throw error;
                    setIsCheckinEnabled(newVal);
                    toast.success(`Sistem başarıyla ${newVal ? 'aktif' : 'pasif'} edildi.`);
                } catch {
                    toast.error("Bir hata oluştu.");
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col relative">
                
                {/* ── 1. HEADER + DURUM GÖSTERGESİ ── */}
                <div className="p-5 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/30 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">QR Check-in Sistemi</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Dijital Anamnez ve Hasta Kabul</p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-sm transition-all ${isCheckinEnabled
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-100 border-slate-200'
                        }`}>
                        <span className={`relative flex h-2.5 w-2.5`}>
                            {isCheckinEnabled && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCheckinEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isCheckinEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isCheckinEnabled ? 'SİSTEM AKTİF' : 'SİSTEM PASİF'}
                        </span>
                    </div>
                </div>

                {/* ── 2. BİLGİ KARTI ── */}
                <div className="p-8 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-xs font-black text-emerald-900 uppercase tracking-tight">Avantajlar</span>
                            </div>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Sekreteryanın veri girişi yükü %70 azalır.
                                </li>
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Hastalar formları kendi telefonlarından kolayca doldurur.
                                </li>
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Kliniğinizin teknolojik prestiji ve hızı artar.
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-indigo-50 rounded-[28px] border border-indigo-100/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="text-xs font-black text-indigo-900 uppercase tracking-tight">Nasıl Kullanılır?</span>
                            </div>
                            <p className="text-[11px] font-bold text-indigo-700/80 leading-relaxed">
                                Aşağıdaki QR kodu indirip bastırarak bekleme salonuna asın. Hasta kodu okuttuğunda o günkü randevusuyla eşleşir ve anamnez formu açılır.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── 3. QR AREA (Gated by isCheckinEnabled) ── */}
                <div className="p-8 flex flex-col items-center">
                    <div className={`transition-all duration-700 ${isCheckinEnabled ? 'opacity-100 scale-100 ring-8 ring-indigo-500/5' : 'opacity-30 grayscale blur-[4px] pointer-events-none'}`}>
                        <QRCodeGenerator
                            value={getCheckinUrl(clinic.clinicSlug!)}
                            title={`${clinic.clinicName} Check-in QR`}
                            description="Bastırıp bekleme salonuna asarak dijital anamnez sürecini başlatın."
                        />
                    </div>
                </div>

                {/* ── 4. AKTİVASYON PANELİ ── */}
                <div className="p-8 bg-slate-900 text-white flex flex-col items-center gap-5 mt-auto">
                    <button
                        onClick={handleToggleEnabled}
                        disabled={isLoading}
                        className={`h-14 px-12 rounded-[22px] flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-40 disabled:grayscale ${isCheckinEnabled
                            ? "bg-rose-600 shadow-2xl shadow-rose-900/40 hover:bg-rose-700"
                            : "bg-indigo-600 shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700"
                            }`}
                    >
                        {isLoading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : isCheckinEnabled
                                ? <><span>⚡</span> SİSTEMİ KAPAT</>
                                : <><span>🚀</span> SİSTEMİ AKTİF ET</>
                        }
                    </button>

                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest text-center">
                        {isCheckinEnabled
                            ? 'Sistem aktif · QR kodunuz kullanılabilir durumda'
                            : 'Sistem pasif · Aktif ederek dijital anamnez sürecini başlatın'}
                    </p>
                </div>
            </div>

            <PremiumFeatureModal 
                isOpen={showRestrictModal} 
                onClose={() => setShowRestrictModal(false)}
                title="QR Check-in & Form Yönetimi"
                description="Hastalarınızın bekleme salonunda hızla kayıt olmasını ve formları dijital doldurmasını sağlayan bu profesyonel modül, abone ve pilot kliniklerimize özeldir."
                features={[
                    "Dijital Anamnez Formu",
                    "Temassız Check-in Deneyimi",
                    "Otomatik Hasta Kabulü",
                    "Sekreterya İş Yükü Azaltımı"
                ]}
            />
        </div>
    );
}
