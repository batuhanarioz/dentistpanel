"use client";

import React, { useState, useMemo } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useTreatmentPlans, useTreatmentPlanMutations, PLAN_STATUS_CONFIG, ITEM_STATUS_CONFIG } from "@/hooks/useTreatmentPlanning";
import { TreatmentPlanWithItems } from "@/hooks/useTreatmentPlanning";
import { TreatmentPlanItemWithDoctor } from "@/lib/api";
import { CreateTreatmentPlanModal } from "@/app/components/treatments/CreateTreatmentPlanModal";
import { useClinic } from "@/app/context/ClinicContext";
import { useConfirm } from "@/app/context/ConfirmContext";

type StatusFilter = "ALL" | TreatmentPlanWithItems["status"];

export default function TreatmentPlansPage() {
    const { confirm } = useConfirm();
    const clinic = useClinic();
    const brandFrom = clinic.themeColorFrom || '#0d9488';
    const brandTo = clinic.themeColorTo || '#10b981';

    usePageHeader("Tedavi Planları");

    const { data: plans = [], isLoading } = useTreatmentPlans();
    const { updateStatus, removePlan, upsertItem, removeItem } = useTreatmentPlanMutations();

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

    const filterTabs: { key: StatusFilter; label: string }[] = [
        { key: "ALL", label: `Tümü (${plans.length})` },
        { key: "planned", label: PLAN_STATUS_CONFIG.planned.label },
        { key: "in_progress", label: PLAN_STATUS_CONFIG.in_progress.label },
        { key: "completed", label: PLAN_STATUS_CONFIG.completed.label },
        { key: "cancelled", label: PLAN_STATUS_CONFIG.cancelled.label },
    ];

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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Hasta adı veya plan başlığı..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-slate-300 focus:bg-white transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        style={{ background: `linear-gradient(to right, ${brandFrom}, ${brandTo})` }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Yeni Plan
                    </button>
                </div>
                {/* Filter tabs — tüm 7 durum */}
                <div className="flex gap-1.5 flex-wrap">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            style={statusFilter === tab.key ? { background: brandFrom } : {}}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                statusFilter === tab.key
                                    ? "text-white shadow-md"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                            }`}
                        >
                            {tab.label}
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
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: `${brandFrom}15`, color: brandFrom }}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400">Tedavi planı bulunamadı.</p>
                        <p className="text-xs text-slate-300 mt-1">Yeni bir plan oluşturmak için &quot;Yeni Plan&quot; butonuna tıklayın.</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            style={{ background: `linear-gradient(to right, ${brandFrom}, ${brandTo})` }}
                            className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all mx-auto active:scale-95"
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
                        onDelete={() => {
                            confirm({
                                title: "Planı Sil",
                                message: "Bu tedavi planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
                                variant: "danger",
                                onConfirm: () => removePlan.mutate(plan.id)
                            });
                        }}
                        onUpsertItem={(item) => upsertItem.mutate(item)}
                        onRemoveItem={(itemId) => {
                            confirm({
                                title: "İşlemi Sil",
                                message: "Bu tedavi kalemini silmek istediğinizden emin misiniz?",
                                variant: "danger",
                                onConfirm: () => removeItem.mutate(itemId)
                            });
                        }}
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
    const clinic = useClinic();
    const brandFrom = clinic.themeColorFrom || '#0d9488';

    const colors: Record<string, string> = {
        slate: "bg-slate-50 text-slate-700",
        amber: "bg-amber-50 text-amber-700",
        blue:  "bg-blue-50 text-blue-700",
        teal:  `bg-teal-50 text-teal-700`,
    };

    const style = color === 'teal' 
        ? { background: `${brandFrom}15`, color: brandFrom } 
        : undefined;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-1">
            <span 
                className={`text-xs font-black px-2 py-0.5 rounded-lg w-fit ${color === 'teal' ? '' : colors[color]}`}
                style={style}
            >
                {label}
            </span>
            <span className="text-xl font-black text-slate-800 tracking-tighter">{value}</span>
        </div>
    );
}

interface EditingItem {
    id: string;
    procedure_name: string;
    tooth_no: string;
    quantity: number;
    unit_price: number;
    status: TreatmentPlanItemWithDoctor["status"];
}

interface PlanCardProps {
    plan: TreatmentPlanWithItems;
    isExpanded: boolean;
    onToggle: () => void;
    onStatusChange: (status: TreatmentPlanWithItems["status"]) => void;
    onDelete: () => void;
    onUpsertItem: (item: Parameters<ReturnType<typeof useTreatmentPlanMutations>["upsertItem"]["mutate"]>[0]) => void;
    onRemoveItem: (itemId: string) => void;
}

function PlanCard({ plan, isExpanded, onToggle, onStatusChange, onDelete, onUpsertItem, onRemoveItem }: PlanCardProps) {
    const { confirm } = useConfirm();
    const clinic = useClinic();
    const brandFrom = clinic.themeColorFrom || '#0d9488';
    const brandTo = clinic.themeColorTo || '#10b981';

    const statusCfg = PLAN_STATUS_CONFIG[plan.status];
    const completedItems = plan.items.filter(i => i.status === "completed").length;
    const progressPct = plan.items.length > 0 ? Math.round((completedItems / plan.items.length) * 100) : 0;

    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [savingItem, setSavingItem] = useState(false);

    const startEdit = (item: TreatmentPlanItemWithDoctor) => {
        setEditingItem({
            id: item.id,
            procedure_name: item.procedure_name,
            tooth_no: item.tooth_no ?? "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: item.status,
        });
    };

    const saveEdit = async () => {
        if (!editingItem) return;
        setSavingItem(true);
        onUpsertItem({
            id: editingItem.id,
            treatment_plan_id: plan.id,
            patient_id: plan.patient_id,
            procedure_name: editingItem.procedure_name,
            tooth_no: editingItem.tooth_no || null,
            quantity: editingItem.quantity,
            unit_price: editingItem.unit_price,
            status: editingItem.status,
        });
        setSavingItem(false);
        setEditingItem(null);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Başlık satırı */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-slate-50/70 transition-colors"
            >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />
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
                            <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${brandFrom}15`, color: brandFrom }}
                            >
                                Randevu planlandı
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {plan.total_estimated_amount != null && (
                        <span className="text-sm font-black" style={{ color: brandFrom }}>
                            {plan.total_estimated_amount.toLocaleString("tr-TR")} ₺
                        </span>
                    )}
                    {plan.items.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all" 
                                    style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${brandFrom}, ${brandTo})` }} 
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
                    {plan.note && (
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Notu</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{plan.note}</p>
                        </div>
                    )}

                    {plan.doctor && (
                        <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-xs font-bold">{plan.doctor.full_name}</span>
                        </div>
                    )}

                    {/* İşlem listesi + düzenleme */}
                    {plan.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlemler</p>
                            <div className="space-y-1.5">
                                {plan.items.map(item => {
                                    const itemCfg = ITEM_STATUS_CONFIG[item.status];
                                    const isEditingThis = editingItem?.id === item.id;

                                    if (isEditingThis && editingItem) {
                                        // ── Inline düzenleme formu ──
                                        return (
                                            <div key={item.id} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2.5">
                                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Kalemi Düzenle</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="col-span-2 space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase">İşlem Adı</label>
                                                        <input
                                                            type="text"
                                                            value={editingItem.procedure_name}
                                                            onChange={e => setEditingItem(v => v ? { ...v, procedure_name: e.target.value } : v)}
                                                            className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase">Diş No</label>
                                                        <input
                                                            type="text"
                                                            value={editingItem.tooth_no}
                                                            onChange={e => setEditingItem(v => v ? { ...v, tooth_no: e.target.value } : v)}
                                                            placeholder="ör. 11"
                                                            className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase">Durum</label>
                                                        <select
                                                            value={editingItem.status}
                                                            onChange={e => setEditingItem(v => v ? { ...v, status: e.target.value as EditingItem["status"] } : v)}
                                                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
                                                        >
                                                            {Object.entries(ITEM_STATUS_CONFIG).map(([val, cfg]) => (
                                                                <option key={val} value={val}>{cfg.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase">Adet</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={editingItem.quantity}
                                                            onChange={e => setEditingItem(v => v ? { ...v, quantity: Math.max(1, parseInt(e.target.value) || 1) } : v)}
                                                            className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase">Birim Fiyat (₺)</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={editingItem.unit_price || ""}
                                                            onChange={e => setEditingItem(v => v ? { ...v, unit_price: parseFloat(e.target.value) || 0 } : v)}
                                                            className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                </div>
                                                {editingItem.quantity > 0 && editingItem.unit_price > 0 && (
                                                    <p className="text-right text-[10px] font-black text-indigo-600">
                                                        {editingItem.quantity} × {editingItem.unit_price.toLocaleString("tr-TR")} ₺ = {(editingItem.quantity * editingItem.unit_price).toLocaleString("tr-TR")} ₺
                                                    </p>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={saveEdit}
                                                        disabled={savingItem || !editingItem.procedure_name.trim()}
                                                        className="flex-1 h-8 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                                                    >
                                                        {savingItem ? "Kaydediliyor..." : "Kaydet"}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingItem(null)}
                                                        className="px-4 h-8 border border-slate-200 text-slate-500 text-[10px] font-black rounded-lg hover:bg-slate-50 transition-all"
                                                    >
                                                        İptal
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingItem(null); onRemoveItem(item.id); }}
                                                        className="px-4 h-8 border border-rose-200 text-rose-500 text-[10px] font-black rounded-lg hover:bg-rose-50 transition-all"
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // ── Normal kalem satırı ──
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
                                                {item.assigned_doctor && (
                                                    <span className="text-[9px] text-slate-400 shrink-0 hidden sm:inline">— {item.assigned_doctor.full_name}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${itemCfg.bg} ${itemCfg.text}`}>
                                                    {itemCfg.label}
                                                </span>
                                                {item.total_price != null && item.total_price > 0 && (
                                                    <span className="text-xs font-black text-slate-600">{item.total_price.toLocaleString("tr-TR")} ₺</span>
                                                )}
                                                <button
                                                    onClick={() => startEdit(item)}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    title="Kalemi Düzenle"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sonraki randevu */}
                    {plan.next_appointment_id && (
                        <div 
                            className="flex items-center gap-2 rounded-xl px-4 py-3 border"
                            style={{ background: `${brandFrom}08`, borderColor: `${brandFrom}1a` }}
                        >
                            <svg className="w-4 h-4 shrink-0" style={{ color: brandFrom }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                                <p className="text-xs font-bold" style={{ color: brandFrom }}>Sonraki randevu otomatik oluşturuldu</p>
                                <p className="text-[10px] opacity-70" style={{ color: brandFrom }}>Randevu Yönetimi sayfasından görüntüleyebilirsiniz.</p>
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
