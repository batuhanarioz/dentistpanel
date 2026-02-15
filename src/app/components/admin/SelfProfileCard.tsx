import React from "react";

interface SelfProfileCardProps {
    email: string;
    newEmail: string;
    setNewEmail: (val: string) => void;
    oldPassword: string;
    setOldPassword: (val: string) => void;
    newPassword: string;
    setNewPassword: (val: string) => void;
    newPasswordRepeat: string;
    setNewPasswordRepeat: (val: string) => void;
    saving: boolean;
    message: string | null;
    error: string | null;
    onSubmit: (e: React.FormEvent) => void;
}

export function SelfProfileCard({
    email, newEmail, setNewEmail, oldPassword, setOldPassword,
    newPassword, setNewPassword, newPasswordRepeat, setNewPasswordRepeat,
    saving, message, error, onSubmit
}: SelfProfileCardProps) {
    return (
        <section className="rounded-3xl border bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 border-b px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Profil ve Güvenlik</h2>
                        <p className="text-xs text-slate-500 font-medium">Bireysel kullanıcı ayarlarınızı yönetin.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-posta Adresi</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                            <p className="text-[10px] text-slate-400 mt-1.5">E-posta değişiminde onay maili alacaksınız.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Şifre İşlemleri</label>
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    placeholder="Mevcut Şifre (Gerekli değil)"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                                <input
                                    type="password"
                                    placeholder="Yeni Şifre"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                                <input
                                    type="password"
                                    placeholder="Yeni Şifre (Tekrar)"
                                    value={newPasswordRepeat}
                                    onChange={(e) => setNewPasswordRepeat(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t flex items-center justify-between gap-4">
                    <div className="flex-1">
                        {message && <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg inline-block border border-emerald-100">{message}</p>}
                        {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 px-3 py-2 rounded-lg inline-block border border-rose-100">{error}</p>}
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-slate-900 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                    </button>
                </div>
            </form>
        </section>
    );
}
