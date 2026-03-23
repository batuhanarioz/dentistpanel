import React, { useEffect, useState } from "react";
import { DashboardAppointment } from "@/hooks/useDashboard";
import { ControlItem } from "@/hooks/useChecklist";
import { CONTROL_TONE_STYLES } from "@/constants/dashboard";
import { SectionEmptyState } from "./SectionEmptyState";

interface ControlListProps {
    controlItems: ControlItem[];
    onStatusChange: (appointmentId: string, status: DashboardAppointment["status"]) => void;
    onPaymentClick?: (item: ControlItem) => void;
    onTreatmentNoteClick?: (item: ControlItem) => void;
    onCardClick?: (item: ControlItem) => void;
    doctors?: { id: string; full_name: string }[];
    onAssignDoctor?: (appointmentId: string, doctorId: string) => void;
    loading?: boolean;
}

export function ControlListSection({
    controlItems,
    onStatusChange,
    onPaymentClick,
    onTreatmentNoteClick,
    onCardClick,
    doctors = [],
    onAssignDoctor,
    loading
}: ControlListProps) {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("ALL");

    const filterOptions = [
        { label: "Tümü", value: "ALL" },
        { label: "Durum Güncellemesi", value: "STATUS_UPDATE" },
        { label: "Ödeme Takibi", value: "DUE_PAYMENT_FOLLOWUP" },
        { label: "Eksik Ödeme", value: "MISSING_PAYMENT" },
        { label: "Tedavi Notu", value: "MISSING_NOTE" },
        { label: "Hekim Ataması", value: "MISSING_DOCTOR" },
    ];

    const filteredItems = React.useMemo(() => {
        if (filter === "ALL") return controlItems;
        return controlItems.filter(item => item.code === filter);
    }, [controlItems, filter]);

    useEffect(() => {
        const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#task-')) {
                const id = hash.replace('#task-', '');
                setHighlightedId(id);

                pendingTimeouts.push(setTimeout(() => {
                    document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    if (!loading && controlItems.length === 0) {
        return (
            <div className="group/card bg-white rounded-[28px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-emerald-100 transition-colors pointer-events-none" />
                <div className="relative z-10">
                    <SectionEmptyState
                        gradient="from-emerald-400 to-teal-500"
                        shadow="shadow-emerald-200/60"
                        title="Her Şey Yolunda!"
                        description="Şu an kontrol edilmesi gereken kritik bir madde bulunmuyor."
                        icon={
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <section className="group/card rounded-[28px] border border-slate-100 bg-white shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col relative" style={{ height: '416px' }}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-amber-100 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200/60 shrink-0">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Kontrol Listesi</h2>
                        <p className="text-[11px] text-slate-400">
                            {loading ? "Yükleniyor..." : `${filteredItems.length} bildirim bekliyor`}
                        </p>
                    </div>
                </div>

                <div className="relative group/filter">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black py-1.5 pl-3 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer hover:bg-white uppercase tracking-tighter"
                    >
                        {filterOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.value === 'ALL' ? controlItems.length : controlItems.filter(i => i.code === opt.value).length})
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                {loading && (
                    <div className="space-y-3 pt-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-28 rounded-full bg-slate-100" />
                                        <div className="h-2.5 w-44 rounded-full bg-slate-100" />
                                        <div className="h-7 w-24 rounded-xl bg-slate-100 mt-3" />
                                    </div>
                                    <div className="h-8 w-14 rounded-xl bg-slate-100 shrink-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!loading && filteredItems.length === 0 && filter !== 'ALL' && (
                    <div className="py-10 text-center">
                        <p className="text-slate-400 text-[11px] font-medium italic">Bu kategoride bekleyen kontrol bulunmuyor.</p>
                        <button
                            onClick={() => setFilter('ALL')}
                            className="mt-2 text-[10px] font-black text-teal-600 hover:text-teal-700 underline"
                        >
                            Tümünü Göster
                        </button>
                    </div>
                )}
                {filteredItems.map((item) => (
                    <div
                        id={`task-${item.id}`}
                        key={item.id}
                        onClick={() => item.code !== 'MISSING_DOCTOR' && onCardClick?.(item)}
                        className={`group bg-white p-4 rounded-2xl border transition-all relative overflow-hidden ${highlightedId === item.id
                            ? 'animate-highlight-glow ring-2 ring-indigo-500 border-indigo-500 z-10 shadow-2xl scale-[1.02]'
                            : 'border-slate-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-600/5'
                            } ${item.code === 'MISSING_DOCTOR' ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                        {/* Sol kenar vurgusu */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.code === 'STATUS_UPDATE' ? 'bg-rose-500' :
                            item.code === 'MISSING_PAYMENT' ? 'bg-orange-500' :
                                item.code === 'DUE_PAYMENT_FOLLOWUP' ? 'bg-cyan-500' :
                                    item.code === 'MISSING_NOTE' ? 'bg-amber-500' :
                                        item.code === 'MISSING_DOCTOR' ? 'bg-indigo-500' :
                                            'bg-blue-500'
                            }`} />

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-black text-slate-900 truncate">{item.patientName}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wide ${item.tone === 'critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                        item.tone === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                            'bg-slate-100 text-slate-500 border border-slate-200'
                                        }`}>
                                        {item.status === 'pending' ? 'Bekliyor' : 'Tamamlandı'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-semibold mb-3 leading-snug">{item.title}</p>

                                {/* HIZLI AKSIYON BUTONLARI */}
                                <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                    {item.code === 'STATUS_UPDATE' && (
                                        <>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'completed')}
                                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-teal-600 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 border border-emerald-100 active:scale-95 shadow-sm"
                                            >
                                                Tamamlandı
                                            </button>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'cancelled')}
                                                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-gradient-to-br hover:from-rose-500 hover:to-pink-600 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 border border-rose-100 active:scale-95 shadow-sm"
                                            >
                                                İptal Edildi
                                            </button>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'no_show')}
                                                className="px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-gradient-to-br hover:from-slate-500 hover:to-slate-700 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 border border-slate-200 active:scale-95 shadow-sm"
                                            >
                                                Gelmedi
                                            </button>
                                        </>
                                    )}

                                    {item.code === 'MISSING_NOTE' && (
                                        <button
                                            onClick={() => onTreatmentNoteClick?.(item)}
                                            className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-gradient-to-br hover:from-amber-400 hover:to-orange-500 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border border-amber-100 active:scale-95 shadow-sm"
                                        >
                                            Tedavi Notu Yaz
                                        </button>
                                    )}

                                    {item.code === 'MISSING_PAYMENT' && (
                                        <button
                                            onClick={() => onPaymentClick?.(item)}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border border-blue-100 active:scale-95 shadow-sm"
                                        >
                                            Ödeme Bilgisi Gir
                                        </button>
                                    )}

                                    {item.code === 'DUE_PAYMENT_FOLLOWUP' && (
                                        <button
                                            onClick={() => onPaymentClick?.(item)}
                                            className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-teal-600 hover:text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border border-cyan-100 active:scale-95 shadow-sm"
                                        >
                                            Tahsilat Yap
                                        </button>
                                    )}

                                    {item.code === 'MISSING_DOCTOR' && (
                                        <div className="flex flex-col gap-1.5 w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Hekim Seç</label>
                                            <select
                                                onChange={(e) => onAssignDoctor?.(item.appointmentId, e.target.value)}
                                                className="w-full h-9 bg-indigo-50 border-indigo-100 text-indigo-700 text-[11px] font-black rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Hekim Seçiniz...</option>
                                                {doctors.map(doc => (
                                                    <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end shrink-0">
                                <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                                    {new Date(item.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1.5">{item.treatmentType}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
