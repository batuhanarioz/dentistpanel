import React from "react";
import { UserRole } from "@/types/database";
import { UserRow } from "@/hooks/useAdminUsers";

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
    isSuperAdmin: boolean;
    currentUserId: string | null;
    onResetPassword: () => void;
    onDeleteUser: () => void;
    onChangePassword: () => void;
}

export function EditUserModal({
    isOpen, onClose, onSubmit, saving, error,
    user, fullName, setFullName, role, setRole,
    isSuperAdmin, currentUserId, onResetPassword, onDeleteUser, onChangePassword
}: EditUserModalProps) {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Kullanıcıyı Düzenle</h3>
                            <p className="text-slate-200 text-xs mt-0.5">{user.email}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">İsim</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500" placeholder="Ad Soyad" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">Rol</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500">
                            {(isSuperAdmin || user.role === UserRole.ADMIN) && <option value={UserRole.ADMIN}>YÖNETİCİ</option>}
                            <option value={UserRole.DOKTOR}>DOKTOR</option>
                            <option value={UserRole.SEKRETER}>SEKRETER</option>
                            <option value={UserRole.FINANS}>FİNANS</option>
                        </select>
                    </div>

                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex flex-col gap-3 pt-2">
                        <div className="flex gap-2 justify-between">
                            <div className="flex gap-2">
                                {user.id === currentUserId ? (
                                    <button type="button" onClick={onChangePassword} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50">Şifre Değiştir</button>
                                ) : (
                                    <button type="button" onClick={onResetPassword} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50">Şifre Sıfırla</button>
                                )}
                                <button type="button" onClick={onDeleteUser} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">Sil</button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Kapat</button>
                            <button type="submit" disabled={saving} className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "Kaydediliyor..." : "Kaydet"}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
