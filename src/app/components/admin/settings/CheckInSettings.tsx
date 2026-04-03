"use client";

import React, { useState } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { QRCodeGenerator } from "../../ui/QRCodeGenerator";
import { getCheckinUrl } from "@/lib/config";
import { PremiumFeatureModal } from "../../ui/PremiumFeatureModal";
import { Lock, Crown } from "lucide-react";

export function CheckInSettings() {
    const clinic = useClinic();
    const [showRestrictModal, setShowRestrictModal] = useState(false);
    
    if (!clinic.clinicId) return null;

    const isEligible = clinic.subscriptionStatus === 'active' || clinic.billingCycle === 'pilot';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden relative">
                
                {/* Restriction Overlay for Trial Users */}
                {!isEligible && (
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[6px] flex flex-col items-center justify-center p-8 text-center group cursor-pointer" onClick={() => setShowRestrictModal(true)}>
                        <div className="w-20 h-20 rounded-[32px] bg-white shadow-2xl border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                            <div className="relative">
                                <Lock className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                <Crown className="w-5 h-5 text-amber-400 absolute -top-4 -right-4 animate-bounce" />
                            </div>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">Premium Özellik</h4>
                        <p className="text-sm font-bold text-slate-500 max-w-sm">
                            QR Check-in ve Dijital Anamnez modülü yalnızca abonelerimiz ve pilot kliniklerimiz için kullanılabilir durumdadır.
                        </p>
                        <button className="mt-8 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                            Hemen Keşfet & Pilot Ol
                        </button>
                    </div>
                )}

                <div className="p-8 border-b border-slate-50">
                    <h3 className="text-xl font-black text-slate-900">QR Check-in Sistemi</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hastalarınızın bekleme salonunda işlemlerini yapması için QR kodunuzu yönetin.</p>
                </div>

                <div className="p-8 sm:p-12 flex flex-col items-center">
                    <QRCodeGenerator
                        value={getCheckinUrl(clinic.clinicSlug!)}
                        title={`${clinic.clinicName} Check-in QR Kodu`}
                        description="Bu kodu bastırıp bekleme salonuna asarak hastalarınızın check-in yapmasını ve dijital anamnez formu doldurmasını sağlayabilirsiniz."
                    />

                    <div className="mt-12 max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-xs font-black text-emerald-900 uppercase">Avantajlar</span>
                            </div>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Sekreteryanın veri girişi yükü azalır.
                                </li>
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Hatalı veri girişi riski minimize edilir.
                                </li>
                                <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    Kliniğinizin teknolojik prestiji artar.
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-indigo-50 rounded-[28px] border border-indigo-100/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="text-xs font-black text-indigo-900 uppercase">Nasıl Kullanılır?</span>
                            </div>
                            <p className="text-[11px] font-bold text-indigo-700/80 leading-relaxed">
                                QR kodu indirip bastırarak bekleme salonuna asın. Hasta kodu okutup telefon numarasını girdiğinde randevusuyla eşleşir ve anamnez formu açılır.
                            </p>
                        </div>
                    </div>
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
