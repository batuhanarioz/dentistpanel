"use client";

import { useState, useMemo } from "react";
import { useRecallQueue, useUpdateRecallStatus } from "@/hooks/useRecallQueue";
import type { RecallQueueItem, RecallStatus } from "@/types/database";

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function todayIST(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
}

function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric", month: "short", year: "numeric",
    });
}

function daysLabel(dueDate: string): { text: string; cls: string; isOverdue: boolean } {
    const today = todayIST();
    const diff = Math.round(
        (new Date(today).getTime() - new Date(dueDate).getTime()) / 86_400_000
    );
    if (diff === 0) return { text: "Bugün", cls: "text-amber-700 bg-amber-50 border-amber-200", isOverdue: true };
    if (diff > 0) return { text: `${diff} gün gecikmiş`, cls: "text-rose-700 bg-rose-50 border-rose-200", isOverdue: true };
    return { text: `${Math.abs(diff)} gün sonra`, cls: "text-slate-500 bg-slate-50 border-slate-200", isOverdue: false };
}

function buildWaLink(phone: string | null | undefined, patientName: string, treatmentType: string, lastTreatmentDate: string): string {
    if (!phone) return "#";
    const normalized = phone.replace(/\D/g, "").replace(/^0/, "90");
    const months = Math.round(
        (new Date().getTime() - new Date(lastTreatmentDate + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const duration = months > 1 ? `${months} ay` : "bir süre";
    const msg = `Merhaba ${patientName}, ${treatmentType} tedavinizin üzerinden ${duration} geçti. Kontrol muayedeniz için randevu almak ister misiniz? 🦷`;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

// ─── Stat kartı ───────────────────────────────────────────────────────────────

function StatCard({ value, label, cls }: { value: number; label: string; cls: string }) {
    return (
        <div className={`rounded-2xl border px-4 py-3.5 flex flex-col gap-0.5 ${cls}`}>
            <p className="text-2xl font-black leading-none">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
        </div>
    );
}

// ─── Kart ─────────────────────────────────────────────────────────────────────

function RecallCard({ item, onAction }: {
    item: RecallQueueItem;
    onAction: (id: string, status: RecallStatus) => void;
}) {
    const patient = item.patients;
    const label = daysLabel(item.recall_due_at);
    const waLink = buildWaLink(patient?.phone, patient?.full_name ?? "Hasta", item.treatment_type, item.last_treatment_date);
    const attemptCount = item.contact_attempts ?? 0;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-all">
            {/* Üst kısım */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-black text-slate-900 text-base leading-tight">
                        {patient?.full_name ?? "Hasta"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {patient?.phone ?? "Telefon yok"}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-xl ${label.cls}`}>
                        {label.text}
                    </span>
                    {attemptCount > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                            💬 {attemptCount}x ulaşıldı
                        </span>
                    )}
                </div>
            </div>

            {/* Tedavi bilgisi */}
            <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                    {item.treatment_type}
                </span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
                    Son tedavi: {formatDate(item.last_treatment_date)}
                </span>
            </div>

            {/* Not */}
            {item.notes && (
                <p className="text-[11px] text-slate-500 italic border-l-2 border-slate-200 pl-3">
                    {item.notes}
                </p>
            )}

            {/* Aksiyon butonları */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* WhatsApp */}
                <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all
                        ${patient?.phone
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                        }`}
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.094.541 4.065 1.49 5.782L.055 23.07a.75.75 0 0 0 .94.908l5.417-1.416A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.962 9.962 0 0 1-5.063-1.375l-.363-.214-3.757.982.999-3.648-.235-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                </a>

                {/* Ulaşıldı */}
                {item.status === "pending" && (
                    <button
                        onClick={() => onAction(item.id, "contacted")}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                        ✓ Ulaşıldı
                    </button>
                )}

                {/* Randevu Alındı */}
                {(item.status === "pending" || item.status === "contacted") && (
                    <button
                        onClick={() => onAction(item.id, "booked")}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all"
                    >
                        📅 Randevu Alındı
                    </button>
                )}

                {/* Tekrar Ulaş */}
                {item.status === "contacted" && (
                    <button
                        onClick={() => onAction(item.id, "contacted")}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                        🔄 Tekrar Ulaş
                    </button>
                )}

                {/* Atla */}
                {item.status !== "dismissed" && item.status !== "booked" && (
                    <button
                        onClick={() => onAction(item.id, "dismissed")}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                        ✕ Atla
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Boş durum ────────────────────────────────────────────────────────────────

function EmptyState({ tab, hasSearch }: { tab: string; hasSearch: boolean }) {
    if (hasSearch) {
        return (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-sm font-bold text-slate-400">Arama sonucu bulunamadı.</p>
            </div>
        );
    }
    const messages: Record<string, { icon: string; text: string }> = {
        pending: { icon: "📋", text: "Bugün aranacak hasta yok." },
        contacted: { icon: "💬", text: "Ulaşılmış hasta kaydı yok." },
        booked: { icon: "📅", text: "Randevu alınan hasta yok." },
        dismissed: { icon: "✕", text: "Atlanan kayıt yok." },
    };
    const m = messages[tab] ?? { icon: "📋", text: "Kayıt yok." };
    return (
        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
            <p className="text-4xl mb-3">{m.icon}</p>
            <p className="text-sm font-bold text-slate-400">{m.text}</p>
            <p className="text-[11px] text-slate-300 mt-1">
                Tedavi Ayarları &rarr; Tedavi Türleri ekranından her tedavi için geri çağırma süresi (gün) tanımlayabilirsiniz.
            </p>
        </div>
    );
}

// ─── Tab tanımları ────────────────────────────────────────────────────────────

const TABS: { value: RecallStatus; label: string }[] = [
    { value: "pending",   label: "Bekleyenler" },
    { value: "contacted", label: "Ulaşıldı" },
    { value: "booked",    label: "Randevu Alındı" },
    { value: "dismissed", label: "Atlandı" },
];

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function RecallPage() {
    const [activeTab, setActiveTab] = useState<RecallStatus>("pending");
    const [search, setSearch] = useState("");
    const [overdueOnly, setOverdueOnly] = useState(false);

    const { data: allItems = [], isLoading, isError } = useRecallQueue();
    const { mutate: updateStatus, isPending } = useUpdateRecallStatus();

    function handleAction(id: string, status: RecallStatus) {
        updateStatus({ id, status });
    }

    // ── İstatistikler ─────────────────────────────────────────────────────────
    const today = todayIST();
    const stats = useMemo(() => {
        const pending   = allItems.filter(i => i.status === "pending").length;
        const overdue   = allItems.filter(i => i.status === "pending" && i.recall_due_at <= today).length;
        const contacted = allItems.filter(i => i.status === "contacted").length;
        const booked    = allItems.filter(i => i.status === "booked").length;
        const total     = allItems.filter(i => i.status !== "dismissed").length;
        const rate      = total > 0 ? Math.round((booked / total) * 100) : 0;
        return { pending, overdue, contacted, booked, rate };
    }, [allItems, today]);

    // ── Tab sayıları ──────────────────────────────────────────────────────────
    const tabCounts = useMemo(() => ({
        pending:   allItems.filter(i => i.status === "pending").length,
        contacted: allItems.filter(i => i.status === "contacted").length,
        booked:    allItems.filter(i => i.status === "booked").length,
        dismissed: allItems.filter(i => i.status === "dismissed").length,
    }), [allItems]);

    // ── Filtrelenmiş liste ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = allItems.filter(i => i.status === activeTab);
        if (overdueOnly && activeTab === "pending") {
            list = list.filter(i => i.recall_due_at <= today);
        }
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(i =>
                (i.patients?.full_name ?? "").toLowerCase().includes(q) ||
                i.treatment_type.toLowerCase().includes(q) ||
                (i.patients?.phone ?? "").includes(q)
            );
        }
        return list;
    }, [allItems, activeTab, overdueOnly, search, today]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Başlık */}
            <div>
                <h1 className="text-2xl font-black text-slate-900">Recall Çağrı Listesi</h1>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Kontrol zamanı gelen hastaları WhatsApp ile arayın
                </p>
            </div>

            {/* Stat kartları */}
            {!isLoading && !isError && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                        value={stats.pending}
                        label="Bekleyen"
                        cls="bg-slate-50 border-slate-200 text-slate-700"
                    />
                    <StatCard
                        value={stats.overdue}
                        label="Gecikmiş"
                        cls={stats.overdue > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-500"}
                    />
                    <StatCard
                        value={stats.contacted}
                        label="Ulaşıldı"
                        cls="bg-blue-50 border-blue-200 text-blue-700"
                    />
                    <StatCard
                        value={stats.rate}
                        label="Randevu %"
                        cls={stats.rate > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}
                    />
                </div>
            )}

            {/* Info banner */}
            <div className="rounded-2xl bg-teal-50 border border-teal-100 px-5 py-3.5 flex items-start gap-3">
                <span className="text-lg mt-0.5">ℹ️</span>
                <p className="text-[12px] font-semibold text-teal-800">
                    Liste her sabah 10:00&apos;da otomatik güncellenir. Tedavi Ayarları &rarr; Tedavi Türleri ekranından her tedavi için geri çağırma süresi (gün) tanımlayabilirsiniz.
                </p>
            </div>

            {/* Arama + Gecikmiş filtresi */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Hasta adı, tedavi veya telefon..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                </div>
                {activeTab === "pending" && (
                    <button
                        onClick={() => setOverdueOnly(v => !v)}
                        className={`shrink-0 px-4 py-2.5 rounded-2xl text-[11px] font-black border transition-all ${
                            overdueOnly
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600"
                        }`}
                    >
                        🔴 Gecikmiş
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                {TABS.map(tab => {
                    const count = tabCounts[tab.value];
                    return (
                        <button
                            key={tab.value}
                            onClick={() => { setActiveTab(tab.value); setOverdueOnly(false); setSearch(""); }}
                            className={`whitespace-nowrap shrink-0 py-2 px-3 rounded-xl text-xs font-black transition-all ${activeTab === tab.value
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-black ${
                                    tab.value === "pending" ? "bg-teal-500" :
                                    tab.value === "contacted" ? "bg-blue-500" :
                                    tab.value === "booked" ? "bg-emerald-500" :
                                    "bg-slate-400"
                                }`}>
                                    {count > 99 ? "99+" : count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* İçerik */}
            {isLoading && (
                <div className="py-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                </div>
            )}
            {isError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 text-sm font-bold text-rose-700">
                    Veriler yüklenirken hata oluştu.
                </div>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
                <EmptyState tab={activeTab} hasSearch={search.trim().length > 0 || overdueOnly} />
            )}
            {!isLoading && !isError && filtered.length > 0 && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
                    {filtered.map(item => (
                        <RecallCard key={item.id} item={item} onAction={handleAction} />
                    ))}
                </div>
            )}
        </div>
    );
}
