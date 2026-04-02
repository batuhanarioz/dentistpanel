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
                <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 font-bold text-white uppercase">
                            {user.full_name?.[0] || user.email?.[0] || "?"}
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">{user.full_name || "Kullanıcıyı Düzenle"}</h3>
                            <p className="text-slate-200 text-xs mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable body */}
                <form onSubmit={onSubmit} className="overflow-y-auto flex-1">
                    <div className="px-6 py-5 space-y-5">
                        {/* Aktif/Pasif toggle */}
                        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}>
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
                                onClick={() => setIsActive(!isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                        </div>

                        {/* İsim */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">İsim</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                placeholder="Ad Soyad"
                            />
                        </div>

                        {/* Rol */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Rol</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLE_OPTIONS.filter(o => isSuperAdmin || o.value !== UserRole.ADMIN || user.role === UserRole.ADMIN).map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setRole(opt.value)}
                                        className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${role === opt.value
                                            ? "border-slate-500 bg-slate-700 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className="text-xs font-bold">{opt.label}</span>
                                        <span className={`text-[10px] mt-0.5 leading-snug ${role === opt.value ? "text-slate-300" : "text-slate-400"}`}>
                                            {opt.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hekimlik Yetkisi - DOKTOR değilse görünür */
                            !isDoctor && (
                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
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

                        {/* Uzmanlık (sadece doktor veya hekim yetkisi) */}
                        {(isDoctor || isClinicalProvider) && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Uzmanlık Alanı</label>
                                <input
                                    type="text"
                                    value={specialtyCode}
                                    onChange={e => setSpecialtyCode(e.target.value)}
                                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    placeholder="ör. İmplant, Ortodonti, Çocuk Diş..."
                                />
                            </div>
                        )}

                        {/* Çalışma saatleri (sadece doktor veya hekim yetkisi) */}
                        {(isDoctor || isClinicalProvider) && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Çalışma Saatleri</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">{hasCustomHours ? "Özel" : "Klinik varsayılanı"}</span>
                                        <button
                                            type="button"
                                            onClick={toggleCustomHours}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hasCustomHours ? "bg-teal-500" : "bg-slate-300"}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${hasCustomHours ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                        </button>
                                    </div>
                                </div>
                                {hasCustomHours && (
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowWorkingHours(v => !v)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                        >
                                            <span>Günlük Saatleri Düzenle</span>
                                            <svg className={`h-4 w-4 text-slate-400 transition-transform ${showWorkingHours ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showWorkingHours && (
                                            <div className="divide-y divide-slate-100">
                                                {DAY_KEYS.map(day => {
                                                    const d = (workingHours ?? DEFAULT_WORKING_HOURS)[day];
                                                    return (
                                                        <div key={day} className="flex items-center gap-3 px-4 py-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateDay(day, "enabled", !d.enabled)}
                                                                className={`relative inline-flex h-4.5 w-8 items-center rounded-full shrink-0 transition-colors ${d.enabled ? "bg-teal-500" : "bg-slate-200"}`}
                                                            >
                                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${d.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                                                            </button>
                                                            <span className={`text-xs font-medium w-20 shrink-0 ${d.enabled ? "text-slate-700" : "text-slate-400"}`}>
                                                                {DAY_LABELS[day]}
                                                            </span>
                                                            {d.enabled ? (
                                                                <div className="flex items-center gap-1.5 flex-1">
                                                                    <input
                                                                        type="time"
                                                                        value={d.start}
                                                                        onChange={e => updateDay(day, "start", e.target.value)}
                                                                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-teal-400"
                                                                    />
                                                                    <span className="text-slate-300 text-xs">–</span>
                                                                    <input
                                                                        type="time"
                                                                        value={d.end}
                                                                        onChange={e => updateDay(day, "end", e.target.value)}
                                                                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-teal-400"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-300 flex-1">Kapalı</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
                        <div className="flex gap-2">
                            {user.id === currentUserId ? (
                                <button type="button" onClick={onChangePassword} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                                    Şifre Değiştir
                                </button>
                            ) : (
                                <button type="button" onClick={onResetPassword} className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                                    Şifre Sıfırla
                                </button>
                            )}
                            <button type="button" onClick={onDeleteUser} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                                Sil
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                Kapat
                            </button>
                            <button type="submit" disabled={saving} className="rounded-lg bg-slate-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
