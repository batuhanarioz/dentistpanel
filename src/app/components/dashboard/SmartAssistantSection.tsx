"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSmartAssistant, AssistantItem, AssistantItemType, useDismissAssistantItem, useUndoDismissAssistantItem } from "@/hooks/useSmartAssistant";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";

type FilterType = 'ALL' | AssistantItemType;

export function SmartAssistantSection() {
    const params = useParams();
    const slug = params?.slug as string ?? "";
    const { assistantItems, isLoading } = useSmartAssistant();
    const { mutate: dismissItem } = useDismissAssistantItem();
    const { mutate: undoDismissItem } = useUndoDismissAssistantItem();
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        dismissItem(id);
    };

    const handleUndoDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        undoDismissItem(id);
        toast.success("Bildirim geri getirildi");
    };

    const filteredItems = useMemo(() => {
        if (filter === 'ALL') return assistantItems;
        return assistantItems.filter(item => item.type === filter);
    }, [assistantItems, filter]);

    const handleSendMessage = (item: AssistantItem) => {
        if (!item.patientPhone) {
            toast.error("Hasta telefonu kayıtlı değil");
            return;
        }
        const url = `https://wa.me/${formatPhoneForWhatsApp(item.patientPhone)}?text=${encodeURIComponent(item.message)}`;
        window.open(url, '_blank');
    };

    const CATEGORY_STYLES: Record<string, { icon: string; bg: string; border: string; badge: string; accent: string; filterActive: string; glow: string; btn: string }> = {
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

    const categoryNames: Record<string, string> = {
        REMINDER: "Randevu",
        SATISFACTION: "Memnuniyet",
        PAYMENT: "Ödeme",
        DELAY: "Gecikme",
        BIRTHDAY: "Doğum Günü",
        FOLLOWUP: "Takip",
        INCOMPLETE: "Yarım Tedavi",
        NEW_PATIENT: "Yeni Hasta",
        LAB_TRACKING: "Laboratuvar"
    };

    const getCategoryStyles = (type: AssistantItemType) => {
        return CATEGORY_STYLES[type] || CATEGORY_STYLES.DEFAULT;
    };

    if (!isLoading && assistantItems.length === 0) {
        return (
            <section id="smart-assistant" className="group/card rounded-[24px] border border-slate-100 bg-white hover:border-slate-200 transition-all overflow-hidden flex flex-col relative" style={{ maxHeight: '380px' }}>
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-teal-100 transition-colors pointer-events-none" />
                <div className="flex items-center gap-2 px-5 py-5 shrink-0 border-b border-slate-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-md shadow-teal-200/60">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-slate-900">Akıllı Asistan</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Günlük Görev Paneli</p>
                    </div>
                    <a href={`/${slug}/communication`} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors uppercase tracking-widest">Merkezi Aç &rarr;</a>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-5 text-emerald-400 shadow-inner group-hover/card:scale-110 transition-transform">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-slate-900 font-black text-base mb-1 tracking-tight">Harika! Tüm İşler Tamam</h3>
                    <p className="text-slate-500 text-xs font-semibold max-w-[200px] leading-relaxed">Şu an atılması gereken bekleyen bir bildirim kalmadı.</p>
                </div>
            </section>
        );
    }

    const categoryCounts = assistantItems.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {} as Record<string, number>);

    return (
        <section id="smart-assistant" className="rounded-[24px] border border-slate-100 bg-white overflow-hidden flex flex-col group/card">
            <div className="flex items-center gap-2 px-5 py-5 shrink-0 border-b border-slate-50 bg-gradient-to-r from-white to-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-md shadow-teal-200/60">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Akıllı Asistan</h2>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{assistantItems.length} BEKLEYEN GÖREV</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterType)}
                            className="appearance-none bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 pr-8 text-[10px] font-black text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all hover:bg-slate-100"
                        >
                            <option className="bg-white text-slate-700 font-bold" value="ALL">TÜMÜ ({assistantItems.length})</option>
                            <option className="bg-white text-slate-700 font-bold" value="REMINDER">RANDEVULAR ({categoryCounts.REMINDER || 0})</option>
                            <option className="bg-white text-slate-700 font-bold" value="SATISFACTION">MEMNUNİYET ({categoryCounts.SATISFACTION || 0})</option>
                            <option className="bg-white text-slate-700 font-bold" value="PAYMENT">ÖDEMELER ({categoryCounts.PAYMENT || 0})</option>
                            <option className="bg-white text-slate-700 font-bold" value="DELAY">GECİKMELER ({categoryCounts.DELAY || 0})</option>
                            <option className="bg-white text-slate-700 font-bold" value="BIRTHDAY">DOĞUM GÜNLERİ ({categoryCounts.BIRTHDAY || 0})</option>
                            <option className="bg-white text-slate-700 font-bold" value="FOLLOWUP">TAKİPLER ({categoryCounts.FOLLOWUP || 0})</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                    <a href={`/${slug}/communication`} className="text-[10px] font-black bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">MERKEZ &rarr;</a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {isLoading && (
                        <div className="col-span-full py-12 text-center text-slate-400 text-xs animate-pulse">
                            Mesajlar hazırlanıyor...
                        </div>
                    )}
                    {filteredItems.map((item) => {
                        const styles = getCategoryStyles(item.type);
                        return (
                            <div 
                                id={`assist-${item.id}`}
                                key={item.id} 
                                className={`group p-3 transition-colors border flex flex-col min-h-[140px] rounded-2xl bg-white relative overflow-hidden hover:border-slate-300 ${styles.border.replace('border-', 'border-')} ${highlightedId === item.id ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles.badge}`}>{styles.icon} {categoryNames[item.type]}</span>
                                    <button 
                                        onClick={(e) => handleDismiss(item.id, e)} 
                                        className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-500 shrink-0 shadow-sm"
                                    >✓</button>
                                </div>
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h3 className="font-black text-slate-800 text-[13px] leading-tight">{item.patientName}</h3>
                                </div>
                                <p className={`text-[10px] font-bold uppercase mb-2 ${styles.accent}`}>{item.title}</p>
                                <div className="flex-1 p-2.5 rounded-xl mb-3 italic text-[10px] bg-slate-50 border border-slate-100 text-slate-500 shrink-0 leading-relaxed">
                                    {item.message}
                                </div>
                                <div className="mt-auto border-t border-slate-50 pt-3 space-y-2">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.isPastDay ? 'bg-rose-500 animate-pulse' : styles.bg.split(' ')[1]?.replace('from-', 'bg-') || 'bg-slate-400'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${item.isPastDay ? 'text-rose-600' : 'text-slate-600'}`}>
                                            {item.timeLabel}
                                        </span>
                                    </div>
                                    {item.patientPhone ? (
                                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleSendMessage(item)} 
                                                className={`w-full text-white font-black py-2.5 rounded-xl text-[9px] uppercase flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm`}
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                WhatsApp
                                            </button>
                                            <a 
                                                href={`tel:${item.patientPhone}`}
                                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-2.5 rounded-xl text-[9px] uppercase flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25V16.72a2.25 2.25 0 0 0-1.509-2.129l-4.14-1.38a2.25 2.25 0 0 0-2.31.543l-2.002 2.002a15.021 15.021 0 0 1-6.6a6.6 6.6 0 0 1-2.002-2.002l2.002-2.002a2.25 2.25 0 0 0 .543-2.31l-1.38-4.14A2.25 2.25 0 0 0 7.63 2.25H5.25a2.25 2.25 0 0 0-2.25 2.25v2.25Z" />
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
                    })}
                </div>
            </div>
        </section>
    );
}
