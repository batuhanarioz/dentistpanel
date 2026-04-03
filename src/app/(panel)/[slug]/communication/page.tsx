"use client";

import { useState, useMemo } from "react";
import { useSmartAssistant, AssistantItem, AssistantItemType, useDismissAssistantItem, useUndoDismissAssistantItem } from "@/hooks/useSmartAssistant";
import { useRecallQueue, useUpdateRecallStatus } from "@/hooks/useRecallQueue";
import { QuickAppointmentModal } from "@/app/components/appointments/QuickAppointmentModal";
import { CheckinQueueView } from "@/app/components/communication/CheckinQueueView";
import type { RecallQueueItem, RecallStatus } from "@/types/database";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";
import { useParams } from "next/navigation";
import { usePatients, PatientRow } from "@/hooks/usePatients";
import { PatientDetailModal } from "@/app/components/patients/PatientDetailModal";
import { useClinic } from "@/app/context/ClinicContext";

// --- Kategori renk & ikon tanımları ---
type CategoryStyle = {
    icon: string;
    bg: string;
    border: string;
    badge: string;
    accent: string;
    glow: string;
    btn: string;
    filterActive: string;
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
    PAYMENT: { icon: "💳", bg: "bg-rose-50/50", border: "border-rose-200/60 group-hover:border-rose-300/50", badge: "bg-rose-100/80 text-rose-700 border-rose-200/50", accent: "text-rose-600", filterActive: "bg-rose-600 text-white shadow-rose-200 shadow-lg ring-rose-500", glow: "hover:shadow-rose-100/40 hover:bg-rose-50/70", btn: "from-rose-500 to-red-600 shadow-rose-200/50 hover:shadow-rose-300/60" },
    DELAY: { icon: "⏰", bg: "bg-orange-50/50", border: "border-orange-200/60 group-hover:border-orange-300/50", badge: "bg-orange-100/80 text-orange-700 border-orange-200/50", accent: "text-orange-600", filterActive: "bg-orange-600 text-white shadow-orange-200 shadow-lg ring-orange-500", glow: "hover:shadow-orange-100/40 hover:bg-orange-50/70", btn: "from-orange-500 to-amber-600 shadow-orange-200/50 hover:shadow-orange-300/60" },
    INCOMPLETE: { icon: "⚠️", bg: "bg-amber-50/50", border: "border-amber-200/60 group-hover:border-amber-300/50", badge: "bg-amber-100/80 text-amber-700 border-amber-200/50", accent: "text-amber-600", filterActive: "bg-amber-600 text-white shadow-amber-200 shadow-lg ring-amber-500", glow: "hover:shadow-amber-100/40 hover:bg-amber-50/70", btn: "from-amber-500 to-amber-600 shadow-amber-200/50 hover:shadow-amber-300/60" },
    SATISFACTION: { icon: "⭐", bg: "bg-yellow-50/50", border: "border-yellow-200/60 group-hover:border-yellow-300/50", badge: "bg-yellow-100/80 text-yellow-700 border-yellow-200/50", accent: "text-yellow-600", filterActive: "bg-yellow-500 text-white shadow-yellow-200 shadow-lg ring-yellow-400", glow: "hover:shadow-yellow-100/40 hover:bg-yellow-50/70", btn: "from-yellow-400 to-orange-400 shadow-yellow-200/50 hover:shadow-yellow-300/60" },
    BIRTHDAY: { icon: "🎂", bg: "bg-fuchsia-50/50", border: "border-fuchsia-200/60 group-hover:border-fuchsia-300/50", badge: "bg-fuchsia-100/80 text-fuchsia-700 border-fuchsia-200/50", accent: "text-fuchsia-600", filterActive: "bg-fuchsia-600 text-white shadow-fuchsia-200 shadow-lg ring-fuchsia-500", glow: "hover:shadow-fuchsia-100/40 hover:bg-fuchsia-50/70", btn: "from-fuchsia-500 to-pink-600 shadow-fuchsia-200/50 hover:shadow-fuchsia-300/60" },
    NEW_PATIENT: { icon: "🌟", bg: "bg-emerald-50/50", border: "border-emerald-200/60 group-hover:border-emerald-300/50", badge: "bg-emerald-100/80 text-emerald-700 border-emerald-200/50", accent: "text-emerald-600", filterActive: "bg-emerald-600 text-white shadow-emerald-200 shadow-lg ring-emerald-500", glow: "hover:shadow-emerald-100/40 hover:bg-emerald-50/70", btn: "from-emerald-500 to-green-600 shadow-emerald-200/50 hover:shadow-emerald-300/60" },
    REMINDER: { icon: "🔔", bg: "bg-blue-50/50", border: "border-blue-200/60 group-hover:border-blue-300/50", badge: "bg-blue-100/80 text-blue-700 border-blue-200/50", accent: "text-blue-600", filterActive: "bg-blue-600 text-white shadow-blue-200 shadow-lg ring-blue-500", glow: "hover:shadow-blue-100/40 hover:bg-blue-50/70", btn: "from-blue-500 to-cyan-600 shadow-blue-200/50 hover:shadow-blue-300/60" },
    FOLLOWUP: { icon: "🩺", bg: "bg-teal-50/50", border: "border-teal-200/60 group-hover:border-teal-300/50", badge: "bg-teal-100/80 text-teal-700 border-teal-200/50", accent: "text-teal-600", filterActive: "bg-teal-600 text-white shadow-teal-200 shadow-lg ring-teal-500", glow: "hover:shadow-teal-100/40 hover:bg-teal-50/70", btn: "from-teal-500 to-emerald-600 shadow-teal-200/50 hover:shadow-teal-300/60" },
    LAB_TRACKING: { icon: "🧪", bg: "bg-indigo-50/50", border: "border-indigo-200/60 group-hover:border-indigo-300/50", badge: "bg-indigo-100/80 text-indigo-700 border-indigo-200/50", accent: "text-indigo-600", filterActive: "bg-indigo-600 text-white shadow-indigo-200 shadow-lg ring-indigo-500", glow: "hover:shadow-indigo-100/40 hover:bg-indigo-50/70", btn: "from-indigo-500 to-violet-600 shadow-indigo-200/50 hover:shadow-indigo-300/60" },
    DEFAULT: { icon: "✨", bg: "bg-slate-50", border: "border-slate-200/60", badge: "bg-slate-100 text-slate-600 border-slate-200", accent: "text-slate-600", filterActive: "bg-slate-800 text-white shadow-lg shadow-slate-200", glow: "hover:shadow-slate-100/40 hover:bg-slate-50", btn: "from-slate-600 to-slate-800 shadow-slate-200/50" },
};

function getCategoryStyle(type: string, isPastDay?: boolean): CategoryStyle {
    return CATEGORY_STYLES[type] ?? CATEGORY_STYLES.DEFAULT;
}

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

export default function CommunicationHubPage() {
    const { slug } = useParams() as { slug: string };
    const clinic = useClinic();
    const brandFrom = clinic.themeColorFrom || '#0d9488';
    const brandTo = clinic.themeColorTo || '#10b981';

    const [viewMode, setViewMode] = useState<'ASSISTANT' | 'RECALL' | 'CHECKIN'>('ASSISTANT');
    const [searchTerm, setSearchTerm] = useState("");
    const [openRecallStatusId, setOpenRecallStatusId] = useState<string | null>(null);

    const { assistantItems, dismissedAssistantItems, missedCount, isLoading: assistantLoading } = useSmartAssistant();
    const { data: recallItems = [], isLoading: recallLoading } = useRecallQueue();
    const { mutate: updateRecallStatus } = useUpdateRecallStatus();
    const { mutate: dismissAssistant } = useDismissAssistantItem();
    const { mutate: undoDismissAssistant } = useUndoDismissAssistantItem();

    const [showDismissed, setShowDismissed] = useState(false);

    const {
        selectedPatient,
        appointments,
        payments,
        detailOpen,
        setDetailOpen,
        handleSelectPatient,
        deletePatient,
        updatePatient
    } = usePatients();

    const [lastDismissed, setLastDismissed] = useState<AssistantItem | null>(null);
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

    const [quickAppt, setQuickAppt] = useState<{
        open: boolean;
        patientId: string;
        patientName: string;
        recallId?: string;
        treatment?: string;
    }>({ open: false, patientId: "", patientName: "" });

    const [assistantFilter, setAssistantFilter] = useState<AssistantItemType | 'ALL'>('ALL');
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

    const filteredAssistantItems = useMemo(() => {
        let list = showDismissed ? dismissedAssistantItems : assistantItems;
        if (assistantFilter !== "ALL") {
            list = list.filter((i: AssistantItem) => i.type === assistantFilter);
        }
        if (searchTerm) list = list.filter((i: AssistantItem) => i.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
        return [...list].sort((a, b) => (b.isPastDay ? 1 : 0) - (a.isPastDay ? 1 : 0));
    }, [assistantItems, dismissedAssistantItems, showDismissed, assistantFilter, searchTerm]);

    const filteredRecallItems = useMemo(() => {
        let list = recallItems.filter((i: RecallQueueItem) => i.status === recallTab);
        if (searchTerm) list = list.filter((i: RecallQueueItem) => i.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
        return [...list].sort((a, b) => new Date(a.recall_due_at).getTime() - new Date(b.recall_due_at).getTime());
    }, [recallItems, recallTab, searchTerm]);

    const assistantCategoryCounts = useMemo(() => {
        const sourceList = showDismissed ? dismissedAssistantItems : assistantItems;
        const counts: Record<string, number> = {
            ALL: sourceList.length,
            REMINDER: 0, BIRTHDAY: 0, DELAY: 0, FOLLOWUP: 0, PAYMENT: 0, SATISFACTION: 0, NEW_PATIENT: 0, LAB_TRACKING: 0, INCOMPLETE: 0
        };

        counts.INCOMPLETE = sourceList.filter(i => !i.patientPhone).length;

        sourceList.forEach(item => {
            counts[item.type] = (counts[item.type] || 0) + 1;
        });
        return counts;
    }, [assistantItems, dismissedAssistantItems, showDismissed]);

    const recallStats = useMemo(() => {
        const today = todayIST();
        const pending = recallItems.filter(i => i.status === 'pending');
        return {
            pending: pending.length,
            overdue: pending.filter(i => i.recall_due_at <= today).length,
            today: pending.filter(i => i.recall_due_at === today).length,
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
            const timer = setTimeout(() => setShowUndo(false), 4000); // 4 saniyeye düşürüldü
            setUndoTimer(timer);
        }
        dismissAssistant(id);
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
        handleDismissAssistant(id, true);
    };

    const handleQuickAppointmentSuccess = () => {
        if (quickAppt.recallId) {
            updateRecallStatus({ id: quickAppt.recallId, status: "booked" });
            toast.success("Recall durumu güncellendi: Randevu Alındı");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Elegant Mode Switcher & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div className="bg-white p-1 rounded-full shadow-lg border border-slate-100 flex items-center relative overflow-hidden w-full md:w-auto">
                    <div
                        className={`absolute inset-y-1 rounded-full transition-all duration-500 ease-out shadow-lg ${viewMode === 'ASSISTANT' ? 'left-1 w-[32%]' :
                            viewMode === 'RECALL' ? 'left-[34%] w-[32%]' :
                                'left-[67%] w-[32%]'
                            } md:w-[120px] ${viewMode === 'ASSISTANT' ? 'md:left-1' :
                                viewMode === 'RECALL' ? 'md:left-[125px]' :
                                    'md:left-[249px]'
                            }`}
                        style={{ background: `linear-gradient(to right, ${brandFrom}, ${brandTo})` }}
                    />
                    <button onClick={() => setViewMode('ASSISTANT')} className={`relative z-10 flex-1 md:w-[120px] py-2.5 text-[10px] md:text-xs font-black tracking-widest uppercase transition-colors duration-300 ${viewMode === 'ASSISTANT' ? 'text-white' : 'text-slate-400'}`}>Asistan</button>
                    <button onClick={() => setViewMode('RECALL')} className={`relative z-10 flex-1 md:w-[120px] py-2.5 text-[10px] md:text-xs font-black tracking-widest uppercase transition-colors duration-300 ${viewMode === 'RECALL' ? 'text-white' : 'text-slate-400'}`}>Recall</button>
                    <button onClick={() => setViewMode('CHECKIN')} className={`relative z-10 flex-1 md:w-[120px] py-2.5 text-[10px] md:text-xs font-black tracking-widest uppercase transition-colors duration-300 ${viewMode === 'CHECKIN' ? 'text-white' : 'text-slate-400'}`}>QR Giriş</button>
                </div>

                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="İsimle hasta ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 shadow-sm transition-all outline-none"
                        style={{ borderColor: searchTerm ? brandFrom : undefined }}
                    />
                </div>
            </div>

            {/* Undo Banner - Top Centered for better visibility */}
            {showUndo && lastDismissed && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500 w-[95%] max-w-md">
                    <div className="bg-slate-900 text-white px-5 py-3.5 rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 border border-white/10 backdrop-blur-md bg-opacity-90 ring-4 ring-black/5">
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Geri Al</span>
                            <span className="text-xs font-bold truncate">{lastDismissed.patientName} bildirimi kaldırıldı</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={handleUndoDismiss} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] uppercase font-black hover:bg-rose-500 hover:text-white transition-all shrink-0">Geri Al</button>
                            <button onClick={() => setShowUndo(false)} className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Kapat">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {viewMode === 'ASSISTANT' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Banners */}
                    {missedCount > 0 && (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3.5">
                            <span className="text-rose-500 text-lg">⚠️</span>
                            <p className="text-xs font-bold text-rose-700"><span className="font-black">{missedCount} bildirim</span> önceki günlerden kalmış.</p>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-col gap-5 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div
                                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                                    style={{ background: `${brandFrom}15`, color: brandFrom }}
                                >✨</div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Akıllı Bildirimler</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{filteredAssistantItems.length} kayıt</p>
                                </div>
                            </div>

                            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                                <button
                                    onClick={() => setShowDismissed(false)}
                                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${!showDismissed ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Bekleyenler
                                </button>
                                <button
                                    onClick={() => setShowDismissed(true)}
                                    className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${showDismissed ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                    style={showDismissed ? { background: brandFrom } : {}}
                                >
                                    Gönderilenler
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${showDismissed ? 'bg-white/20' : 'bg-slate-300/50 text-slate-500'}`}>{dismissedAssistantItems.length}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-nowrap md:flex-wrap overflow-x-auto scrollbar-hide gap-2 bg-slate-50 p-2 md:p-1.5 rounded-2xl mx-[-1rem] px-[1rem] md:mx-0 md:px-1.5">
                            {(['ALL', 'REMINDER', 'BIRTHDAY', 'DELAY', 'FOLLOWUP', 'PAYMENT', 'SATISFACTION', 'NEW_PATIENT', 'LAB_TRACKING', 'INCOMPLETE'] as const).map((f) => {
                                const cs = f === 'ALL' ? CATEGORY_STYLES.DEFAULT : CATEGORY_STYLES[f];
                                const isActive = assistantFilter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setAssistantFilter(f)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all duration-300 flex items-center gap-2 shrink-0 ${isActive ? `${cs.filterActive} scale-105` : `${cs.accent} bg-white/60 hover:bg-white border`
                                            }`}
                                    >
                                        {f !== 'ALL' && <span>{cs.icon}</span>}
                                        {categoryNames[f]}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? "bg-white/20" : "bg-slate-100"}`}>{assistantCategoryCounts[f]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assistantLoading ? (
                            <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Veriler yükleniyor...</div>
                        ) : filteredAssistantItems.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">Bildirim bulunamadı.</div>
                        ) : (
                            filteredAssistantItems.map((item) => {
                                const cs = getCategoryStyle(item.type, item.isPastDay);
                                return (
                                    <div
                                        key={item.id}
                                        className={`group p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border ${cs.bg} ${cs.border}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${cs.badge}`}>{cs.icon} {categoryNames[item.type]}</span>
                                            {!showDismissed ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDismissAssistant(item.id);
                                                    }}
                                                    className="h-8 w-8 rounded-full bg-white/70 flex items-center justify-center text-slate-400 hover:text-emerald-500 shrink-0 shadow-sm transition-colors"
                                                    title="Tamamlandı İşaretle"
                                                >✓</button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        undoDismissAssistant(item.id);
                                                        toast.success("Bildirim bekleyenlere alındı", { icon: "🔄" });
                                                    }}
                                                    className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 shrink-0 transition-colors"
                                                    title="Geri Al (Bekleyenlere Taşı)"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="font-black text-slate-800 text-base">{item.patientName}</h3>
                                            <button
                                                onClick={() => handleSelectPatient({ id: item.patientId } as PatientRow)}
                                                className="group/detail h-9 px-3 rounded-xl bg-white/90 border border-teal-100 flex items-center gap-2 text-teal-600 hover:bg-teal-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                title="Tam Hasta Profilini Gör"
                                            >
                                                <svg className="w-4 h-4 group-hover/detail:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2V13H7v-1c0-1.333 2.667-2 4-2z" />
                                                </svg>
                                                <span className="text-[10px] font-black uppercase tracking-tighter">Profil</span>
                                            </button>
                                        </div>
                                        <p className={`text-[11px] font-bold uppercase mb-3 ${cs.accent}`}>{item.title}</p>
                                        <div className="flex-1 p-4 rounded-2xl mb-5 italic text-[11px] border-l-4 bg-white/60 text-slate-600 shrink-0">
                                            {item.message}
                                        </div>
                                        <div className="mt-auto border-t border-slate-50 pt-4 space-y-3">
                                            <div className="flex items-center gap-1.5 px-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.isPastDay ? 'bg-rose-500 animate-pulse' : cs.bg.split(' ')[1]?.replace('from-', 'bg-') || 'bg-slate-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${item.isPastDay ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    {item.timeLabel}
                                                </span>
                                            </div>
                                            {item.patientPhone ? (
                                                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleSendWhatsApp(item.id, item.patientPhone || "", item.message)}
                                                        className={`w-full text-white font-black py-3 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                                        WhatsApp
                                                    </button>
                                                    <a
                                                        href={`tel:${item.patientPhone}`}
                                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h9" />
                                                        </svg>
                                                        ARA
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="w-full bg-white border border-slate-200 text-slate-400 font-bold py-3 rounded-2xl text-[10px] uppercase text-center">Telefon Kaydı Yok</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'RECALL' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div
                                className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                                style={{ background: `${brandFrom}15`, color: brandFrom }}
                            >📅</div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Recall Listesi</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{recallStats.pending} bekleyen</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            {(['pending', 'contacted', 'booked', 'dismissed'] as RecallStatus[]).map((t) => (
                                <button
                                    key={t} onClick={() => setRecallTab(t)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${recallTab === t ? "bg-white shadow-md" : "text-slate-400"}`}
                                    style={recallTab === t ? { color: brandFrom } : {}}
                                >
                                    {statusNames[t]} <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[9px]" style={recallTab === t ? { background: `${brandFrom}15` } : {}}>{recallStats[t as keyof typeof recallStats] as number}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recallLoading ? (
                            <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Veriler yükleniyor...</div>
                        ) : filteredRecallItems.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">Kayıt yok.</div>
                        ) : (
                            filteredRecallItems.map((item) => {
                                const label = daysLabel(item.recall_due_at);
                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                                    >
                                        <div className="flex justify-between mb-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${label.cls}`}>{label.text}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="font-black text-slate-800 text-base">{item.patients?.full_name}</h3>
                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleSelectPatient({ id: item.patient_id } as PatientRow)}
                                                    className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all shadow-sm"
                                                    title="Hasta Profili"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                                    </svg>
                                                </button>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenRecallStatusId(openRecallStatusId === item.id ? null : item.id)}
                                                        className={`h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center transition-all shadow-sm ${openRecallStatusId === item.id ? 'text-white bg-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                                                    </button>
                                                    {openRecallStatusId === item.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenRecallStatusId(null)} />
                                                            <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 overflow-hidden animate-in zoom-in-95 duration-100">
                                                                {(['pending', 'contacted', 'booked', 'dismissed'] as RecallStatus[]).map(st => (
                                                                    <button
                                                                        key={st}
                                                                        onClick={() => {
                                                                            updateRecallStatus({ id: item.id, status: st });
                                                                            setOpenRecallStatusId(null);
                                                                            toast.success(`Durum güncellendi: ${statusNames[st]}`);
                                                                        }}
                                                                        className={`w-full px-4 py-2.5 text-[10px] font-black text-left uppercase tracking-tighter hover:bg-slate-50 transition-colors flex items-center justify-between ${item.status === st ? 'text-teal-600 bg-teal-50/50' : 'text-slate-600'}`}
                                                                    >
                                                                        {statusNames[st]}
                                                                        {item.status === st && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">{item.treatment_type}</p>
                                        <div className="space-y-2 mb-6 text-[11px]">
                                            <div className="flex justify-between"><span>Recall:</span> <span className="font-bold">{formatDate(item.recall_due_at)}</span></div>
                                            <div className="flex justify-between"><span>Ulaşılma:</span> <span className="text-blue-600 font-bold">{item.contact_attempts} kez</span></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                            <a
                                                href={buildRecallWaLink(item.patients?.phone, item.patients?.full_name || "Hasta", item.treatment_type, item.last_treatment_date)}
                                                target="_blank"
                                                className="bg-emerald-500 text-white font-black py-2.5 rounded-xl text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                                WhatsApp
                                            </a>
                                            <a
                                                href={`tel:${item.patients?.phone}`}
                                                className="bg-blue-500 text-white font-black py-2.5 rounded-xl text-[10px] text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h9" />
                                                </svg>
                                                ARA
                                            </a>
                                            <button
                                                onClick={() => setQuickAppt({ open: true, patientId: item.patient_id, patientName: item.patients?.full_name || "Hasta", recallId: item.id, treatment: item.treatment_type || "" })}
                                                className="col-span-2 bg-teal-500 text-white font-black py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0V7.5" /></svg>
                                                RANDEVU OLUŞTUR
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'CHECKIN' && (
                <div className="animate-in fade-in duration-500">
                    <CheckinQueueView />
                </div>
            )}

            {quickAppt.open && (
                <QuickAppointmentModal
                    isOpen={quickAppt.open}
                    onClose={() => setQuickAppt({ open: false, patientId: "", patientName: "" })}
                    patientId={quickAppt.patientId}
                    patientName={quickAppt.patientName}
                    initialTreatment={quickAppt.treatment}
                    onSuccess={handleQuickAppointmentSuccess}
                />
            )}

            <PatientDetailModal
                isOpen={detailOpen}
                onClose={() => setDetailOpen(false)}
                patient={selectedPatient}
                appointments={appointments}
                payments={payments}
                onDelete={deletePatient}
                onUpdate={updatePatient}
            />
        </div>
    );
}
