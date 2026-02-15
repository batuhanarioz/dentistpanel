import React from "react";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    error: string | null;
    success: boolean;
    password: string;
    setPassword: (v: string) => void;
}

export function ResetPasswordModal({
    isOpen, onClose, onSubmit, saving, error,
    success, password, setPassword
}: ResetPasswordModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Şifre Sıfırla</h3>
                            <p className="text-amber-100 text-xs mt-0.5">Kullanıcı için yeni bir şifre belirleyin</p>
                        </div>
                    </div>
                </div>

                {success ? (
                    <div className="px-6 py-8 text-center text-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="font-medium text-slate-900">Şifre başarıyla sıfırlandı!</p>
                        <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white">Kapat</button>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="px-6 py-5 space-y-4 text-sm">
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">Yeni Şifre</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" placeholder="Yeni şifreyi girin" />
                        </div>
                        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600">İptal</button>
                            <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700">{saving ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
