"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSmartAssistant, AssistantItem, AssistantItemType } from "@/hooks/useSmartAssistant";
import toast from "react-hot-toast";
import { formatPhoneForWhatsApp } from "@/lib/dateUtils";

type FilterType = 'ALL' | AssistantItemType;

export function SmartAssistantSection() {
    const { assistantItems, isLoading } = useSmartAssistant();
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem('dismissedAssistantItems');
            return saved ? (JSON.parse(saved) as string[]) : [];
        } catch {
            return [];
        }
    });
    const [showDismissed, setShowDismissed] = useState(false);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        let newDismissed;
        if (dismissedIds.includes(id)) {
            // If already dismissed and in "Sent" view, restore it
            newDismissed = dismissedIds.filter(d => d !== id);
        } else {
            // Dismiss it
            newDismissed = [...dismissedIds, id];
        }
        setDismissedIds(newDismissed);
        sessionStorage.setItem('dismissedAssistantItems', JSON.stringify(newDismissed));
        window.dispatchEvent(new CustomEvent('assistant-updated'));
    };

    const activeItems = useMemo(() => {
        if (showDismissed) {
            return assistantItems.filter(item => dismissedIds.includes(item.id));
        }
        return assistantItems.filter(item => !dismissedIds.includes(item.id));
    }, [assistantItems, dismissedIds, showDismissed]);

    useEffect(() => {
        const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#assist-')) {
                const id = hash.replace('#assist-', '');
                setHighlightedId(id);

                pendingTimeouts.push(setTimeout(() => {
                    document.getElementById(`assist-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100));

                pendingTimeouts.push(setTimeout(() => setHighlightedId(null), 5000));
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            pendingTimeouts.forEach(clearTimeout);
        };
    }, []);

    const filteredItems = useMemo(() => {
        if (filter === 'ALL') return activeItems;
        return activeItems.filter(item => item.type === filter);
    }, [activeItems, filter]);

    const handleSendMessage = (item: AssistantItem, isDismissed: boolean = false) => {
        if (!item.patientPhone) {
            toast.error("Hasta telefonu kayıtlı değil");
            return;
        }
        const message = isDismissed ? "" : item.message;
        const url = `https://wa.me/${formatPhoneForWhatsApp(item.patientPhone)}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const getCategoryStyles = (type: AssistantItemType) => {
        switch (type) {
            case 'REMINDER':
                return {
                    bg: 'bg-indigo-50/50',
                    border: 'border-indigo-100',
                    text: 'text-indigo-700',
                    iconBg: 'bg-indigo-100',
                    badge: 'bg-indigo-600',
                    button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
                    dismiss: 'text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600',
                    gradient: 'from-indigo-50/20 to-transparent',
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )
                };
            case 'SATISFACTION':
                return {
                    bg: 'bg-emerald-50/50',
                    border: 'border-emerald-100',
                    text: 'text-emerald-700',
                    iconBg: 'bg-emerald-100',
                    badge: 'bg-emerald-600',
                    button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
                    dismiss: 'text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600',
                    gradient: 'from-emerald-50/20 to-transparent',
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    )
                };
            case 'PAYMENT':
                return {
                    bg: 'bg-amber-50/50',
                    border: 'border-amber-100',
                    text: 'text-amber-700',
                    iconBg: 'bg-amber-100',
                    badge: 'bg-orange-600',
                    button: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
                    dismiss: 'text-amber-400 hover:bg-amber-100 hover:text-amber-600',
                    gradient: 'from-amber-50/20 to-transparent',
                    icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    )
                };
            default:
                return { bg: '', border: '', text: '', iconBg: '', badge: '', button: '', dismiss: '', gradient: '', icon: null };
        }
    };

    const counts = useMemo(() => {
        return {
            pending: assistantItems.filter(item => !dismissedIds.includes(item.id)).length,
            sent: assistantItems.filter(item => dismissedIds.includes(item.id)).length
        };
    }, [assistantItems, dismissedIds]);

    if (!isLoading && activeItems.length === 0) {
        return (
            <section id="smart-assistant" className="group/card rounded-[28px] border border-slate-100 bg-white shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col relative" style={{ height: '416px' }}>
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-teal-100 transition-colors pointer-events-none" />
                <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-slate-50 relative z-10">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-md shadow-teal-200/60">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 truncate">Akıllı Mesaj Asistanı</h2>
                            <p className="text-[11px] text-slate-400 truncate">
                                {showDismissed ? "Gönderilen mesajlarınız" : "Bekleyen mesajınız yok"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setShowDismissed(!showDismissed)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all shadow-sm active:scale-95 text-white whitespace-nowrap ${showDismissed
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                        >
                            {showDismissed ? `Bekleyenler (${counts.pending})` : `Gönderilenler (${counts.sent})`}
                        </button>
                        <div className="relative">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as FilterType)}
                                className="appearance-none bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 pr-7 text-[11px] font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all hover:bg-white"
                            >
                                <option value="ALL">Tümü ({activeItems.length})</option>
                                <option value="REMINDER">Randevu ({activeItems.filter(i => i.type === 'REMINDER').length})</option>
                                <option value="SATISFACTION">Memnuniyet ({activeItems.filter(i => i.type === 'SATISFACTION').length})</option>
                                <option value="PAYMENT">Ödeme ({activeItems.filter(i => i.type === 'PAYMENT').length})</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-slate-900 font-bold mb-1 font-outfit">
                        {showDismissed ? "Henüz Gönderilen Yok" : "Bekleyen Mesaj Yok"}
                    </h3>
                    <p className="text-slate-500 text-xs">
                        {showDismissed
                            ? "Henüz gönderildi olarak işaretlediğiniz bir mesaj bulunmuyor."
                            : "Şu an gönderilmesi gereken otomatik bir hatırlatma bulunmuyor."
                        }
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section id="smart-assistant" className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col" style={{ height: '416px' }}>
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-slate-50 relative z-10">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-md shadow-teal-200/60">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate">Akıllı Mesaj Asistanı</h2>
                        <p className="text-[11px] text-slate-400 truncate">
                            {isLoading ? "Hesaplanıyor..." : (
                                showDismissed
                                    ? `${activeItems.length} gönderilen mesaj`
                                    : `${activeItems.length} gönderilecek mesaj var`
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowDismissed(!showDismissed)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all shadow-sm active:scale-95 text-white whitespace-nowrap ${showDismissed
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                    >
                        {showDismissed ? `Bekleyenler (${counts.pending})` : `Gönderilenler (${counts.sent})`}
                    </button>
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterType)}
                            className="appearance-none bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 pr-7 text-[11px] font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all hover:bg-white"
                        >
                            <option value="ALL">Tümü ({activeItems.length})</option>
                            <option value="REMINDER">Randevu ({activeItems.filter(i => i.type === 'REMINDER').length})</option>
                            <option value="SATISFACTION">Memnuniyet ({activeItems.filter(i => i.type === 'SATISFACTION').length})</option>
                            <option value="PAYMENT">Ödeme ({activeItems.filter(i => i.type === 'PAYMENT').length})</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
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
                        const isDismissed = dismissedIds.includes(item.id);
                        return (
                            <div
                                id={`assist-${item.id}`}
                                key={item.id}
                                className={`group/card bg-white p-5 rounded-[24px] border transition-all relative overflow-hidden flex flex-col min-h-[190px] ${highlightedId === item.id
                                    ? 'animate-highlight-glow ring-2 ring-indigo-500 border-indigo-500 z-10 shadow-2xl scale-[1.02]'
                                    : `border-slate-100 shadow-sm hover:shadow-xl hover:border-transparent ${styles.border.replace('border-', 'hover:border-')}`
                                    }`}
                            >
                                {/* Arkaplan Süslemeleri */}
                                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover/card:opacity-20 transition-opacity pointer-events-none ${styles.badge}`} />
                                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.badge} opacity-0 group-hover/card:opacity-100 transition-all duration-500`} />

                                {/* Kategori Rozeti */}
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase border ${styles.bg} ${styles.text} ${styles.border}`}>
                                        {styles.icon}
                                        {item.type === 'REMINDER' ? 'RANDEVU' : item.type === 'SATISFACTION' ? 'MEMNUNİYET' : 'ÖDEME'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDismiss(item.id, e)}
                                            className={`group/dismiss flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-sm active:scale-95 focus:outline-none ${isDismissed
                                                ? "bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white"
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white"
                                                }`}
                                            title={isDismissed ? "Geri yükle" : "Gönderildi olarak işaretle"}
                                        >
                                            <svg className="w-3 h-3 group-hover/dismiss:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                                {isDismissed ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                )}
                                            </svg>
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                                {isDismissed ? "GERİ AL" : "GÖNDERİLDİ"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Bilgi Kısımı */}
                                <div className="mb-3 relative z-10">
                                    <h3 className="text-[13px] font-black text-slate-900 mb-0.5 leading-tight">
                                        {item.patientName}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.12em]">
                                        {item.title}
                                    </p>
                                </div>

                                {/* Mesaj Alanı */}
                                <div className="flex-1 mb-5 relative z-10">
                                    <p className="text-[11px] text-slate-600 font-semibold leading-relaxed pl-3 border-l-2 border-slate-200">
                                        {item.message}
                                    </p>
                                </div>

                                {/* Alt Etkinlik Alanı */}
                                <div className="mt-auto pt-4 border-t border-slate-50 flex flex-col gap-3 relative z-10">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${styles.badge} ${item.type === 'REMINDER' ? 'animate-bounce' : 'animate-pulse'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                                {item.timeLabel}
                                            </span>
                                        </div>
                                        {item.patientPhone && !isDismissed && (
                                            <div className="flex items-center gap-1 group/wa cursor-help">
                                                <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.3.149-1.777.877-2.045.976-.269.1-.463.149-.657.437-.194.288-.748.941-.917 1.134-.169.194-.338.219-.636.07-.3-.149-1.264-.467-2.41-1.488-.891-.795-1.492-1.777-1.667-2.075-.173-.301-.019-.463.13-.612.134-.133.298-.348.448-.522.152-.174.202-.298.301-.497.1-.199.049-.373-.024-.522-.074-.15-.657-1.583-.902-2.172-.239-.574-.482-.497-.657-.506-.169-.009-.364-.01-.559-.01-.194 0-.51.074-.777.369-.269.299-1.025 1.002-1.025 2.441 0 1.439 1.045 2.829 1.191 3.028.146.199 2.056 3.139 4.979 4.398.694.3 1.237.479 1.661.613.697.221 1.332.189 1.833.114.559-.084 1.717-.7 1.956-1.378.239-.679.239-1.264.168-1.378-.069-.115-.261-.189-.558-.337zM12 2.03c-5.522 0-10 4.477-10 10 0 1.769.463 3.428 1.266 4.87L2.05 22l5.247-1.376c1.118.608 2.396.955 3.703.955 5.518 0 10-4.477 10-10 0-5.522-4.482-10-10-10zM12 20.3c-1.611 0-3.18-.426-4.555-1.233l-.326-.194-3.042.797.81-2.964-.213-.339A8.257 8.257 0 013.75 12.03c0-4.549 3.701-8.25 8.25-8.25s8.25 3.701 8.25 8.25c0 4.551-3.701 8.25-8.25 8.25z" />
                                                </svg>
                                                <span className="text-[9px] text-slate-400 font-black group-hover/wa:text-emerald-600 transition-colors">WHATSAPP</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.patientPhone && (
                                        <button
                                            onClick={() => handleSendMessage(item, isDismissed)}
                                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black text-white transition-all active:scale-[0.97] shadow-lg ${isDismissed
                                                ? "bg-slate-700 hover:bg-slate-800 shadow-slate-200"
                                                : styles.button} hover:scale-[1.02]`}
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.3.149-1.777.877-2.045.976-.269.1-.463.149-.657.437-.194.288-.748.941-.917 1.134-.169.194-.338.219-.636.07-.3-.149-1.264-.467-2.41-1.488-.891-.795-1.492-1.777-1.667-2.075-.173-.301-.019-.463.13-.612.134-.133.298-.348.448-.522.152-.174.202-.298.301-.497.1-.199.049-.373-.024-.522-.074-.15-.657-1.583-.902-2.172-.239-.574-.482-.497-.657-.506-.169-.009-.364-.01-.559-.01-.194 0-.51.074-.777.369-.269.299-1.025 1.002-1.025 2.441 0 1.439 1.045 2.829 1.191 3.028.146.199 2.056 3.139 4.979 4.398.694.3 1.237.479 1.661.613.697.221 1.332.189 1.833.114.559-.084 1.717-.7 1.956-1.378.239-.679.239-1.264.168-1.378-.069-.115-.261-.189-.558-.337zM12 2.03c-5.522 0-10 4.477-10 10 0 1.769.463 3.428 1.266 4.87L2.05 22l5.247-1.376c1.118.608 2.396.955 3.703.955 5.518 0 10-4.477 10-10 0-5.522-4.482-10-10-10zM12 20.3c-1.611 0-3.18-.426-4.555-1.233l-.326-.194-3.042.797.81-2.964-.213-.339A8.257 8.257 0 013.75 12.03c0-4.549 3.701-8.25 8.25-8.25s8.25 3.701 8.25 8.25c0 4.551-3.701 8.25-8.25 8.25z" />
                                            </svg>
                                            {isDismissed ? "İletişime Geç" : "Mesajı Gönder"}
                                        </button>
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
