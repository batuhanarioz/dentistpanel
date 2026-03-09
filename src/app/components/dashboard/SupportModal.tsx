"use client";

import React, { useState } from "react";
import { X, Send, LifeBuoy, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
}

export function SupportModal({ isOpen, onClose, clinicId }: SupportModalProps) {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [priority, setPriority] = useState("normal");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !message) return;

        setSubmitting(true);
        const { error } = await supabase.from("platform_support_requests").insert({
            clinic_id: clinicId,
            subject,
            message,
            priority,
            status: 'pending'
        });

        if (!error) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setSubject("");
                setMessage("");
            }, 2000);
        } else {
            alert("Destek talebi gönderilemedi: " + error.message);
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-900 p-8 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                            <LifeBuoy className="text-amber-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Yardım & Destek</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Platform yöneticilerine ulaşın</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in fade-in scale-in">
                            <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Mesajınız İletildi!</h3>
                                <p className="text-sm text-slate-500 font-medium mt-2">Platform yöneticileri en kısa sürede talebinizi inceleyecektir.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konu</label>
                                <input
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Örn: Paket yükseltme hakkında"
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mesajınız</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Sorununuzu veya önerinizi detaylandırın..."
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-medium focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Önem Derecesi</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['normal', 'high', 'urgent'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${priority === p
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            {p === 'normal' ? 'Normal' : p === 'high' ? 'Yüksek' : 'Acil'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={submitting}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? "Gönderiliyor..." : (
                                    <>
                                        Talebi Gönder
                                        <Send size={16} />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                                <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                                    Teknik aksaklıklar için genellikle 2-4 saat içinde dönüş yapıyoruz.
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
