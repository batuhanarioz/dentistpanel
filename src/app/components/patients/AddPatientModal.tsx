"use client";
import React, { useState } from "react";

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        full_name: string;
        phone: string;
        email: string;
        birth_date: string;
        tc_identity_no: string;
        gender: string;
        kvkk_consent: boolean;
    }) => Promise<boolean>;
}

export function AddPatientModal({ isOpen, onClose, onSave }: AddPatientModalProps) {
    const [full_name, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [birth_date, setBirthDate] = useState("");
    const [tc_identity_no, setTcNo] = useState("");
    const [gender, setGender] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setFullName(""); setPhone(""); setEmail(""); setBirthDate("");
        setTcNo(""); setGender(""); setError(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        const ok = await onSave({ full_name, phone, email, birth_date, tc_identity_no, gender, kvkk_consent: true });
        setSaving(false);
        if (ok) handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white relative">
                    <button onClick={handleClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold">Yeni Hasta Ekle</h2>
                            <p className="text-teal-100 text-xs">* ile işaretliler zorunludur</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600">{error}</div>
                    )}

                    {/* Ad Soyad + Telefon */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ad Soyad *</label>
                            <input
                                required
                                value={full_name}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Ahmet Yılmaz"
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefon *</label>
                            <input
                                required
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="05XX XXX XX XX"
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Doğum Tarihi + Cinsiyet */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doğum Tarihi</label>
                            <input
                                type="date"
                                value={birth_date}
                                onChange={e => setBirthDate(e.target.value)}
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cinsiyet</label>
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            >
                                <option value="">Seçilmedi</option>
                                <option value="Kadın">Kadın</option>
                                <option value="Erkek">Erkek</option>
                                <option value="Diğer">Diğer</option>
                            </select>
                        </div>
                    </div>

                    {/* E-posta + TC */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-posta</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ornek@mail.com"
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TC Kimlik No</label>
                            <input
                                maxLength={11}
                                value={tc_identity_no}
                                onChange={e => setTcNo(e.target.value.replace(/\D/g, ""))}
                                placeholder="11 haneli"
                                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white px-3 text-sm font-bold focus:border-teal-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={handleClose}
                            className="h-11 px-5 rounded-2xl border-2 border-slate-100 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:bg-slate-50 transition-all">
                            İptal
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 h-11 bg-slate-900 text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60">
                            {saving ? "Kaydediliyor..." : "Hasta Kaydet"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
