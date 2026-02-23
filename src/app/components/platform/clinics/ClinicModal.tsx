import React from "react";
import type { WorkingHours, DayOfWeek, SubscriptionPlan } from "@/types/database";
import type { ClinicAutomation } from "@/constants/automations";
import { WorkingHoursSection } from "./sections/WorkingHoursSection";
import { SubscriptionSection } from "./sections/SubscriptionSection";
import { AutomationSection } from "./sections/AutomationSection";

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

    // Working Hours
    formWorkingHours: WorkingHours;
    updateDaySchedule: (day: DayOfWeek, field: string, value: string | boolean) => void;

    // Subscription
    formPlanId: string;
    setFormPlanId: (val: string) => void;
    formCredits: number;
    setFormCredits: (val: number) => void;
    formTrialEndsAt: string;
    setFormTrialEndsAt: (val: string) => void;
    plans: SubscriptionPlan[];

    // Automation
    formAutomations: ClinicAutomation[]; // ClinicAutomation type from constants
    setFormAutomations: React.Dispatch<React.SetStateAction<ClinicAutomation[]>>;
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
    formWorkingHours, updateDaySchedule,
    formPlanId, setFormPlanId,
    formCredits, setFormCredits,
    formTrialEndsAt, setFormTrialEndsAt,
    plans,
    formAutomations, setFormAutomations,
}: ClinicModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-auto my-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">{title}</h3>
                            <p className="text-xs text-teal-100">Platform yönetimi</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto italic-none">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">Klinik adı</label>
                            <input
                                type="text"
                                required
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                placeholder="Örn: Güler Diş Kliniği"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">Slug (URL tanımlayıcı)</label>
                            <input
                                type="text"
                                required
                                value={formSlug}
                                onChange={(e) => setFormSlug(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                placeholder="guler-dis-klinigi"
                            />
                            <p className="text-[10px] text-slate-500">Küçük harf, tire ile ayrılmış. Benzersiz olmalı.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-700">Telefon</label>
                                <input
                                    type="text"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    placeholder="0212 xxx xx xx"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-700">E-posta (Admin)</label>
                                <input
                                    type="email"
                                    required
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    placeholder="admin@klinik.com"
                                />
                            </div>
                        </div>

                        {!isEdit && setFormAdminPassword && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-700">Admin Şifresi</label>
                                <input
                                    type="password"
                                    required
                                    value={formAdminPassword}
                                    onChange={(e) => setFormAdminPassword(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    placeholder="••••••••"
                                />
                                <p className="text-[10px] text-slate-500 italic block">* Klinik yöneticisi bu şifre ile giriş yapacaktır.</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">Adres</label>
                            <textarea
                                value={formAddress}
                                onChange={(e) => setFormAddress(e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                placeholder="Tam adres..."
                            />
                        </div>

                        <WorkingHoursSection
                            workingHours={formWorkingHours}
                            updateDaySchedule={updateDaySchedule}
                        />

                        <SubscriptionSection
                            formPlanId={formPlanId}
                            setFormPlanId={setFormPlanId}
                            formCredits={formCredits}
                            setFormCredits={setFormCredits}
                            formTrialEndsAt={formTrialEndsAt}
                            setFormTrialEndsAt={setFormTrialEndsAt}
                            plans={plans}
                        />

                        <AutomationSection
                            formAutomations={formAutomations}
                            setFormAutomations={setFormAutomations}
                        />

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                İPTAL
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-100 hover:from-teal-700 hover:to-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {saving ? "KAYDEDİLİYOR..." : isEdit ? "GÜNCELLE" : "OLUŞTUR"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
