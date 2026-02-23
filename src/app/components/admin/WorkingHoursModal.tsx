"use client";

import { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";
import { WorkingHours, DayOfWeek, DaySchedule } from "@/types/database";

interface WorkingHoursOverride {
    date: string;
    open: string;
    close: string;
    is_closed: boolean;
    note?: string;
}

interface WorkingHoursModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WorkingHoursModal({ isOpen, onClose }: WorkingHoursModalProps) {
    const clinic = useClinic();
    const [activeTab, setActiveTab] = useState<"standard" | "exceptions">("standard");
    const [localHours, setLocalHours] = useState<WorkingHours>(clinic.workingHours);
    const [localOverrides, setLocalOverrides] = useState<WorkingHoursOverride[]>(clinic.workingHoursOverrides || []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New override state
    const [newOverrideDate, setNewOverrideDate] = useState("");
    const [newOverrideOpen, setNewOverrideOpen] = useState("09:00");
    const [newOverrideClose, setNewOverrideClose] = useState("19:00");
    const [newOverrideIsClosed, setNewOverrideIsClosed] = useState(false);
    const [newOverrideNote, setNewOverrideNote] = useState("");

    useEffect(() => {
        if (isOpen) {
            setLocalHours(clinic.workingHours);
            setLocalOverrides(clinic.workingHoursOverrides || []);
        }
    }, [isOpen, clinic.workingHours, clinic.workingHoursOverrides]);

    const handleUpdateStandard = (day: DayOfWeek, field: keyof DaySchedule, value: string | boolean) => {
        setLocalHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const addOverride = () => {
        if (!newOverrideDate) return;
        const exists = localOverrides.find(o => o.date === newOverrideDate);
        if (exists) {
            setError("Bu tarih için zaten bir istisna tanımlanmış.");
            return;
        }

        const newOverride = {
            date: newOverrideDate,
            open: newOverrideOpen,
            close: newOverrideClose,
            is_closed: newOverrideIsClosed,
            note: newOverrideNote
        };

        setLocalOverrides(prev => [...prev, newOverride].sort((a, b) => a.date.localeCompare(b.date)));
        setNewOverrideDate("");
        setNewOverrideNote("");
        setError(null);
    };

    const removeOverride = (date: string) => {
        setLocalOverrides(prev => prev.filter(o => o.date !== date));
    };

    const handleSave = async () => {
        if (!clinic.clinicId) return;

        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("clinics")
                .update({
                    working_hours: localHours,
                    working_hours_overrides: localOverrides
                })
                .eq("id", clinic.clinicId);

            if (updateError) throw updateError;

            // Refresh logic - ideally use a real refresh mechanism or window.location.reload
            onClose();
            window.location.reload();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Kaydedilirken bir hata oluştu.";
            console.error("Error saving working hours:", err);
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                {/* Header */}
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white sticky top-0 z-20">
                    <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Çalışma Saatleri</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Haftalık düzen veya istisnalar</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl sm:rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-5 sm:px-8 mt-2 sm:mt-4 gap-4 sm:gap-6 border-b border-slate-50">
                    <button
                        onClick={() => setActiveTab("standard")}
                        className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-all relative ${activeTab === 'standard' ? 'text-indigo-600' : 'text-slate-400'}`}
                    >
                        Haftalık Düzen
                        {activeTab === 'standard' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab("exceptions")}
                        className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold transition-all relative ${activeTab === 'exceptions' ? 'text-indigo-600' : 'text-slate-400'}`}
                    >
                        Özel Günler
                        {activeTab === 'exceptions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-8 overflow-y-auto scrollbar-hide flex-1">
                    {error && (
                        <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-100 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-rose-700 text-xs sm:text-sm font-medium">
                            <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                            {error}
                        </div>
                    )}

                    {activeTab === "standard" ? (
                        <div className="space-y-2.5 sm:space-y-3">
                            {ORDERED_DAYS.map((day) => (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/30">
                                    <div className="flex items-center justify-between sm:w-24 shrink-0">
                                        <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-tighter">{DAY_LABELS[day]}</span>
                                        {/* Mobile only toggle */}
                                        <div className="sm:hidden relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={localHours[day].enabled}
                                                onChange={(e) => handleUpdateStandard(day, "enabled", e.target.checked)}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 sm:gap-6 flex-1">
                                        <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                            <input
                                                type="time"
                                                value={localHours[day].open}
                                                onChange={(e) => handleUpdateStandard(day, "open", e.target.value)}
                                                disabled={!localHours[day].enabled}
                                                className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                                            />
                                            <span className="text-slate-400 font-bold">-</span>
                                            <input
                                                type="time"
                                                value={localHours[day].close}
                                                onChange={(e) => handleUpdateStandard(day, "close", e.target.value)}
                                                disabled={!localHours[day].enabled}
                                                className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                                            />
                                        </div>

                                        <label className="hidden sm:flex items-center gap-3 cursor-pointer group ml-auto">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${localHours[day].enabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {localHours[day].enabled ? 'Açık' : 'Kapalı'}
                                            </span>
                                            <div className="relative inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={localHours[day].enabled}
                                                    onChange={(e) => handleUpdateStandard(day, "enabled", e.target.checked)}
                                                />
                                                <div className="w-10 h-5.5 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Add New Exception */}
                            <div className="p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] bg-indigo-50/50 border border-indigo-100 space-y-3 sm:space-y-4">
                                <h5 className="text-[10px] sm:text-xs font-black text-indigo-700 uppercase tracking-widest">Yeni İstisna Ekle</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase">Tarih</p>
                                        <input
                                            type="date"
                                            value={newOverrideDate}
                                            onChange={(e) => setNewOverrideDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase">Açıklama</p>
                                        <input
                                            type="text"
                                            placeholder="Örn: Resmi Tatil"
                                            value={newOverrideNote}
                                            onChange={(e) => setNewOverrideNote(e.target.value)}
                                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={newOverrideOpen}
                                                onChange={(e) => setNewOverrideOpen(e.target.value)}
                                                disabled={newOverrideIsClosed}
                                                className="bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input
                                                type="time"
                                                value={newOverrideClose}
                                                onChange={(e) => setNewOverrideClose(e.target.value)}
                                                disabled={newOverrideIsClosed}
                                                className="bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newOverrideIsClosed}
                                                onChange={(e) => setNewOverrideIsClosed(e.target.checked)}
                                                className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-[11px] font-bold text-indigo-700">Tam Gün Kapalı</span>
                                        </label>
                                    </div>
                                    <button
                                        onClick={addOverride}
                                        disabled={!newOverrideDate}
                                        className="h-9 sm:h-10 px-6 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase tracking-tighter hover:bg-indigo-700 disabled:opacity-40 transition-all w-full sm:w-auto"
                                    >
                                        Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Exception List */}
                            <div className="space-y-2">
                                <h5 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tanımlı İstisnalar</h5>
                                {localOverrides.length === 0 ? (
                                    <div className="py-6 sm:py-8 text-center bg-slate-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-100">
                                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium italic">İstisna bulunmuyor.</p>
                                    </div>
                                ) : (
                                    localOverrides.map((ov) => (
                                        <div key={ov.date} className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-white group hover:border-indigo-100 transition-all">
                                            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate tracking-tight">
                                                        {new Date(ov.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', weekday: 'short' })}
                                                    </span>
                                                    {ov.note && <span className="text-[9px] sm:text-[10px] text-indigo-600 font-bold truncate">{ov.note}</span>}
                                                </div>
                                                <div className="h-5 w-px bg-slate-100 shrink-0" />
                                                <span className={`text-[9px] font-black py-0.5 px-2 rounded-lg shrink-0 ${ov.is_closed ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {ov.is_closed ? 'KAPALI' : `${ov.open}-${ov.close}`}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeOverride(ov.date)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 shrink-0 transition-all"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center gap-4 sm:justify-between sticky bottom-0 z-20">
                    <p className="hidden sm:block text-[11px] text-slate-400 max-w-[300px] leading-relaxed italic">
                        * Kaydedilen değişiklikler anında takvime yansır.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none h-11 px-6 rounded-xl sm:rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-600 bg-white"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-[2] sm:flex-none h-11 px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-xs sm:text-sm font-black text-white shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
