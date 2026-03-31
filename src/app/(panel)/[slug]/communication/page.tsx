"use client";

import { useState, useMemo } from "react";
import { useSmartAssistant, AssistantItem, AssistantItemType } from "@/hooks/useSmartAssistant";
import { useRecallQueue, useUpdateRecallStatus } from "@/hooks/useRecallQueue";
import type { RecallQueueItem, RecallStatus } from "@/types/database";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";

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
    const [viewMode, setViewMode] = useState<'ASSISTANT' | 'RECALL'>('ASSISTANT');
    const [searchTerm, setSearchTerm] = useState("");
    
    // Hooks
    const { assistantItems, isLoading: assistantLoading } = useSmartAssistant();
    const { data: recallItems = [], isLoading: recallLoading } = useRecallQueue();
    const { mutate: updateRecallStatus } = useUpdateRecallStatus();

    // Assistant States
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
        'PAYMENT': 'Ödeme'
    };

    const statusNames: Record<RecallStatus, string> = {
        'pending': 'Bekleyen',
        'contacted': 'Ulaşıldı',
        'booked': 'Randevu',
        'dismissed': 'Atlanan'
    };

    // Memoized Data
    const filteredAssistantItems = useMemo(() => {
        let list = assistantItems.filter(item => !dismissedIds.includes(item.id));
        if (assistantFilter !== 'ALL') list = list.filter(i => i.type === assistantFilter);
        if (searchTerm) {
            list = list.filter(i => i.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list;
    }, [assistantItems, assistantFilter, dismissedIds, searchTerm]);

    const filteredRecallItems = useMemo(() => {
        let list = recallItems.filter(i => i.status === recallTab);
        if (searchTerm) {
            list = list.filter(i => i.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list;
    }, [recallItems, recallTab, searchTerm]);

    const handleDismissAssistant = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
        toast.success("Mesaj gönderildi olarak işaretlendi");
    };

    const handleSendWhatsApp = (phone: string, message: string) => {
        if (!phone) return toast.error("Telefon numarası bulunamadı");
        window.open(`https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Elegant Mode Switcher & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="bg-white p-1.5 rounded-[2rem] shadow-xl border border-slate-100 flex items-center relative overflow-hidden group">
                    <div 
                        className={`absolute inset-y-1.5 rounded-[1.75rem] bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500 ease-out shadow-lg ${
                            viewMode === 'ASSISTANT' ? 'left-1.5 w-[160px]' : 'left-[168px] w-[160px]'
                        }`}
                    />
                    <button 
                        onClick={() => setViewMode('ASSISTANT')}
                        className={`relative z-10 w-[160px] py-3 text-xs font-black tracking-widest uppercase transition-colors duration-300 ${
                            viewMode === 'ASSISTANT' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Akıllı Asistan
                    </button>
                    <button 
                        onClick={() => setViewMode('RECALL')}
                        className={`relative z-10 w-[160px] py-3 text-xs font-black tracking-widest uppercase transition-colors duration-300 ${
                            viewMode === 'RECALL' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
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

            {/* Content Area */}
            {viewMode === 'ASSISTANT' ? (
                <div className="space-y-6">
                    {/* Assistant Stats & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 text-xl font-bold">✨</div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Akıllı Bildirimler</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">İlgilenilmesi gereken {filteredAssistantItems.length} kayıt</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            {['ALL', 'REMINDER', 'BIRTHDAY', 'DELAY', 'FOLLOWUP', 'PAYMENT'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setAssistantFilter(f as AssistantItemType | "ALL")}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${
                                        assistantFilter === f ? "bg-white text-teal-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                    {categoryNames[f]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Assistant List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assistantLoading ? (
                            <div className="col-span-full py-20 text-center animate-pulse text-slate-400">Veriler yükleniyor...</div>
                        ) : filteredAssistantItems.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">Bekleyen bildirim bulunamadı.</div>
                        ) : (
                            filteredAssistantItems.map((item) => (
                                <div key={item.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {categoryNames[item.type] || item.type}
                                        </span>
                                        <button 
                                            onClick={() => handleDismissAssistant(item.id)}
                                            className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                                        >✓</button>
                                    </div>
                                    <h3 className="font-black text-slate-800 text-base mb-1">{item.patientName}</h3>
                                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-tighter mb-4">{item.title}</p>
                                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 italic text-[11px] text-slate-500 leading-relaxed border-l-4 border-teal-500">
                                        `{`"{item.message}"`}`
                                    </div>
                                    <button 
                                        onClick={() => handleSendWhatsApp(item.patientPhone || "", item.message)}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-3 rounded-2xl text-xs shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                    >
                                        <span>MESAJI GÖNDER</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Recall Stats & Tabs */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold">📅</div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Recall Takip Listesi</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Periyodik kontrol zamanı gelen hastalar</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl">
                            {['pending', 'contacted', 'booked', 'dismissed'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setRecallTab(t as RecallStatus)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${
                                        recallTab === t ? "bg-white text-amber-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                    {statusNames[t as RecallStatus]}
                                </button>
                            ))}
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
                                    <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${label.cls}`}>{label.text}</span>
                                            <span className="text-[10px] font-bold text-slate-400 font-mono italic">#{item.id.slice(0,4)}</span>
                                        </div>
                                        <h3 className="font-black text-slate-800 text-base mb-1">{item.patients?.full_name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">{item.treatment_type}</p>
                                        
                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                                <span>Son Tedavi:</span>
                                                <span className="text-slate-800">{formatDate(item.last_treatment_date)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                                <span>Ulaşılma:</span>
                                                <span className="text-blue-600 bg-blue-50 px-2 rounded-lg">{item.contact_attempts} kez</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <a 
                                                href={waLink}
                                                target="_blank"
                                                className="bg-emerald-500 text-white font-black py-2.5 rounded-xl text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-600"
                                            >WHATSAPP</a>
                                            <button 
                                                onClick={() => updateRecallStatus({ id: item.id, status: 'contacted' })}
                                                className="bg-blue-50 text-blue-700 font-black py-2.5 rounded-xl text-[10px] hover:bg-blue-100"
                                            >ULAŞILDI</button>
                                            <button 
                                                onClick={() => updateRecallStatus({ id: item.id, status: 'booked' })}
                                                className="col-span-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black py-3 rounded-xl text-[10px] mt-1 shadow-lg shadow-teal-50"
                                            >📅 RANDEVU ALINDI</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
