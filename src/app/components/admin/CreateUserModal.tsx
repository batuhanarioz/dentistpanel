import React from "react";
import { UserRole } from "@/types/database";

const ROLE_OPTIONS = [
    {
        value: UserRole.ADMIN,
        label: "Yönetici",
        description: "Tüm sayfalara ve ayarlara tam erişim",
    },
    {
        value: UserRole.DOKTOR,
        label: "Hekim",
        description: "Randevular, hastalar ve tedavi planları",
    },
    {
        value: UserRole.SEKRETER,
        label: "Sekreter",
        description: "Randevu yönetimi ve hasta kayıtları",
    },
    {
        value: UserRole.FINANS,
        label: "Finans",
        description: "Ödeme yönetimi ve raporlar",
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

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Yeni Üye Ekle</h3>
                            <p className="text-teal-100 text-xs mt-0.5">Ekibinize yeni bir üye ekleyin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                    {/* Ekleme yöntemi */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setInvite(false)}
                            className={`flex flex-col items-center rounded-xl border px-3 py-3 text-center transition-all ${!invite
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                        >
                            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                            <span className="text-xs font-semibold">Şifre ile Oluştur</span>
                            <span className="text-[10px] mt-0.5 text-slate-400">Şifreyi sen belirle</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setInvite(true)}
                            className={`flex flex-col items-center rounded-xl border px-3 py-3 text-center transition-all ${invite
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                        >
                            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                            <span className="text-xs font-semibold">Davet E-postası</span>
                            <span className="text-[10px] mt-0.5 text-slate-400">Kullanıcı kendi belirler</span>
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">E-posta</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            placeholder="ornek@klinik.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">İsim</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            placeholder="Ad Soyad"
                        />
                    </div>

                    {/* Rol seçimi */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Rol</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLE_OPTIONS.filter(o => isSuperAdmin || o.value !== UserRole.ADMIN).map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRole(opt.value)}
                                    className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${role === opt.value
                                        ? "border-teal-500 bg-teal-700 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                >
                                    <span className="text-xs font-bold">{opt.label}</span>
                                    <span className={`text-[10px] mt-0.5 leading-snug ${role === opt.value ? "text-teal-200" : "text-slate-400"}`}>
                                        {opt.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Şifre - sadece invite=false */}
                    {!invite && (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Geçici Şifre</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                placeholder="En az 6 karakter"
                            />
                        </div>
                    )}

                    {invite && (
                        <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                            <p className="text-xs text-teal-700 font-medium">
                                Belirtilen adrese giriş bağlantısı gönderilecek. Kullanıcı kendi şifresini belirleyecek.
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                        >
                            {saving ? "İşleniyor..." : invite ? "Davet Gönder" : "Oluştur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
