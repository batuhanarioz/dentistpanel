"use client";

import { useState, useMemo } from "react";
import { useSmartAssistant, AssistantItem, AssistantItemType, useDismissAssistantItem, useUndoDismissAssistantItem } from "@/hooks/useSmartAssistant";
import { useRecallQueue, useUpdateRecallStatus } from "@/hooks/useRecallQueue";
import { QuickAppointmentModal } from "@/app/components/appointments/QuickAppointmentModal";
import type { RecallQueueItem, RecallStatus } from "@/types/database";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// --- Kategori renk & ikon tanımları ---
type CategoryStyle = {
    icon: string;
    bg: string;         // kart arka plan
    border: string;     // kart kenar
    badge: string;      // kategori badge
    accent: string;     // başlık / vurgu rengi
    glow: string;       // hover glow
    btn: string;        // WhatsApp butonu gradient
    filterActive: string; // filtre butonu aktif rengi
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
    REMINDER: {
        icon: "🔔",
        bg: "bg-gradient-to-br from-violet-50 via-white to-violet-100/30",
        border: "border-violet-200/60 group-hover:border-violet-400/50",
        badge: "bg-violet-100/80 text-violet-700 border-violet-200",
        accent: "text-violet-700",
        glow: "hover:shadow-violet-200/40 hover:bg-violet-50/50",
        btn: "from-violet-600 to-purple-700 shadow-violet-200/50 hover:shadow-violet-300/60",
        filterActive: "bg-violet-600 text-white shadow-violet-200 shadow-lg ring-violet-500",
    },
    BIRTHDAY: {
        icon: "🎂",
        bg: "bg-gradient-to-br from-pink-50 via-white to-rose-100/30",
        border: "border-pink-200/60 group-hover:border-pink-400/50",
        badge: "bg-pink-100/80 text-pink-700 border-pink-200",
        accent: "text-pink-600",
        glow: "hover:shadow-pink-200/40 hover:bg-pink-50/50",
        btn: "from-pink-500 to-rose-600 shadow-pink-200/50 hover:shadow-pink-300/60",
        filterActive: "bg-pink-600 text-white shadow-pink-200 shadow-lg ring-pink-500",
    },
    DELAY: {
        icon: "⏰",
        bg: "bg-gradient-to-br from-orange-50 via-white to-amber-100/30",
        border: "border-orange-200/60 group-hover:border-orange-400/50",
        badge: "bg-orange-100/80 text-orange-700 border-orange-200",
        accent: "text-orange-600",
        glow: "hover:shadow-orange-200/40 hover:bg-orange-50/50",
        btn: "from-orange-500 to-amber-600 shadow-orange-200/50 hover:shadow-orange-300/60",
        filterActive: "bg-orange-600 text-white shadow-orange-200 shadow-lg ring-orange-500",
    },
    FOLLOWUP: {
        icon: "🩺",
        bg: "bg-gradient-to-br from-blue-50 via-white to-cyan-100/30",
        border: "border-blue-200/60 group-hover:border-blue-400/50",
        badge: "bg-blue-100/80 text-blue-700 border-blue-200",
        accent: "text-blue-600",
        glow: "hover:shadow-blue-200/40 hover:bg-blue-50/50",
        btn: "from-blue-600 to-cyan-700 shadow-blue-200/50 hover:shadow-blue-300/60",
        filterActive: "bg-blue-600 text-white shadow-blue-200 shadow-lg ring-blue-500",
    },
    PAYMENT: {
        icon: "💳",
        bg: "bg-gradient-to-br from-emerald-50 via-white to-teal-100/30",
        border: "border-emerald-200/60 group-hover:border-emerald-400/50",
        badge: "bg-emerald-100/80 text-emerald-700 border-emerald-200",
        accent: "text-emerald-600",
        glow: "hover:shadow-emerald-200/40 hover:bg-emerald-50/50",
        btn: "from-emerald-600 to-teal-700 shadow-emerald-200/50 hover:shadow-emerald-300/60",
        filterActive: "bg-emerald-600 text-white shadow-emerald-200 shadow-lg ring-emerald-500",
    },
    SATISFACTION: {
        icon: "⭐",
        bg: "bg-gradient-to-br from-yellow-50 via-white to-orange-100/30",
        border: "border-yellow-200/60 group-hover:border-yellow-400/50",
        badge: "bg-yellow-100/80 text-yellow-700 border-yellow-200",
        accent: "text-yellow-600",
        glow: "hover:shadow-yellow-200/40 hover:bg-yellow-50/50",
        btn: "from-yellow-500 to-orange-600 shadow-yellow-200/50 hover:shadow-yellow-300/60",
        filterActive: "bg-yellow-600 text-white shadow-yellow-200 shadow-lg ring-yellow-500",
    },
    NEW_PATIENT: {
        icon: "🌟",
        bg: "bg-gradient-to-br from-teal-50 via-white to-emerald-100/30",
        border: "border-teal-200/60 group-hover:border-teal-400/50",
        badge: "bg-teal-100/80 text-teal-700 border-teal-200",
        accent: "text-teal-600",
        glow: "hover:shadow-teal-200/40 hover:bg-teal-50/50",
        btn: "from-teal-600 to-emerald-700 shadow-teal-200/50 hover:shadow-teal-300/60",
        filterActive: "bg-teal-600 text-white shadow-teal-200 shadow-lg ring-teal-500",
    },
    LAB_TRACKING: {
        icon: "🧪",
        bg: "bg-gradient-to-br from-indigo-50 via-white to-violet-100/30",
        border: "border-indigo-200/60 group-hover:border-indigo-400/50",
        badge: "bg-indigo-100/80 text-indigo-700 border-indigo-200",
        accent: "text-indigo-600",
        glow: "hover:shadow-indigo-200/40 hover:bg-indigo-50/50",
        btn: "from-indigo-600 to-violet-700 shadow-indigo-200/50 hover:shadow-indigo-300/60",
        filterActive: "bg-indigo-600 text-white shadow-indigo-200 shadow-lg ring-indigo-500",
    },
    INCOMPLETE: {
        icon: "⚠️",
        bg: "bg-gradient-to-br from-amber-50 via-white to-orange-100/30",
        border: "border-amber-200/60 group-hover:border-amber-400/50",
        badge: "bg-amber-100/80 text-amber-700 border-amber-200",
        accent: "text-amber-600",
        glow: "hover:shadow-amber-200/40 hover:bg-amber-50/50",
        btn: "from-amber-500 to-orange-600 shadow-amber-200/50 hover:shadow-amber-300/60",
        filterActive: "bg-amber-600 text-white shadow-amber-200 shadow-lg ring-amber-500",
    },
    DEFAULT: {
        icon: "✨",
        bg: "bg-gradient-to-br from-slate-50 via-white to-slate-100",
        border: "border-slate-200/60",
        badge: "bg-slate-100 text-slate-600 border-slate-200",
        accent: "text-slate-600",
        glow: "hover:shadow-slate-200/40 hover:bg-slate-50",
        btn: "from-slate-600 to-slate-800 shadow-slate-200/50",
        filterActive: "bg-slate-800 text-white shadow-lg shadow-slate-200",
    },
};

function getCategoryStyle(type: string, isPastDay?: boolean): CategoryStyle {
    if (isPastDay) return {
        icon: "⚡",
        bg: "bg-gradient-to-br from-rose-50 to-white",
        border: "border-rose-300",
        badge: "bg-rose-100 text-rose-700 border-rose-200",
        accent: "text-rose-600",
        glow: "hover:shadow-rose-100",
        btn: "from-rose-500 to-orange-500 shadow-rose-100",
        filterActive: "text-rose-600",
    };
    return CATEGORY_STYLES[type] ?? CATEGORY_STYLES.DEFAULT;
}

// --- Helpers ---
function todayIST(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
}

function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric", month: "short", year: "numeric",
    });
}

// --- Recall Views ---
function daysLabel(dueDate: string): { text: string; cls: string; isOverdue: boolean } {
    const today = todayIST();
    const diff = Math.round((new Date(today).getTime() - new Date(dueDate).getTime()) / 86_400_000);
    if (diff === 0) return { text: "Bugün", cls: "text-amber-700 bg-amber-50 border-amber-200", isOverdue: true };
    if (diff > 0) return { text: `${diff} gün gecikmiş`, cls: "text-rose-700 bg-rose-50 border-rose-200", isOverdue: true };
    return { text: `${Math.abs(diff)} gün sonra`, cls: "text-slate-500 bg-slate-50 border-slate-200", isOverdue: false };
}

function buildRecallWaLink(phone: string | null | undefined, patientName: string, treatmentType: string, lastTreatmentDate: string): string {
    if (!phone) return "#";
    const normalized = phone.replace(/\D/g, "").replace(/^0/, "90");
    const months = Math.round((new Date().getTime() - new Date(lastTreatmentDate + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24 * 30));
    const duration = months > 1 ? `${months} ay` : "bir süre";
    const msg = `Merhaba ${patientName}, ${treatmentType} tedavinizin üzerinden ${duration} geçti. Kontrol muayedeniz için randevu almak ister misiniz? 🦷`;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

// --- Main Page Component ---
export default function CommunicationHubPage() {
    const router = useRouter();
    const { slug } = useParams() as { slug: string };
    const [viewMode, setViewMode] = useState<'ASSISTANT' | 'RECALL'>('ASSISTANT');
    const [searchTerm, setSearchTerm] = useState("");

    // Hooks
    const { assistantItems, missedCount, isLoading: assistantLoading } = useSmartAssistant();
    const { data: recallItems = [], isLoading: recallLoading } = useRecallQueue();
    const { mutate: updateRecallStatus } = useUpdateRecallStatus();
    const { mutate: dismissAssistant } = useDismissAssistantItem();
    const { mutate: undoDismissAssistant } = useUndoDismissAssistantItem();

    // Undo States
    const [lastDismissed, setLastDismissed] = useState<AssistantItem | null>(null);
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

    // Quick Appointment Modal State
    const [quickAppt, setQuickAppt] = useState<{
        open: boolean;
        patientId: string;
        patientName: string;
        recallId?: string;
        treatment?: string;
    }>({ open: false, patientId: "", patientName: "" });
    const [assistantFilter, setAssistantFilter] = useState<AssistantItemType | 'ALL'>('ALL');
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    // Recall States
    const [recallTab, setRecallTab] = useState<RecallStatus>("pending");

    const categoryNames: Record<string, string> = {
        'ALL': 'Hepsi',
        'REMINDER': 'Hatırlatma',
        'BIRTHDAY': 'Doğum Günü',
        'DELAY': 'Gecikme',
        'FOLLOWUP': 'Takip',
        'PAYMENT': 'Ödeme',
        'SATISFACTION': 'Memnuniyet',
        'NEW_PATIENT': 'Yeni Hasta',
        'LAB_TRACKING': 'Laboratuvar',
        'INCOMPLETE': 'Yarım Tedavi',
    };

    const statusNames: Record<RecallStatus, string> = {
        'pending': 'Bekleyen',
        'contacted': 'Ulaşıldı',
        'booked': 'Randevu',
        'dismissed': 'Atlanan'
    };

    // Memoized Data
    const filteredAssistantItems = useMemo(() => {
        let list = assistantItems;
        if (assistantFilter !== "ALL") list = list.filter((i: AssistantItem) => i.type === assistantFilter);
        if (searchTerm) list = list.filter((i: AssistantItem) => i.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
        return [...list].sort((a, b) => (b.isPastDay ? 1 : 0) - (a.isPastDay ? 1 : 0));
    }, [assistantItems, assistantFilter, searchTerm]);

    const filteredRecallItems = useMemo(() => {
        let list = recallItems.filter((i: RecallQueueItem) => i.status === recallTab);
        if (searchTerm) list = list.filter((i: RecallQueueItem) => i.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
        return [...list].sort((a, b) => new Date(a.recall_due_at).getTime() - new Date(b.recall_due_at).getTime());
    }, [recallItems, recallTab, searchTerm]);

    // Kategori sayaçları
    const assistantCategoryCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: assistantItems.length };
        assistantItems.forEach(item => {
            counts[item.type] = (counts[item.type] || 0) + 1;
        });
        return counts;
    }, [assistantItems]);

    // Recall istatistikleri
    const recallStats = useMemo(() => {
        const today = todayIST();
        const pending = recallItems.filter(i => i.status === 'pending');
        const overdueCount = pending.filter(i => i.recall_due_at <= today).length;
        const todayCount = pending.filter(i => i.recall_due_at === today).length;
        return {
            pending: pending.length,
            overdue: overdueCount,
            today: todayCount,
            contacted: recallItems.filter(i => i.status === 'contacted').length,
            booked: recallItems.filter(i => i.status === 'booked').length,
            dismissed: recallItems.filter(i => i.status === 'dismissed').length,
        };
    }, [recallItems]);

    const handleDismissAssistant = (id: string, silent = false) => {
        const item = assistantItems.find(i => i.id === id);
        if (item) {
            setLastDismissed(item);
            setShowUndo(true);
            if (undoTimer) clearTimeout(undoTimer);
            const timer = setTimeout(() => setShowUndo(false), 10000); // 10 seconds undo window
            setUndoTimer(timer);
        }

        dismissAssistant(id);
        if (!silent) toast.success("Bildirim kaldırıldı");
    };

    const handleUndoDismiss = () => {
        if (lastDismissed) {
            undoDismissAssistant(lastDismissed.id);
            setShowUndo(false);
            setLastDismissed(null);
            if (undoTimer) clearTimeout(undoTimer);
            toast.success("Bildirim geri getirildi", { icon: "🔄" });
        }
    };

    const handleSendWhatsApp = (id: string, phone: string, message: string) => {
        if (!phone) return toast.error("Telefon numarası bulunamadı");
        window.open(`https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`, "_blank");
        // WhatsApp açıldığında kartı otomatik kaldır (One-click Send & Dismiss)
        handleDismissAssistant(id, true);
    };

    const handleQuickAppointmentSuccess = (appointmentId: string) => {
        if (quickAppt.recallId) {
            updateRecallStatus({ id: quickAppt.recallId, status: "booked" });
            toast.success("Recall durumu güncellendi: Randevu Alındı");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Elegant Mode Switcher & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="bg-white p-1.5 rounded-[2rem] shadow-xl border border-slate-100 flex items-center relative overflow-hidden group">
                    <div
                        className={`absolute inset-y-1.5 rounded-[1.75rem] bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500 ease-out shadow-lg ${viewMode === 'ASSISTANT' ? 'left-1.5 w-[160px]' : 'left-[168px] w-[160px]'
                            }`}
                    />
                    <button
                        onClick={() => setViewMode('ASSISTANT')}
                        className={`relative z-10 w-[160px] py-3 text-xs font-black tracking-widest uppercase transition-colors duration-300 ${viewMode === 'ASSISTANT' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Akıllı Asistan
                    </button>
                    <button
                        onClick={() => setViewMode('RECALL')}
                        className={`relative z-10 w-[160px] py-3 text-xs font-black tracking-widest uppercase transition-colors duration-300 ${viewMode === 'RECALL' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Recall Listesi
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="İsimle hasta ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Undo Toast / Banner */}
            {showUndo && lastDismissed && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-300">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md bg-opacity-90">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Geri Al</span>
                            <span className="text-xs font-bold">{lastDismissed.patientName} bildirimi kaldırıldı</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <button 
                            onClick={handleUndoDismiss}
                            className="bg-white text-slate-900 px-5 py-2 rounded-xl text-xs font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                        >
                            GERİ AL
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {viewMode === 'ASSISTANT' ? (
                <div className="space-y-6">
                    {/* Kaçırılmış bildirim uyarı banner */}
                    {missedCount > 0 && (
                        <div className="flex items-center gap-3 bg-rose-50 border border-border-rose-200 rounded-2xl px-5 py-3.5 mb-4">
                            <span className="text-rose-500 text-lg">⚠️</span>
                            <p className="text-xs font-bold text-rose-700">
                                <span className="font-black">{missedCount} bildirim</span> önceki günlerden kalmış.
                            </p>
                        </div>
                    )}

                    {/* Missing Data Summary Banner */}
                    {assistantItems.filter(i => !i.patientPhone).length > 0 && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 mb-4">
                            <span className="text-amber-500 text-lg">ℹ️</span>
                            <p className="text-xs font-bold text-amber-700">
                                <span className="font-black">{assistantItems.filter(i => !i.patientPhone).length} hastanın</span> telefon bilgisi eksik olduğu için WhatsApp ile ulaşılamıyor.
                            </p>
                            <button 
                                onClick={() => setAssistantFilter('INCOMPLETE')}
                                className="ml-auto text-[10px] font-black underline underline-offset-4 text-amber-600 hover:text-amber-800"
                            >
                                HEPSİNİ GÖSTER
                            </button>
                        </div>
                    )}

                    {/* Assistant Stats & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 text-xl font-bold">✨</div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Akıllı Bildirimler</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                    {filteredAssistantItems.length} kayıt
                                    {missedCount > 0 && <span className="ml-2 text-rose-500">· {missedCount} kaçırıldı</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            {(['ALL', 'REMINDER', 'BIRTHDAY', 'DELAY', 'FOLLOWUP', 'PAYMENT', 'SATISFACTION', 'NEW_PATIENT', 'LAB_TRACKING', 'INCOMPLETE'] as const).map((f) => {
                                const cs = f === 'ALL' ? CATEGORY_STYLES.DEFAULT : (CATEGORY_STYLES[f] ?? CATEGORY_STYLES.DEFAULT);
                                const isActive = assistantFilter === f;
                                const count = assistantCategoryCounts[f] || 0;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setAssistantFilter(f as AssistantItemType | "ALL")}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all duration-300 flex items-center gap-2 group/btn ${
                                            isActive
                                                ? `${cs.filterActive} scale-105`
                                                : `${cs.accent} bg-white/60 hover:bg-white border-transparent hover:border-slate-200 border`
                                        }`}
                                    >
                                        {f !== 'ALL' && <span>{cs.icon}</span>}
                                        {categoryNames[f]}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assistant List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assistantLoading ? (
                            <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Veriler yükleniyor...</div>
                        ) : filteredAssistantItems.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">Bekleyen bildirim bulunamadı.</div>
                        ) : (
                            filteredAssistantItems.map((item) => {
                                const cs = getCategoryStyle(item.type, item.isPastDay);
                                return (
                                    <div key={item.id} className={`group p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border ${cs.bg} ${cs.border} ${cs.glow}`}>
                                        {/* Kategori satırı */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cs.badge}`}>
                                                    {cs.icon} {categoryNames[item.type] || item.type}
                                                </span>
                                                {item.isPastDay && (
                                                    <span className="px-2.5 py-1 bg-rose-100 rounded-full text-[9px] font-black text-rose-600 uppercase tracking-widest border border-rose-300">
                                                        Kaçırıldı
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDismissAssistant(item.id)}
                                                className="h-8 w-8 rounded-full bg-white/70 flex items-center justify-center text-slate-400 hover:bg-white hover:text-emerald-500 transition-colors shrink-0 shadow-sm"
                                            >✓</button>
                                        </div>

                                        {/* İsim + başlık */}
                                        <Link 
                                            href={`/${slug}/patients?q=${encodeURIComponent(item.patientName)}`}
                                            className="block group/name"
                                        >
                                            <h3 className="font-black text-slate-800 text-base mb-1 group-hover/name:text-indigo-600 transition-colors flex items-center gap-2">
                                                {item.patientName}
                                                <svg className="w-3 h-3 opacity-0 group-hover/name:opacity-100 transition-all translate-x-[-4px] group-hover/name:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                </svg>
                                            </h3>
                                        </Link>
                                        <p className={`text-[11px] font-bold uppercase tracking-tighter mb-3 ${cs.accent}`}>{item.title}</p>

                                        {/* Kaçırıldı tarihi */}
                                        {item.isPastDay && item.pastDate && (
                                            <p className="text-[10px] text-rose-500 font-bold mb-2">
                                                📅 {new Date(item.pastDate + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinden kalmış
                                            </p>
                                        )}

                                        {/* Mesaj kutusu */}
                                        <div className={`p-4 rounded-2xl mb-5 italic text-[11px] leading-relaxed border-l-4 bg-white/60 text-slate-600 ${cs.border}`}>
                                            {item.message}
                                        </div>

                                        {/* Saat etiketi */}
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${cs.accent} opacity-70`}>{item.timeLabel}</p>

                                        {/* Buton */}
                                        {item.patientPhone ? (
                                            <button
                                                onClick={() => handleSendWhatsApp(item.id, item.patientPhone || "", item.message)}
                                                className={`w-full text-white font-black py-3 rounded-2xl text-xs shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 bg-gradient-to-r ${cs.btn}`}
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.541 5.875L.057 23.543a.5.5 0 0 0 .6.6l5.668-1.484A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.518-5.188-1.424l-.372-.22-3.862 1.012 1.012-3.705-.242-.385A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                                Gönder ve Kaldır
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 border border-dashed border-slate-200">
                                                    <span>⚠️</span> Telefon Bilgisi Eksik
                                                </div>
                                                <button 
                                                    onClick={() => router.push(`/${slug}/patients?q=${encodeURIComponent(item.patientName)}`)}
                                                    className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-[10px] hover:bg-slate-50 transition-colors uppercase tracking-tight"
                                                >
                                                    Hasta Kartını Düzenle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Gecikmiş recall uyarı banner */}
                    {!recallLoading && recallStats.overdue > 0 && (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3.5">
                            <span className="text-rose-500 text-lg">⚠️</span>
                            <p className="text-xs font-bold text-rose-700">
                                <span className="font-black">{recallStats.overdue} hasta</span> için recall zamanı geçti ve henüz aranmadı.
                                {recallStats.today > 0 && <span className="ml-2 text-amber-700 font-black">· Bugün {recallStats.today} yeni recall çıktı.</span>}
                            </p>
                        </div>
                    )}

                    {/* Recall Stats & Tabs */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold">📅</div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Recall Takip Listesi</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                    {recallStats.pending} bekleyen
                                    {recallStats.overdue > 0 && <span className="ml-2 text-rose-500 font-black">· {recallStats.overdue} gecikmiş</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            {(['pending', 'contacted', 'booked', 'dismissed'] as RecallStatus[]).map((t) => {
                                const count = recallStats[t as keyof typeof recallStats] as number;
                                const isOverduePending = t === 'pending' && recallStats.overdue > 0;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setRecallTab(t)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${recallTab === t ? "bg-white text-amber-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                                            }`}
                                    >
                                        {statusNames[t]}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isOverduePending ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recall Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recallLoading ? (
                            <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Veriler yükleniyor...</div>
                        ) : filteredRecallItems.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">Kayıt bulunamadı.</div>
                        ) : (
                            filteredRecallItems.map((item) => {
                                const label = daysLabel(item.recall_due_at);
                                const waLink = buildRecallWaLink(item.patients?.phone, item.patients?.full_name ?? "Hasta", item.treatment_type, item.last_treatment_date);
                                return (
                                    <div key={item.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-300 ${label.isOverdue && item.status === 'pending' ? "border-2 border-rose-200" : "border border-slate-100"}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${label.cls}`}>{label.text}</span>
                                            <span className="text-[10px] font-bold text-slate-400 font-mono italic">#{item.id.slice(0, 4)}</span>
                                        </div>
                                        <Link 
                                            href={`/${slug}/patients?q=${encodeURIComponent(item.patients?.full_name || "")}`}
                                            className="block group/name"
                                        >
                                            <h3 className="font-black text-slate-800 text-base mb-1 group-hover/name:text-indigo-600 transition-colors flex items-center gap-2">
                                                {item.patients?.full_name}
                                                <svg className="w-3 h-3 opacity-0 group-hover/name:opacity-100 transition-all translate-x-[-4px] group-hover/name:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                </svg>
                                            </h3>
                                        </Link>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">{item.treatment_type}</p>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                                <span>Son Tedavi:</span>
                                                <span className="text-slate-800">{formatDate(item.last_treatment_date)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                                <span>Recall Tarihi:</span>
                                                <span className={label.isOverdue ? "text-rose-600 font-bold" : "text-slate-800"}>{formatDate(item.recall_due_at)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                                <span>Ulaşılma:</span>
                                                <span className="text-blue-600 bg-blue-50 px-2 rounded-lg">{item.contact_attempts} kez</span>
                                            </div>
                                            {item.notes && (
                                                <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl italic text-[10px] text-amber-700 leading-relaxed">
                                                    <span className="font-black not-italic mr-1">📝 SON NOT:</span> {item.notes}
                                                </div>
                                            )}
                                        </div>

                                        {item.status === 'pending' ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={waLink}
                                                    target="_blank"
                                                    className="bg-emerald-500 text-white font-black py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-600"
                                                >WHATSAPP</a>
                                                <button
                                                    onClick={() => {
                                                        const note = window.prompt(`${item.patients?.full_name} için arama notu:`, item.notes || "");
                                                        if (note !== null) updateRecallStatus({ id: item.id, status: 'contacted', notes: note });
                                                        else updateRecallStatus({ id: item.id, status: 'contacted' });
                                                    }}
                                                    className="bg-blue-50 text-blue-700 font-black py-2.5 rounded-xl text-[10px] hover:bg-blue-100 transition-colors"
                                                >ULAŞILDI</button>
                                                <button
                                                    onClick={() => {
                                                        const note = window.prompt(`${item.patients?.full_name} için atlama nedeni/notu:`, item.notes || "");
                                                        if (note !== null) updateRecallStatus({ id: item.id, status: 'dismissed', notes: note });
                                                        else updateRecallStatus({ id: item.id, status: 'dismissed' });
                                                    }}
                                                    className="bg-slate-50 text-slate-500 font-black py-2.5 rounded-xl text-[10px] hover:bg-slate-100 transition-colors"
                                                >ATLA</button>
                                                <button
                                                    onClick={() => setQuickAppt({
                                                        open: true,
                                                        patientId: item.patient_id,
                                                        patientName: item.patients?.full_name || "Hasta",
                                                        recallId: item.id,
                                                        treatment: item.treatment_type || ""
                                                    })}
                                                    className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-2.5 rounded-xl text-[10px] shadow-lg shadow-teal-50"
                                                >📅 RANDEVU</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {item.status !== 'booked' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <a
                                                            href={waLink}
                                                            target="_blank"
                                                            className="bg-emerald-500 text-white font-black py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-600"
                                                        >WHATSAPP</a>
                                                        <button
                                                            onClick={() => setQuickAppt({
                                                                open: true,
                                                                patientId: item.patient_id,
                                                                patientName: item.patients?.full_name || "Hasta",
                                                                recallId: item.id,
                                                                treatment: item.treatment_type || ""
                                                            })}
                                                            className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-2.5 rounded-xl text-[10px] shadow-lg shadow-teal-50"
                                                        >📅 RANDEVU</button>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => updateRecallStatus({ id: item.id, status: 'pending' })}
                                                    className="w-full bg-amber-50 text-amber-700 border border-amber-200 font-black py-2.5 rounded-xl text-[10px] hover:bg-amber-100 transition-colors"
                                                >↩ BEKLEYENLERe GERi AL</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {quickAppt.open && (
                <QuickAppointmentModal
                    isOpen={quickAppt.open}
                    onClose={() => setQuickAppt(p => ({ ...p, open: false }))}
                    patientId={quickAppt.patientId}
                    patientName={quickAppt.patientName}
                    initialTreatment={quickAppt.treatment}
                    onSuccess={handleQuickAppointmentSuccess}
                />
            )}
        </div>
    );
}
