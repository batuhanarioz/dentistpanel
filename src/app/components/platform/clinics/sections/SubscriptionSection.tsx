import React from "react";

interface SubscriptionSectionProps {
    subscriptionStatus: string;
    setSubscriptionStatus: (val: string) => void;
    billingCycle: string;
    setBillingCycle: (val: string) => void;
    currentPeriodEnd: string;
    setCurrentPeriodEnd: (val: string) => void;
    lastPaymentDate: string;
    setLastPaymentDate: (val: string) => void;
}

export function SubscriptionSection({
    subscriptionStatus,
    setSubscriptionStatus,
    billingCycle,
    setBillingCycle,
    currentPeriodEnd,
    setCurrentPeriodEnd,
    lastPaymentDate,
    setLastPaymentDate,
}: SubscriptionSectionProps) {

    function extendPeriod(days: number) {
        const base = currentPeriodEnd ? new Date(currentPeriodEnd) : new Date();
        base.setDate(base.getDate() + days);
        setCurrentPeriodEnd(base.toISOString().slice(0, 16));
        setLastPaymentDate(new Date().toISOString().slice(0, 16));
        setSubscriptionStatus("active");
    }

    return (
        <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Abonelik Yönetimi
            </h4>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Abonelik Durumu</label>
                    <select
                        value={subscriptionStatus}
                        onChange={(e) => setSubscriptionStatus(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    >
                        <option value="trialing">Deneme (Trial)</option>
                        <option value="active">Aktif</option>
                        <option value="past_due">Ödeme Gecikti</option>
                        <option value="canceled">İptal Edildi</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Ödeme Döngüsü</label>
                    <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    >
                        <option value="monthly">Aylık Plan</option>
                        <option value="annual">Yıllık Plan</option>
                        <option value="pilot">Pilot Klinik</option>
                    </select>
                </div>
            </div>

            {/* Quick extend buttons */}
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Hızlı Uzatma</label>
                <div className="flex items-center gap-2">
                    {[
                        { label: "+7 Gün", days: 7 },
                        { label: "+30 Gün", days: 30 },
                        { label: "+1 Yıl", days: 365 },
                    ].map(({ label, days }) => (
                        <button
                            key={days}
                            type="button"
                            onClick={() => extendPeriod(days)}
                            className="flex-1 rounded-xl border border-teal-200 bg-teal-50 py-2 text-[10px] font-black uppercase tracking-widest text-teal-700 hover:bg-teal-100 hover:border-teal-300 active:scale-95 transition-all"
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-slate-400 font-medium">Butona tıklayınca mevcut dönem sonundan uzatılır, durum &quot;Aktif&quot; yapılır ve son ödeme tarihi güncellenir.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Son Ödeme Tarihi</label>
                    <input
                        type="datetime-local"
                        value={lastPaymentDate}
                        onChange={(e) => setLastPaymentDate(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">Dönem Sonu Tarihi</label>
                    <input
                        type="datetime-local"
                        value={currentPeriodEnd}
                        onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
                * Bu bilgiler kliniğin panele erişimini ve faturalandırma takibini belirler.
            </p>
        </div>
    );
}
