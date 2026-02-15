import React from "react";
import { UserRole } from "@/types/database";
import { ClinicRow } from "@/hooks/useAdminUsers";

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
    isSuperAdmin: boolean;
}

export function CreateUserModal({
    isOpen, onClose, onSubmit, saving, error,
    email, setEmail, fullName, setFullName,
    password, setPassword, role, setRole,
    isSuperAdmin
}: CreateUserModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Yeni Üye Oluştur</h3>
                            <p className="text-teal-100 text-xs mt-0.5">Ekibinize yeni bir üye ekleyin</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">E-posta</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="ornek@nextgency.com" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">İsim</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Ad Soyad" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">Rol</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                            {isSuperAdmin && <option value={UserRole.ADMIN}>YÖNETİCİ</option>}
                            <option value={UserRole.DOKTOR}>DOKTOR</option>
                            <option value={UserRole.SEKRETER}>SEKRETER</option>
                            <option value={UserRole.FINANS}>FİNANS</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">Geçici Şifre</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" placeholder="Geçici şifre" />
                    </div>

                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60">{saving ? "Oluşturuluyor..." : "Oluştur"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
