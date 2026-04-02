"use client";

import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { AppointmentView, ZoomLevel, DoctorOption } from "@/hooks/useAppointments";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { useClinic } from "@/app/context/ClinicContext";

interface AppointmentsHeaderProps {
    selectedDate: Date;
    weekRangeStr: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onDateChange: (date: Date) => void;
    doctors: DoctorOption[];
    selectedDoctorIds: string[];
    onDoctorChange: (ids: string[]) => void;
    zoom: ZoomLevel;
    onZoomChange: (z: ZoomLevel) => void;
    view: AppointmentView;
    onViewChange: (v: AppointmentView) => void;
    loading: boolean;
    totalCount: number;
    eventCounts: Record<string, number>;
    onNewAppointment?: () => void;
}

const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
    { value: 15, label: "15m" },
    { value: 30, label: "30m" },
    { value: 60, label: "60m" },
];

export function AppointmentsHeader({
    selectedDate,
    weekRangeStr,
    onPrev,
    onNext,
    onToday,
    onDateChange,
    doctors,
    selectedDoctorIds,
    onDoctorChange,
    zoom,
    onZoomChange,
    view,
    onViewChange,
    loading,
    totalCount,
    eventCounts,
    onNewAppointment,
}: AppointmentsHeaderProps) {
    const { themeColorFrom } = useClinic();
    const [isDoctorMenuOpen, setIsDoctorMenuOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const dateTriggerRef = useRef<HTMLButtonElement>(null);
    const isToday =
        new Date().toDateString() === selectedDate.toDateString();

    const toggleDoctor = (id: string) => {
        if (selectedDoctorIds.includes(id)) {
            onDoctorChange(selectedDoctorIds.filter(d => d !== id));
        } else {
            onDoctorChange([...selectedDoctorIds, id]);
        }
    };

    const selectAll = () => onDoctorChange(doctors.map(d => d.id));
    const deselectAll = () => onDoctorChange([]);

    const formatDoctorName = (name: string) => {
        if (!name) return "Atanmamış";
        if (name.toLowerCase().includes("atanmadı")) return "Atanmamış";
        return name;
    };

    const selectedDoctorsText = useMemo(() => {
        if (selectedDoctorIds.length === 0) return "Hekim Seç";
        const allCount = doctors.length;
        if (allCount > 0 && selectedDoctorIds.length === allCount) return "Tüm Hekimler";

        if (selectedDoctorIds.length === 1) {
            const d = doctors.find(doc => doc.id === selectedDoctorIds[0]);
            return d ? d.full_name : "1 Hekim";
        }
        return `${selectedDoctorIds.length} Hekim`;
    }, [selectedDoctorIds, doctors]);

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white border-b border-slate-200 px-4 py-4 lg:py-3 shadow-sm flex-shrink-0">
            {/* LEFT: Date Navigation & Display — always one row */}
            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm shrink-0">
                    <button
                        onClick={onPrev}
                        className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 transition-all border-r border-slate-100"
                        style={{ '--hover-color': 'var(--brand-from)' } as any}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-from)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                        title={view === "week" ? "Önceki hafta" : "Önceki gün"}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </button>

                    <button
                        onClick={onToday}
                        className={`h-9 px-4 text-[11px] font-bold transition-all border-r border-slate-100`}
                        style={isToday 
                            ? { backgroundColor: `${themeColorFrom}10`, color: 'var(--brand-from)' } 
                            : { color: '#475569' }}
                    >
                        Bugün
                    </button>

                    <button
                        onClick={onNext}
                        className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-from)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                        title={view === "week" ? "Sonraki hafta" : "Sonraki gün"}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>

                {/* Date display + PremiumDatePicker */}
                <div className="relative flex-1 min-w-0">
                    <button
                        ref={dateTriggerRef}
                        type="button"
                        onClick={() => setDatePickerOpen((v) => !v)}
                        className={`flex items-center gap-1.5 h-9 px-2.5 w-full rounded-lg border shadow-sm transition-all group`}
                        style={datePickerOpen 
                            ? { borderColor: 'var(--brand-from)', backgroundColor: `${themeColorFrom}10` } 
                            : { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}
                    >
                        <svg className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: 'var(--brand-from)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" />
                        </svg>
                        {/* Mobile: short format without year */}
                        <span className="sm:hidden text-xs font-bold text-slate-700 truncate group-hover:text-slate-900">
                            {view === "week"
                                ? weekRangeStr.replace(/\s\d{4}$/, "")
                                : format(selectedDate, "d MMM, EEE", { locale: tr })}
                        </span>
                        {/* Desktop: full format */}
                        <span className="hidden sm:inline text-sm font-bold text-slate-700 truncate group-hover:text-slate-900">
                            {view === "week" ? weekRangeStr : format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
                        </span>
                        {loading && (
                            <span className="ml-auto shrink-0 h-3 w-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand-from)', borderTopColor: 'transparent' }} />
                        )}
                    </button>
                    <PremiumDatePicker
                        value={format(selectedDate, "yyyy-MM-dd")}
                        onChange={(dateStr) => {
                            const parts = dateStr.split("-").map(Number);
                            onDateChange(new Date(parts[0], parts[1] - 1, parts[2]));
                        }}
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                        align="right"
                        excludeRef={dateTriggerRef}
                    />
                </div>
            </div>

            {/* RIGHT: Filters + Controls */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {onNewAppointment && (
                    <button
                        onClick={onNewAppointment}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-white text-xs font-black shadow-md shadow-black/10 transition-all active:scale-95 active-brand-gradient"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Yeni Randevu
                    </button>
                )}
                {/* View Switcher */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-inner">
                    <button
                        onClick={() => onViewChange("grid")}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${view === "grid"
                            ? "bg-white shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                        style={view === "grid" ? { color: 'var(--brand-from)' } : {}}
                    >
                        Gün
                    </button>
                    <button
                        onClick={() => onViewChange("week")}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${view === "week"
                            ? "bg-white shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                        style={view === "week" ? { color: 'var(--brand-from)' } : {}}
                    >
                        Hafta
                    </button>
                    <button
                        onClick={() => onViewChange("list")}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${view === "list"
                            ? "bg-white shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                        style={view === "list" ? { color: 'var(--brand-from)' } : {}}
                    >
                        Liste
                    </button>
                </div>

                {/* Slot Density - Always visible or intelligently wrapped */}
                {view === "grid" && (
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm h-9">
                        {ZOOM_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => onZoomChange(opt.value)}
                                className={`h-full px-2.5 rounded-md text-[11px] font-bold transition-all ${zoom === opt.value
                                    ? "text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                style={zoom === opt.value ? { background: `linear-gradient(to right, var(--brand-from), var(--brand-to))` } : {}}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Multi-select Doctor Filter */}
                <div className="relative">
                    <button
                        onClick={() => setIsDoctorMenuOpen(!isDoctorMenuOpen)}
                        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all outline-none focus:ring-2 focus:ring-slate-500/10 shadow-sm transition-all"
                        style={{ borderBottomColor: isDoctorMenuOpen ? 'var(--brand-from)' : '#e2e8f0' } as any}
                    >
                        <svg className="h-3.5 w-3.5" style={{ color: 'var(--brand-from)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                        <span className="truncate max-w-[100px] sm:max-w-[140px] uppercase">{selectedDoctorsText}</span>

                        {/* Appointment Count Badge */}
                        <div 
                            className="flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-black border min-w-[20px]"
                            style={{ backgroundColor: `${themeColorFrom}10`, color: 'var(--brand-from)', borderColor: `${themeColorFrom}20` }}
                        >
                            {totalCount}
                        </div>

                        <svg className={`ml-1 h-3 w-3 text-slate-400 transition-transform ${isDoctorMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>

                    {isDoctorMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setIsDoctorMenuOpen(false)} />
                            <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] py-2 overflow-hidden animate-in fade-in zoom-in duration-150 ring-1 ring-black/5">
                                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between mb-1 bg-slate-50/50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hekim Filtresi</span>
                                    <div className="flex gap-3">
                                        <button onClick={selectAll} className="text-[10px] font-bold hover:opacity-80 transition-opacity" style={{ color: 'var(--brand-from)' }}>Tümü</button>
                                        <button onClick={deselectAll} className="text-[10px] text-slate-500 font-bold hover:text-slate-700 transition-opacity">Hiçbiri</button>
                                    </div>
                                </div>
                                <div className="max-h-72 overflow-y-auto px-1">
                                    {doctors.map(d => (
                                        <button
                                            key={d.id}
                                            onClick={() => toggleDoctor(d.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                                        >
                                            <div 
                                                className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${selectedDoctorIds.includes(d.id) ? 'text-white shadow-sm' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}
                                                style={selectedDoctorIds.includes(d.id) ? { backgroundColor: 'var(--brand-from)', borderColor: 'var(--brand-from)' } : {}}
                                            >
                                                {selectedDoctorIds.includes(d.id) && <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.42-6.446z" /></svg>}
                                            </div>
                                            <span className={`text-xs font-bold truncate flex-1 text-left uppercase ${selectedDoctorIds.includes(d.id) ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {d.full_name}
                                            </span>
                                            <span 
                                                className="text-[10px] font-black border px-1.5 py-0.5 rounded-md tabular-nums min-w-[24px] text-center"
                                                style={{ backgroundColor: `${themeColorFrom}05`, color: 'var(--brand-from)', borderColor: `${themeColorFrom}10` }}
                                            >
                                                ({eventCounts[d.id] || 0})
                                            </span>
                                        </button>
                                    ))}
                                    {doctors.length === 0 && (
                                        <div className="px-4 py-8 text-center">
                                            <div className="text-[11px] font-bold text-slate-400 italic">Hekim bulunamadı</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
