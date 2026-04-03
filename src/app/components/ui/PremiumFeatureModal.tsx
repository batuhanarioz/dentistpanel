"use client";

import React from "react";
import { X, Crown, Sparkles, Rocket, ArrowRight, MessageCircle } from "lucide-react";

interface PremiumFeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    features?: string[];
}

export function PremiumFeatureModal({ isOpen, onClose, title, description, features }: PremiumFeatureModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all z-10"
                >
                    <X size={20} />
                </button>

                {/* Top Banner / Gradient */}
                <div className="h-48 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 relative flex items-center justify-center overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-300 rounded-full blur-3xl" />
                    </div>
                    
                    <div className="relative flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-2xl animate-bounce">
                            <Crown size={32} strokeWidth={2.5} />
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                            Premium Modül
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 sm:p-10 pt-8 flex flex-col items-center text-center">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                        {title}
                    </h3>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-md">
                        {description}
                    </p>

                    {/* Features List */}
                    {features && features.length > 0 && (
                        <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            {features.map((f, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                                        <Sparkles size={12} strokeWidth={3} />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{f}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CTA Section */}
                    <div className="mt-10 w-full flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 h-14 rounded-[22px] bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Daha Sonra
                        </button>
                        <button 
                            onClick={() => {
                                // Assume a global support or contact action helper exists or just use a placeholder
                                if (typeof window !== 'undefined' && (window as any).openSupportModal) {
                                  (window as any).openSupportModal();
                                } else {
                                  window.location.href = `mailto:destek@nextgency.com?subject=Premium Modül Hakkında: ${title}`;
                                }
                                onClose();
                            }}
                            className="flex-[1.5] h-14 rounded-[22px] bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            <MessageCircle size={14} className="group-hover:animate-bounce" />
                            İletişime Geç & Pilot Ol
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 leading-relaxed">
                        <Rocket size={10} /> Yalnızca abonelerimiz ve pilot kliniklerimiz yararlanabilir.
                    </p>
                </div>
            </div>
        </div>
    );
}
