"use client";

import React from "react";
import { UserRole } from "@/types/database";

const ROLE_OPTIONS = [
    {
        value: UserRole.ADMIN,
        label: "Yönetici",
        description: "Tüm sayfalara ve ayarlara tam erişim",
        color: "indigo",
    },
    {
        value: UserRole.DOKTOR,
        label: "Hekim",
        description: "Randevular, hastalar ve tedavi planları",
        color: "teal",
    },
    {
        value: UserRole.SEKRETER,
        label: "Sekreter",
        description: "Randevu yönetimi ve hasta kayıtları",
        color: "amber",
    },
    {
        value: UserRole.FINANS,
        label: "Finans",
        description: "Ödeme yönetimi ve raporlar",
        color: "violet",
    },
];

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    error: string | null;
    email: string;
    setEmail: (v: string) => void;
    fullName: string;
    setFullName: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    role: string;
    setRole: (v: string) => void;
    invite: boolean;
    setInvite: (v: boolean) => void;
    isClinicalProvider: boolean;
    setIsClinicalProvider: (v: boolean) => void;
    isSuperAdmin: boolean;
}

export function CreateUserModal({
    isOpen, onClose, onSubmit, saving, error,
    email, setEmail, fullName, setFullName,
    password, setPassword, role, setRole,
    invite, setInvite, isClinicalProvider, setIsClinicalProvider, isSuperAdmin
}: CreateUserModalProps) {
    if (!isOpen) return null;

    const isDoctor = role === UserRole.DOKTOR;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4" onClick={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl border w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-7 relative overflow-hidden shrink-0">
                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -ml-12 -mb-12 animate-pulse" />
                    
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 p-[1px] shadow-lg shadow-emerald-500/20">
                                <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-slate-900">
                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight leading-tight">Yen Üye Ekle</h3>
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Ekibinize yeni bir profesyonel dahil edin</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="group p-2 rounded-xl hover:bg-white/10 transition-all active:scale-95">
                            <svg className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="overflow-y-auto flex-1">
                    <div className="px-8 py-6 space-y-6">
                        
                        {/* ── SELECTION MODE ── */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setInvite(false)}
                                className={`group relative flex flex-col items-center rounded-2xl border-2 p-4 transition-all active:scale-95 overflow-hidden ${!invite
                                    ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200"
                                    : "border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-lg"
                                    }`}
                            >
                                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${!invite ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"}`}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-tight">Şifre ile Oluştur</span>
                                <span className={`text-[10px] mt-1 font-medium leading-tight ${!invite ? "text-slate-400" : "text-slate-400"}`}>Şifreyi manuel belirleyin</span>
                                {!invite && <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-teal-400 animate-pulse" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => setInvite(true)}
                                className={`group relative flex flex-col items-center rounded-2xl border-2 p-4 transition-all active:scale-95 overflow-hidden ${invite
                                    ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200"
                                    : "border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-lg"
                                    }`}
                            >
                                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${invite ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"}`}>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                    </svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-tight">Davet Gönder</span>
                                <span className={`text-[10px] mt-1 font-medium leading-tight ${invite ? "text-slate-400" : "text-slate-400"}`}>E-posta ile davetiye iletin</span>
                                {invite && <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />}
                            </button>
                        </div>

                        {/* ── BASIC INFO ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">E-Posta Adresi</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-300"
                                        placeholder="ornek@klinik.com"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ad Soyad</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-300"
                                    placeholder="Ad Soyad"
                                />
                            </div>
                        </div>

                        {/* ── ROLE SELECTION ── */}
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ekip Rolü & Yetkiler</label>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLE_OPTIONS.filter(o => isSuperAdmin || o.value !== UserRole.ADMIN).map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setRole(opt.value)}
                                        className={`group relative flex flex-col items-start rounded-2xl border-2 p-4 transition-all active:scale-95 overflow-hidden ${role === opt.value
                                            ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200"
                                            : "border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-lg"
                                            }`}
                                    >
                                        <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200 ${role === opt.value ? "bg-white/10 text-white" : "text-slate-600"}`}>
                                            <span className="text-sm font-black italic">{opt.label[0]}</span>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-tight leading-none">{opt.label}</span>
                                        <span className={`text-[10px] mt-1.5 font-medium leading-tight ${role === opt.value ? "text-slate-400" : "text-slate-400"}`}>
                                            {opt.description}
                                        </span>
                                        {role === opt.value && (
                                            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hekimlik Yetkisi */}
                        {!isDoctor && (
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isClinicalProvider}
                                            onChange={(e) => setIsClinicalProvider(e.target.checked)}
                                        />
                                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-tight text-slate-800 leading-none">Hekimlik Yetkisi</div>
                                        <div className="text-[10px] text-slate-500 mt-1 font-medium">Bu kişi randevu listelerinde hekim olarak listelenir.</div>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Şifre Area */}
                        {!invite ? (
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Geçici Şifre</label>
                                <div className="relative font-mono">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-300"
                                        placeholder="••••••••"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    En az 8 karakter olmalıdır.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">Davet Modu Aktif</p>
                                    <p className="text-[10px] font-bold text-emerald-700/70 mt-0.5 leading-relaxed">
                                        Belirtilen adrese bir aktivasyon bağlantısı gönderilecek. Kullanıcı şifresini kendisi oluşturacak.
                                    </p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 font-bold">{error}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md">
                            İptal
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="relative group overflow-hidden bg-slate-900 px-8 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-white transition-all active:scale-95 disabled:opacity-50 rounded-xl shadow-xl shadow-slate-200"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                            {saving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Hazırlanıyor...</span>
                                </div>
                            ) : (
                                invite ? "DAVETİ GÖNDER" : "ÜYEYİ OLUŞTUR"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
