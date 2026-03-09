import React, { useEffect, useState } from "react";
import { DashboardAppointment } from "@/hooks/useDashboard";
import { ControlItem } from "@/hooks/useChecklist";
import { CONTROL_TONE_STYLES } from "@/constants/dashboard";

interface ControlListProps {
    isToday: boolean;
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
    isToday,
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
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#task-')) {
                const id = hash.replace('#task-', '');
                setHighlightedId(id);

                // Hafif gecikme ile DOM'un hazır olduğundan emin ol ve scroll yap
                setTimeout(() => {
                    const element = document.getElementById(`task-${id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);

                // 5 saniye sonra vurguyu kaldır
                setTimeout(() => setHighlightedId(null), 5000);
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (!loading && controlItems.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 text-center border shadow-sm">
                <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <h3 className="text-slate-900 font-bold mb-1 font-outfit">Her Şey Yolunda!</h3>
                <p className="text-slate-500 text-xs">Şu an kontrol edilmesi gereken kritik bir madde bulunmuyor.</p>
            </div>
        );
    }

    return (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col" style={{ height: '416px' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Kontrol Listesi</h2>
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
                    <div className="py-10 text-center text-slate-400 text-xs animate-pulse">Kontroller taranıyor...</div>
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
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-900 truncate">{item.patientName}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.tone === 'critical' ? 'bg-rose-50 text-rose-600' :
                                        item.tone === 'high' ? 'bg-orange-50 text-orange-600' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {item.status === 'pending' ? 'Bekliyor' : 'Tamamlandı'}
                                    </span>
                                </div>
                                <h3 className="text-xs text-slate-600 font-medium mb-3">{item.title}</h3>

                                {/* HIZLI AKSIYON BUTONLARI */}
                                <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                                    {item.code === 'STATUS_UPDATE' && (
                                        <>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'completed')}
                                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-emerald-100"
                                            >
                                                ✅ Tamamlandı
                                            </button>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'cancelled')}
                                                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-rose-100"
                                            >
                                                ❌ İptal Edildi
                                            </button>
                                            <button
                                                onClick={() => onStatusChange(item.appointmentId, 'no_show')}
                                                className="px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-slate-100"
                                            >
                                                ⏳ Gelmedi
                                            </button>
                                        </>
                                    )}

                                    {item.code === 'MISSING_NOTE' && (
                                        <button
                                            onClick={() => onTreatmentNoteClick?.(item)}
                                            className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 border border-amber-100"
                                        >
                                            📝 Tedavi Notu Yaz
                                        </button>
                                    )}

                                    {item.code === 'MISSING_PAYMENT' && (
                                        <button
                                            onClick={() => onPaymentClick?.(item)}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 border border-blue-100"
                                        >
                                            💰 Ödeme Bilgisi Gir
                                        </button>
                                    )}

                                    {item.code === 'DUE_PAYMENT_FOLLOWUP' && (
                                        <button
                                            onClick={() => onPaymentClick?.(item)}
                                            className="px-4 py-2 bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 border border-cyan-100"
                                        >
                                            💵 Tahsilat Yap
                                        </button>
                                    )}

                                    {item.code === 'MISSING_DOCTOR' && (
                                        <div className="flex flex-col gap-1.5 w-full max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hekim Seç</label>
                                            <select
                                                onChange={(e) => onAssignDoctor?.(item.appointmentId, e.target.value)}
                                                className="w-full h-9 bg-indigo-50 border-indigo-100 text-indigo-700 text-[11px] font-bold rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Hekim Seçiniz...</option>
                                                {doctors.map(doc => (
                                                    <option key={doc.id} value={doc.id}>{doc.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Diğer aksiyonlar buraya gelebilir */}
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end shrink-0">
                                <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">
                                    {new Date(item.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium mt-1">{item.treatmentType}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
