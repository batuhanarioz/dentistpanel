"use client";

import React, { useState, useMemo } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useTreatmentPlans, useTreatmentPlanMutations, PLAN_STATUS_CONFIG, ITEM_STATUS_CONFIG } from "@/hooks/useTreatmentPlanning";
import { TreatmentPlanWithItems } from "@/hooks/useTreatmentPlanning";
import { CreateTreatmentPlanModal } from "@/app/components/treatments/CreateTreatmentPlanModal";

type StatusFilter = "ALL" | TreatmentPlanWithItems["status"];

export default function TreatmentPlansPage() {
    usePageHeader("Tedavi Planları", "Hasta tedavi planlarını yönetin");

    const { data: plans = [], isLoading } = useTreatmentPlans();
    const { updateStatus, removePlan } = useTreatmentPlanMutations();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const filtered = useMemo(() => {
        let result = plans;
        if (statusFilter !== "ALL") result = result.filter(p => p.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.patient?.full_name?.toLowerCase().includes(q) ||
                p.title?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [plans, statusFilter, search]);

    const stats = useMemo(() => ({
        total: plans.length,
        inProgress: plans.filter(p => p.status === "in_progress").length,
        planned: plans.filter(p => p.status === "planned").length,
        completed: plans.filter(p => p.status === "completed").length,
        totalEstimated: plans.reduce((s, p) => s + (p.total_estimated_amount ?? 0), 0),
    }), [plans]);

    return (
        <div className="space-y-6">
            {/* Stat kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Toplam Plan" value={stats.total} color="slate" />
                <StatCard label="Devam Eden" value={stats.inProgress} color="amber" />
                <StatCard label="Planlandı" value={stats.planned} color="blue" />
                <StatCard label="Tahmini Gelir" value={`${stats.totalEstimated.toLocaleString("tr-TR")} ₺`} color="teal" />
            </div>

            {/* Filtre + arama */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Hasta adı veya plan başlığı..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-95 shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Yeni Plan
                    </button>
                    <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                    {(["ALL", "planned", "in_progress", "completed", "cancelled"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === s
                                ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                                }`}
                        >
                            {s === "ALL" ? `Tümü (${plans.length})` : PLAN_STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plan listesi */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400">Tedavi planı bulunamadı.</p>
                        <p className="text-xs text-slate-300 mt-1">Yeni bir plan oluşturmak için &quot;Yeni Plan&quot; butonuna tıklayın.</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-all mx-auto"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni Tedavi Planı Oluştur
                        </button>
                    </div>
                ) : filtered.map(plan => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        isExpanded={expandedId === plan.id}
                        onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                        onStatusChange={(status) => updateStatus.mutate({ id: plan.id, status })}
                        onDelete={() => { if (confirm("Bu tedavi planı silinsin mi?")) removePlan.mutate(plan.id); }}
                    />
                ))}
            </div>

            <CreateTreatmentPlanModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={() => setShowCreate(false)}
            />
        </div>
    );
}

// ─── Alt bileşenler ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colors: Record<string, string> = {
        slate: "bg-slate-50 text-slate-700",
        amber: "bg-amber-50 text-amber-700",
        blue:  "bg-blue-50 text-blue-700",
        teal:  "bg-teal-50 text-teal-700",
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded-lg w-fit ${colors[color]}`}>{label}</span>
            <span className="text-xl font-black text-slate-800 tracking-tighter">{value}</span>
        </div>
    );
}

interface PlanCardProps {
    plan: TreatmentPlanWithItems;
    isExpanded: boolean;
    onToggle: () => void;
    onStatusChange: (status: TreatmentPlanWithItems["status"]) => void;
    onDelete: () => void;
}

function PlanCard({ plan, isExpanded, onToggle, onStatusChange, onDelete }: PlanCardProps) {
    const statusCfg = PLAN_STATUS_CONFIG[plan.status];
    const completedItems = plan.items.filter(i => i.status === "completed").length;
    const progressPct = plan.items.length > 0 ? Math.round((completedItems / plan.items.length) * 100) : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Başlık satırı */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-slate-50/70 transition-colors"
            >
                {/* Durum dot */}
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />

                {/* Hasta + plan bilgisi */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 truncate">
                            {plan.patient?.full_name ?? "Bilinmeyen Hasta"}
                        </span>
                        {plan.title && (
                            <span className="text-xs text-slate-400 truncate">· {plan.title}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                            {statusCfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {new Date(plan.created_at).toLocaleDateString("tr-TR")}
                        </span>
                        {plan.items.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                                {completedItems}/{plan.items.length} işlem
                            </span>
                        )}
                        {plan.next_appointment_id && (
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                📅 Randevu planlandı
                            </span>
                        )}
                    </div>
                </div>

                {/* Tutar + chevron */}
                <div className="flex items-center gap-4 shrink-0">
                    {plan.total_estimated_amount != null && (
                        <span className="text-sm font-black text-teal-700">
                            {plan.total_estimated_amount.toLocaleString("tr-TR")} ₺
                        </span>
                    )}
                    {plan.items.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-500 rounded-full transition-all"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-400">{progressPct}%</span>
                        </div>
                    )}
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Genişletilmiş detay */}
            {isExpanded && (
                <div className="border-t border-slate-100 p-4 sm:p-5 space-y-4">
                    {/* Notlar */}
                    {plan.note && (
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Notu</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{plan.note}</p>
                        </div>
                    )}

                    {/* Hekim */}
                    {plan.doctor && (
                        <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-xs font-bold">{plan.doctor.full_name}</span>
                        </div>
                    )}

                    {/* İşlem listesi */}
                    {plan.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlemler</p>
                            <div className="space-y-1.5">
                                {plan.items.map(item => {
                                    const itemCfg = ITEM_STATUS_CONFIG[item.status];
                                    return (
                                        <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {item.tooth_no && (
                                                    <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md shrink-0">#{item.tooth_no}</span>
                                                )}
                                                <span className="text-xs font-bold text-slate-700 truncate">{item.procedure_name}</span>
                                                {item.quantity > 1 && (
                                                    <span className="text-[10px] text-slate-400 shrink-0">×{item.quantity}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${itemCfg.bg} ${itemCfg.text}`}>
                                                    {itemCfg.label}
                                                </span>
                                                {item.total_price != null && (
                                                    <span className="text-xs font-black text-slate-600">{item.total_price.toLocaleString("tr-TR")} ₺</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sonraki randevu */}
                    {plan.next_appointment_id && (
                        <div className="flex items-center gap-2 bg-teal-50 rounded-xl px-4 py-3 border border-teal-100">
                            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                                <p className="text-xs font-bold text-teal-700">Sonraki randevu otomatik oluşturuldu</p>
                                <p className="text-[10px] text-teal-600">Randevu Yönetimi sayfasından görüntüleyebilirsiniz.</p>
                            </div>
                        </div>
                    )}

                    {/* Eylemler */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum:</label>
                            <select
                                value={plan.status}
                                onChange={e => onStatusChange(e.target.value as TreatmentPlanWithItems["status"])}
                                className="h-8 px-3 bg-slate-100 rounded-xl text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 border-0 cursor-pointer"
                            >
                                {Object.entries(PLAN_STATUS_CONFIG).map(([val, cfg]) => (
                                    <option key={val} value={val}>{cfg.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={onDelete}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Planı Sil
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
