import React, { useState } from "react";
import { UserRole } from "@/types/database";
import { UserRow, WorkingHours, DEFAULT_WORKING_HOURS } from "@/hooks/useAdminUsers";

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

const DAY_LABELS: Record<string, string> = {
    monday: "Pazartesi",
    tuesday: "Salı",
    wednesday: "Çarşamba",
    thursday: "Perşembe",
    friday: "Cuma",
    saturday: "Cumartesi",
    sunday: "Pazar",
};

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    error: string | null;
    user: UserRow | null;
    fullName: string;
    setFullName: (v: string) => void;
    role: string;
    setRole: (v: string) => void;
    isActive: boolean;
    setIsActive: (v: boolean) => void;
    isClinicalProvider: boolean;
    setIsClinicalProvider: (v: boolean) => void;
    specialtyCode: string;
    setSpecialtyCode: (v: string) => void;
    workingHours: WorkingHours | null;
    setWorkingHours: (v: WorkingHours | null) => void;
    phone: string;
    setPhone: (v: string) => void;
    isSuperAdmin: boolean;
    currentUserId: string | null;
    onResetPassword: () => void;
    onDeleteUser: () => void;
    onChangePassword: () => void;
}

export function EditUserModal({
    isOpen, onClose, onSubmit, saving, error,
    user, fullName, setFullName, role, setRole,
    isActive, setIsActive, isClinicalProvider, setIsClinicalProvider, specialtyCode, setSpecialtyCode,
    workingHours, setWorkingHours,
    phone, setPhone,
    isSuperAdmin, currentUserId, onResetPassword, onDeleteUser, onChangePassword
}: EditUserModalProps) {
    const [showWorkingHours, setShowWorkingHours] = useState(false);

    if (!isOpen || !user) return null;

    const isDoctor = role === UserRole.DOKTOR;
    const hasCustomHours = workingHours !== null;

    const toggleCustomHours = () => {
        if (hasCustomHours) {
            setWorkingHours(null);
        } else {
            setWorkingHours(DEFAULT_WORKING_HOURS);
        }
    };

    const updateDay = (day: string, field: "enabled" | "start" | "end", value: boolean | string) => {
        const base = workingHours ?? DEFAULT_WORKING_HOURS;
        setWorkingHours({
            ...base,
            [day]: { ...base[day as keyof WorkingHours], [field]: value },
        });
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-5 relative overflow-hidden shrink-0">
                    {/* Arkaplan Süslemesi */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -ml-12 -mb-12 animate-pulse" />
                    
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 p-[1px] shadow-lg shadow-indigo-500/20">
                                <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-slate-900 font-black text-white text-lg uppercase tracking-tight">
                                    {user.full_name?.[0] || user.email?.[0] || "?"}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-black text-base tracking-tight leading-tight">{user.full_name || "Kullanıcıyı Düzenle"}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">{user.email}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{user.role}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="group p-2 rounded-xl hover:bg-white/10 transition-all active:scale-95">
                            <svg className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <form onSubmit={onSubmit} className="overflow-y-auto flex-1">
                    <div className="px-6 py-5 space-y-5">
                        {/* Aktif/Pasif toggle */}
                        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"} ${!isSuperAdmin ? "opacity-60 grayscale pointer-events-none" : ""}`}>
                            <div>
                                <p className={`text-sm font-semibold ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                                    {isActive ? "Hesap Aktif" : "Hesap Pasif"}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isActive ? "Kullanıcı sisteme giriş yapabilir" : "Kullanıcı giriş yapamaz, verileri korunur"}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={!isSuperAdmin}
                                onClick={() => setIsActive(!isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ad Soyad</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                    placeholder="Ad Soyad"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Telefon</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder:text-slate-300"
                                        placeholder="05xx xxx xx xx"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rol */}
                        {/* Rol Seçimi */}
                        <div className={`space-y-3 ${!isSuperAdmin ? "opacity-60 grayscale pointer-events-none" : ""}`}>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Ekip Rolü & Yetkiler</label>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLE_OPTIONS.filter(o => isSuperAdmin || o.value !== UserRole.ADMIN || user.role === UserRole.ADMIN).map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={!isSuperAdmin}
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

                        {/* Hekimlik Yetkisi - DOKTOR değilse görünür */
                            !isDoctor && (
                                <div className={`pt-2 ${!isSuperAdmin ? "hidden" : ""}`}>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                disabled={!isSuperAdmin}
                                                checked={isClinicalProvider}
                                                onChange={(e) => setIsClinicalProvider(e.target.checked)}
                                            />
                                            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700"></div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">Hekimlik Yetkisi</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">Bu kişi randevu listelerinde ve işlemlerde hekim olarak listelenir.</div>
                                        </div>
                                    </label>
                                </div>
                            )}

                        {error && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50 shrink-0">
                        <div className="flex gap-2">
                            {user.id === currentUserId ? (
                                <button type="button" onClick={onChangePassword} className="flex items-center gap-2 rounded-xl border-2 border-indigo-100 px-4 py-2 text-xs font-black uppercase tracking-tight text-indigo-700 hover:bg-indigo-50 transition-all active:scale-95">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                                    Şifre Değiştir
                                </button>
                            ) : (
                                <button type="button" onClick={onResetPassword} className="flex items-center gap-2 rounded-xl border-2 border-amber-100 px-4 py-2 text-xs font-black uppercase tracking-tight text-amber-700 hover:bg-amber-50 transition-all active:scale-95">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                    Şifre Sıfırla
                                </button>
                            )}
                            {isSuperAdmin && (
                                <button type="button" onClick={onDeleteUser} className="rounded-xl border-2 border-slate-100 p-2 text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all active:scale-90">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-[11px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-100 transition-all">
                                Kapat
                            </button>
                            <button type="submit" disabled={saving} className="relative group overflow-hidden rounded-xl bg-slate-900 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                                {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
