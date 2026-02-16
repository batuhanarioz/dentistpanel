import React from "react";
import type { SubscriptionPlan } from "@/types/database";

interface SubscriptionSectionProps {
    formPlanId: string;
    setFormPlanId: (val: string) => void;
    formCredits: number;
    setFormCredits: (val: number) => void;
    formTrialEndsAt: string;
    setFormTrialEndsAt: (val: string) => void;
    plans: SubscriptionPlan[];
}

export function SubscriptionSection({
    formPlanId,
    setFormPlanId,
    formCredits,
    setFormCredits,
    formTrialEndsAt,
    setFormTrialEndsAt,
    plans,
}: SubscriptionSectionProps) {
    return (
        <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider">Abonelik ve Plan</h4>
            <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Paket</label>
                    <select
                        value={formPlanId}
                        onChange={(e) => {
                            const newPlanId = e.target.value;
                            setFormPlanId(newPlanId);
                            // Krediyi otomatik planın limitine çek
                            const plan = plans.find(p => p.id === newPlanId);
                            if (plan) setFormCredits(plan.monthly_credits);
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                        {plans.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.monthly_price} ₺/ay)</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700">Kredi</label>
                        <input
                            type="number"
                            value={formCredits}
                            onChange={(e) => setFormCredits(parseInt(e.target.value) || 0)}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700">Deneme Bitiş</label>
                        <input
                            type="datetime-local"
                            value={formTrialEndsAt}
                            onChange={(e) => setFormTrialEndsAt(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
