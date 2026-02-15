import React from "react";
import { UserRole } from "@/types/database";

const ROLE_DESCRIPTIONS = [
    { role: UserRole.DOKTOR, desc: "Tıbbi işlemler: randevular, hasta notları ve tedavi planları" },
    { role: UserRole.SEKRETER, desc: "Operasyon: randevu kayıt, hasta teyit ve resepsiyon işlemleri" },
    { role: UserRole.FINANS, desc: "Maddi işlemler: ödemeler, taksitler ve finansal raporlar" },
];

const LOCAL_ROLE_LABELS: Record<string, string> = {
    [UserRole.ADMIN]: "Yönetici",
    [UserRole.DOKTOR]: "Doktor",
    [UserRole.SEKRETER]: "Sekreter",
    [UserRole.FINANS]: "Finans",
    [UserRole.SUPER_ADMIN]: "Süper Admin",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: "bg-purple-100 text-purple-700 border-purple-200",
    [UserRole.ADMIN]: "bg-teal-100 text-teal-700 border-teal-200",
    [UserRole.DOKTOR]: "bg-blue-100 text-blue-700 border-blue-200",
    [UserRole.SEKRETER]: "bg-amber-100 text-amber-700 border-amber-200",
    [UserRole.FINANS]: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface DashboardQuickLinksProps {
    isAdmin: boolean;
    onConfigClick: () => void;
}

export function DashboardQuickLinks({ isAdmin, onConfigClick }: DashboardQuickLinksProps) {
    return (
        <div className="space-y-5">
            {isAdmin && (
                <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-slate-900">Dashboard Kontrol Listesi</h3>
                            <p className="text-xs text-slate-500">Kliniğinizdeki görevlerin otomatik dağılımını buradan yönetebilirsiniz.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onConfigClick}
                        className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                        Görev Dağılımını Yapılandır
                    </button>
                </div>
            )}

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60">
                            <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900">Rol Tanımları</h2>
                    </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                    {ROLE_DESCRIPTIONS.map((r) => (
                        <div key={r.role} className="flex items-start gap-2.5">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border shrink-0 mt-0.5 ${ROLE_BADGE_COLORS[r.role]}`}>
                                {LOCAL_ROLE_LABELS[r.role] || r.role}
                            </span>
                            <span className="text-[11px] text-slate-600 leading-relaxed">{r.desc}</span>
                        </div>
                    ))}
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                            <span className="font-semibold">Not:</span> ADMIN rolü kullanıcı yönetimi yapabilir. Diğer roller listeyi görüntüleyebilir ancak değişiklik yapamaz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
