"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { DayOfWeek, DaySchedule, WorkingHours } from "@/types/database";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";
import { PremiumDatePicker } from "../../PremiumDatePicker";
import { localDateStr } from "@/lib/dateUtils";

interface WorkingHoursOverride {
    date: string;
    open: string;
    close: string;
    is_closed: boolean;
    note?: string;
}

const TURKEY_2026_HOLIDAYS: { date: string; note: string }[] = [
    { date: "2026-01-01", note: "Yılbaşı" },
    { date: "2026-04-23", note: "Ulusal Egemenlik ve Çocuk Bayramı" },
    { date: "2026-05-01", note: "Emek ve Dayanışma Günü" },
    { date: "2026-05-19", note: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
    { date: "2026-07-15", note: "Demokrasi ve Millî Birlik Günü" },
    { date: "2026-08-30", note: "Zafer Bayramı" },
    { date: "2026-10-28", note: "Cumhuriyet Bayramı (yarım gün)" },
    { date: "2026-10-29", note: "Cumhuriyet Bayramı" },
    { date: "2026-03-21", note: "Ramazan Bayramı 1. Gün" },
    { date: "2026-03-22", note: "Ramazan Bayramı 2. Gün" },
    { date: "2026-03-23", note: "Ramazan Bayramı 3. Gün" },
    { date: "2026-05-28", note: "Kurban Bayramı Arifesi (yarım gün)" },
    { date: "2026-05-29", note: "Kurban Bayramı 1. Gün" },
    { date: "2026-05-30", note: "Kurban Bayramı 2. Gün" },
    { date: "2026-05-31", note: "Kurban Bayramı 3. Gün" },
    { date: "2026-06-01", note: "Kurban Bayramı 4. Gün" },
];

export function WorkingHoursSettings() {
    const { clinicId, workingHours, workingHoursOverrides, refreshClinicData } = useClinic();
    const [activeGeneralTab, setActiveGeneralTab] = useState<"standard" | "exceptions">("standard");
    const [localHours, setLocalHours] = useState<WorkingHours>(workingHours);
    const [localOverrides, setLocalOverrides] = useState<WorkingHoursOverride[]>(workingHoursOverrides || []);
    const [newOverrideDate, setNewOverrideDate] = useState(() => localDateStr());
    const [newOverrideEndDate, setNewOverrideEndDate] = useState(() => localDateStr());
    const [newOverrideOpen, setNewOverrideOpen] = useState("09:00");
    const [newOverrideClose, setNewOverrideClose] = useState("19:00");
    const [isRangeMode, setIsRangeMode] = useState(false);
    const [isFullDayOverride, setIsFullDayOverride] = useState(true);
    const [newOverrideNote, setNewOverrideNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setLocalHours(workingHours);
        setLocalOverrides(workingHoursOverrides || []);
    }, [workingHours, workingHoursOverrides]);

    const handleUpdateStandard = (day: DayOfWeek, field: keyof DaySchedule, value: string | boolean) => {
        setLocalHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const addOverride = () => {
        if (!newOverrideDate) return;
        const datesToAdd: string[] = [];
        if (isRangeMode && newOverrideEndDate) {
            // eslint-disable-next-line prefer-const
            let current = new Date(newOverrideDate);
            const end = new Date(newOverrideEndDate);
            while (current <= end) {
                datesToAdd.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        } else {
            datesToAdd.push(newOverrideDate);
        }
        const newEntries = datesToAdd.map(date => ({
            date,
            open: isFullDayOverride ? "00:00" : newOverrideOpen,
            close: isFullDayOverride ? "23:59" : newOverrideClose,
            is_closed: isFullDayOverride,
            note: newOverrideNote
        }));
        setLocalOverrides(prev => {
            const filtered = prev.filter(p => !datesToAdd.includes(p.date));
            return [...filtered, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
        });
        setNewOverrideDate(localDateStr());
        setNewOverrideEndDate(localDateStr());
        setNewOverrideNote("");
    };

    const removeOverride = (date: string) => {
        setLocalOverrides(prev => prev.filter(o => o.date !== date));
    };

    const handleAddOfficialHolidays = async () => {
        if (!clinicId) return;
        const newEntries = TURKEY_2026_HOLIDAYS
            .filter(h => !localOverrides.some(o => o.date === h.date))
            .map(h => ({ date: h.date, open: "00:00", close: "23:59", is_closed: true, note: h.note }));
        if (newEntries.length === 0) {
            setSaveMessage({ type: "success", text: "Tüm 2026 resmi tatilleri zaten eklenmiş." });
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }
        const updatedOverrides = [...localOverrides, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
        setLocalOverrides(updatedOverrides);
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({ working_hours: localHours, working_hours_overrides: updatedOverrides })
                .eq("id", clinicId);
            if (error) throw error;
            await refreshClinicData();
            setSaveMessage({ type: "success", text: `${newEntries.length} resmi tatil eklendi ve kaydedildi.` });
        } catch {
            setSaveMessage({ type: "error", text: "Tatiller eklenemedi." });
        } finally {
            setIsLoading(false);
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    const handleSaveGeneral = async () => {
        if (!clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({ working_hours: localHours, working_hours_overrides: localOverrides })
                .eq("id", clinicId);
            if (error) throw error;
            await refreshClinicData();
            setSaveMessage({ type: 'success', text: "Çalışma saatleri başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Klinik Çalışma Saatleri</h2>
                        <p className="text-sm text-slate-500 font-medium italic">Haftalık düzen ve özel gün istisnalarını yönetin.</p>
                    </div>
                    <div className="hidden lg:block">
                        <button
                            onClick={handleSaveGeneral}
                            disabled={isLoading}
                            className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                        >
                            Ayarları Kaydet
                        </button>
                    </div>
                </div>

                {/* Mobile Fixed Save Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                    <button
                        onClick={handleSaveGeneral}
                        disabled={isLoading}
                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        ÇALIŞMA SAATLERİNİ KAYDET
                    </button>
                </div>

                <div className="flex gap-4 border-b border-slate-100 mb-6">
                    <button onClick={() => setActiveGeneralTab("standard")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'standard' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        Haftalık Düzen
                        {activeGeneralTab === 'standard' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                    <button onClick={() => setActiveGeneralTab("exceptions")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'exceptions' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        Özel Günler
                        {activeGeneralTab === 'exceptions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                </div>

                {saveMessage && (
                    <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                        {saveMessage.type === 'success' ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                        )}
                        {saveMessage.text}
                    </div>
                )}

                {activeGeneralTab === "standard" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ORDERED_DAYS.map((day) => (
                            <div key={day} className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 ${localHours[day].enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${localHours[day].enabled ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${localHours[day].enabled ? 'text-slate-900' : 'text-slate-400'}`}>{DAY_LABELS[day]}</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={localHours[day].enabled} onChange={(e) => handleUpdateStandard(day, "enabled", e.target.checked)} />
                                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Mesai Saatleri */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Mesai
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <input type="time" value={localHours[day].open} onChange={(e) => handleUpdateStandard(day, "open", e.target.value)} disabled={!localHours[day].enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                            <span className="text-slate-300 font-bold">-</span>
                                            <input type="time" value={localHours[day].close} onChange={(e) => handleUpdateStandard(day, "close", e.target.value)} disabled={!localHours[day].enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                        </div>
                                    </div>

                                    {/* Mola Saatleri */}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center justify-between gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-9.75 0h9.75" /></svg>
                                                Mola (Opsiyonel)
                                            </div>
                                            {(localHours[day].lunch_start || localHours[day].lunch_end) && (
                                                <button 
                                                    onClick={() => { handleUpdateStandard(day, "lunch_start", ""); handleUpdateStandard(day, "lunch_end", ""); }}
                                                    className="text-rose-500 hover:text-rose-700 transition-colors"
                                                    title="Molayı Temizle"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <input type="time" value={localHours[day].lunch_start || ""} onChange={(e) => handleUpdateStandard(day, "lunch_start", e.target.value)} disabled={!localHours[day].enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                            <span className="text-slate-300 font-bold">-</span>
                                            <input type="time" value={localHours[day].lunch_end || ""} onChange={(e) => handleUpdateStandard(day, "lunch_end", e.target.value)} disabled={!localHours[day].enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddOfficialHolidays}
                                className="flex items-center gap-2 h-9 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                2026 Resmi Tatillerini Ekle
                            </button>
                        </div>
                        <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner space-y-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                    <button onClick={() => setIsRangeMode(false)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isRangeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Tek Gün</button>
                                    <button onClick={() => setIsRangeMode(true)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isRangeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Aralık</button>
                                </div>
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                    <button onClick={() => setIsFullDayOverride(true)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isFullDayOverride ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Tüm Gün</button>
                                    <button onClick={() => setIsFullDayOverride(false)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isFullDayOverride ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Özel Saatler</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{isRangeMode ? 'Başlangıç' : 'Tarih'}</label>
                                    <PremiumDatePicker value={newOverrideDate} onChange={setNewOverrideDate} compact />
                                </div>
                                {isRangeMode && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bitiş</label>
                                        <PremiumDatePicker value={newOverrideEndDate} onChange={setNewOverrideEndDate} compact />
                                    </div>
                                )}
                                {!isFullDayOverride && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Saat Aralığı</label>
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={newOverrideOpen} onChange={(e) => setNewOverrideOpen(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                            <input type="time" value={newOverrideClose} onChange={(e) => setNewOverrideClose(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                        </div>
                                    </div>
                                )}
                                <div className={`space-y-1.5 ${(!isRangeMode && isFullDayOverride) ? 'md:col-span-2' : ''} ${(isRangeMode && !isFullDayOverride) ? 'md:col-span-1' : ''}`}>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Açıklama</label>
                                    <input type="text" placeholder="Örn: Bayram Tatili" value={newOverrideNote} onChange={(e) => setNewOverrideNote(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={addOverride} className="w-full h-[42px] bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98]">Ekle</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                            {localOverrides.map((ov) => (
                                <div key={ov.date} className="group relative p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900">{new Date(ov.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(ov.date).toLocaleDateString("tr-TR", { weekday: 'long' })}</span>
                                        </div>
                                        <button onClick={() => removeOverride(ov.date)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${ov.is_closed ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {ov.is_closed ? 'Kapalı' : `${ov.open} - ${ov.close}`}
                                        </span>
                                        {ov.note && <span className="text-[10px] text-slate-500 font-medium truncate italic border-l pl-2 border-slate-100">{ov.note}</span>}
                                    </div>
                                </div>
                            ))}
                            {localOverrides.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                    <p className="text-xs font-bold text-slate-400 italic">Henüz özel gün veya istisna eklenmemiş.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
