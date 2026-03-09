"use client";

import React from "react";
import { DatePreset } from "@/hooks/useReports";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { Search, Filter, Calendar, Users, Activity, CreditCard } from "lucide-react";

interface GlobalFilterBarProps {
    preset: DatePreset;
    setPreset: (p: DatePreset) => void;
    customStart: string;
    setCustomStart: (s: string) => void;
    customEnd: string;
    setCustomEnd: (e: string) => void;
    doctorFilter: string;
    setDoctorFilter: (d: string) => void;
    treatmentFilter: string;
    setTreatmentFilter: (t: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    doctors: { id: string; full_name: string }[];
    treatmentTypes: { id: string; name: string }[];
    rangeLabel: string;
}

export function GlobalFilterBar({
    preset, setPreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    doctorFilter, setDoctorFilter,
    treatmentFilter, setTreatmentFilter,
    statusFilter, setStatusFilter,
    doctors,
    treatmentTypes,
    rangeLabel
}: GlobalFilterBarProps) {
    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b shadow-sm -mx-4 px-4 py-3 mb-6">
            <div className="max-w-7xl mx-auto flex flex-col gap-4">
                {/* Header & Main Presets */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-indigo-200 shadow-lg">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Klinik Analitiği</h1>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{rangeLabel}</p>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto p-1 bg-slate-100 rounded-xl no-scrollbar">
                        {[
                            { id: 'today', label: 'Bugün' },
                            { id: '7d', label: '7 Gün' },
                            { id: '30d', label: '30 Gün' },
                            { id: 'thisMonth', label: 'Bu Ay' },
                            { id: 'lastMonth', label: 'Geçen Ay' },
                            { id: 'thisYear', label: 'Bu Yıl' },
                            { id: 'custom', label: 'Özel' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPreset(p.id as DatePreset)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${preset === p.id
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detailed Filters row */}
                <div className="flex flex-wrap items-center gap-2">
                    {preset === 'custom' && (
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                            <PremiumDatePicker value={customStart} onChange={setCustomStart} compact />
                            <span className="text-slate-300">-</span>
                            <PremiumDatePicker value={customEnd} onChange={setCustomEnd} compact />
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Users className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Hekimler</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={treatmentFilter}
                            onChange={(e) => setTreatmentFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Tedavi Tipleri</option>
                            {treatmentTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Activity className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Durumlar</option>
                            <option value="confirmed">Onaylı</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="cancelled">İptal</option>
                            <option value="no_show">Gelmedi</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setDoctorFilter("ALL");
                            setTreatmentFilter("ALL");
                            setStatusFilter("ALL");
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-tight px-2 transition-colors"
                    >
                        Filtreleri Temizle
                    </button>
                </div>
            </div>
        </div>
    );
}
