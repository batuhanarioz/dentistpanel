import React from "react";
import { SubscriptionSection } from "./sections/SubscriptionSection";

interface ClinicModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    isEdit?: boolean;
    saving?: boolean;
    onSubmit: (e: React.FormEvent) => Promise<void>;

    // Basic Fields
    formName: string;
    setFormName: (val: string) => void;
    formSlug: string;
    setFormSlug: (val: string) => void;
    formPhone: string;
    setFormPhone: (val: string) => void;
    formEmail: string;
    setFormEmail: (val: string) => void;
    formAddress: string;
    setFormAddress: (val: string) => void;
    formAdminPassword?: string;
    setFormAdminPassword?: (val: string) => void;

    // Subscription
    subscriptionStatus: string;
    setSubscriptionStatus: (val: string) => void;
    billingCycle: string;
    setBillingCycle: (val: string) => void;
    currentPeriodEnd: string;
    setCurrentPeriodEnd: (val: string) => void;
    lastPaymentDate: string;
    setLastPaymentDate: (val: string) => void;

    onDeleteClinic?: () => void;
}

export function ClinicModal({
    isOpen,
    onClose,
    title,
    isEdit,
    saving,
    onSubmit,
    formName, setFormName,
    formSlug, setFormSlug,
    formPhone, setFormPhone,
    formEmail, setFormEmail,
    formAddress, setFormAddress,
    formAdminPassword, setFormAdminPassword,
    subscriptionStatus, setSubscriptionStatus,
    billingCycle, setBillingCycle,
    currentPeriodEnd, setCurrentPeriodEnd,
    lastPaymentDate, setLastPaymentDate,
    onDeleteClinic,
}: ClinicModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-md mx-auto my-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xl border border-white/10">
                            <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Platform Yönetimi</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 italic-none max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                Temel Klinik Bilgileri
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Klinik Adı</label>
                                    <input
                                        type="text"
                                        required
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="Güler Diş Kliniği"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">URL Dosya Adı (Slug)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formSlug}
                                        onChange={(e) => setFormSlug(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="guler-dis"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">İletişim Telefonu</label>
                                    <input
                                        type="text"
                                        value={formPhone}
                                        onChange={(e) => setFormPhone(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="05xx xxx xx xx"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Admin E-Posta</label>
                                    <input
                                        type="email"
                                        required
                                        value={formEmail}
                                        onChange={(e) => setFormEmail(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="admin@klinik.com"
                                    />
                                </div>
                            </div>

                            {!isEdit && setFormAdminPassword && (
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Yönetici Paneli Şifresi</label>
                                    <input
                                        type="password"
                                        required
                                        value={formAdminPassword}
                                        onChange={(e) => setFormAdminPassword(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Klinik Adresi</label>
                                <textarea
                                    value={formAddress}
                                    onChange={(e) => setFormAddress(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                    placeholder="Tam adres..."
                                />
                            </div>
                        </div>

                        <SubscriptionSection
                            subscriptionStatus={subscriptionStatus}
                            setSubscriptionStatus={setSubscriptionStatus}
                            billingCycle={billingCycle}
                            setBillingCycle={setBillingCycle}
                            currentPeriodEnd={currentPeriodEnd}
                            setCurrentPeriodEnd={setCurrentPeriodEnd}
                            lastPaymentDate={lastPaymentDate}
                            setLastPaymentDate={setLastPaymentDate}
                        />

                        <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-2xl border border-slate-200 py-3 text-[11px] font-black tracking-widest text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                VAZGEÇ
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 rounded-2xl bg-black py-3 text-[11px] font-black tracking-widest text-white shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {saving ? "KAYDEDİLİYOR..." : isEdit ? "GÜNCELLE" : "KAYDET VE OLUŞTUR"}
                            </button>
                        </div>

                        {isEdit && onDeleteClinic && (
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onDeleteClinic}
                                    className="w-full rounded-2xl border border-rose-200 py-2.5 text-[10px] font-black tracking-widest text-rose-500 hover:bg-rose-50 hover:border-rose-300 active:scale-95 transition-all uppercase"
                                >
                                    Kliniği Kalıcı Olarak Sil
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
