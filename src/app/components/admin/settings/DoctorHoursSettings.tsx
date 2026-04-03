"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { UserRole, DayOfWeek, WorkingHours } from "@/types/database";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";

type DoctorUser = { id: string; full_name: string; role: string };

export function DoctorHoursSettings() {
    const { clinicId, workingHours } = useClinic();
    const [doctorList, setDoctorList] = useState<DoctorUser[]>([]);
    const [doctorSchedules, setDoctorSchedules] = useState<Record<string, WorkingHours>>({});
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [doctorHoursLoading, setDoctorHoursLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'hours' | 'treatments'>('hours');
    const [doctorTreatments, setDoctorTreatments] = useState<Record<string, string[]>>({});
    const [treatmentDefinitions, setTreatmentDefinitions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (clinicId) {
            loadDoctorHours();
            loadTreatments();
        }
    }, [clinicId]);

    const loadDoctorHours = async () => {
        if (!clinicId) return;
        setDoctorHoursLoading(true);
        try {
            // En güvenli yöntem: Gerekli tüm kolonları isteyelim
            // Eğer bir kolon (mesela allowed_treatments) veritabanında yoksa, 
            // supabase error vereceği için biz önce en temel kolonları alıp 
            // ardından opsiyonel olanları deneyeceğiz.
            
            const { data: usersRes, error: usersErr } = await supabase.from("users")
                .select("id, full_name, role, is_clinical_provider, working_hours, allowed_treatments, specialty_code")
                .eq("clinic_id", clinicId);

            let rawUsers: any[] | null = usersRes;

            if (usersErr) {
                // Eğer hata 'allowed_treatments' kolonunun yokluğundansa, onsuz dene
                if (usersErr.code === '42703') {
                    const { data: retryRes, error: retryErr } = await supabase.from("users")
                        .select("id, full_name, role, is_clinical_provider, working_hours, specialty_code")
                        .eq("clinic_id", clinicId);
                    if (retryErr) throw new Error(retryErr.message);
                    rawUsers = retryRes;
                } else {
                    throw new Error(usersErr.message);
                }
            }

            if (!rawUsers) return;

            // Filtreleme: Yalnızca hekimler veya klinik sağlayıcılar
            const clinicians = rawUsers.filter((u: any) => 
                u.role === UserRole.DOKTOR || u.is_clinical_provider === true
            );

            setDoctorList(clinicians);
            
            const schedMap: Record<string, WorkingHours> = {};
            const treatMap: Record<string, string[]> = {};
            
            for (const u of clinicians) {
                if (u.working_hours) {
                    schedMap[u.id] = u.working_hours as WorkingHours;
                }
                treatMap[u.id] = (u as any).allowed_treatments || [];
            }
            
            setDoctorSchedules(schedMap);
            setDoctorTreatments(treatMap);
            
            if (clinicians.length && !selectedDoctorId) {
                setSelectedDoctorId(clinicians[0].id);
            }
        } catch (err: any) {
            console.error("Hekim verileri yüklenirken kritik hata:", err);
            setSaveMessage({ type: 'error', text: typeof err === 'string' ? err : (err.message || "Veri yüklenemedi") });
        } finally {
            setDoctorHoursLoading(false);
        }
    };

    const loadTreatments = async () => {
        if (!clinicId) return;
        try {
            const { data, error } = await supabase.from("treatment_definitions").select("*").eq("clinic_id", clinicId).order("name");
            if (error) throw new Error(error.message);
            setTreatmentDefinitions(data || []);
        } catch (err: any) {
            console.error("Tedavi türleri yüklenemedi:", err);
        }
    };

    const loadClinicData = loadDoctorHours; // Aliasing for clarity in save hook


    const handleSaveDoctorHours = async (doctorId: string) => {
        if (!clinicId) return;
        setIsLoading(true);
        try {
            const hours = doctorSchedules[doctorId] ?? {};
            const treatments = doctorTreatments[doctorId] || [];
            const { error } = await supabase
                .from("users")
                .update({
                    working_hours: hours,
                    allowed_treatments: treatments,
                    specialty_code: (doctorList.find(d => d.id === doctorId) as any)?.specialty_code || null
                })
                .eq("id", doctorId)
                .eq("clinic_id", clinicId);
            if (error) throw error;
            await loadClinicData(); // Reload list to stay in sync
            setSaveMessage({ type: "success", text: "Hekim çalışma saatleri başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: "error", text: "Kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    const updateDoctorHour = (doctorId: string, day: DayOfWeek, field: "open" | "close" | "enabled" | "lunch_start" | "lunch_end", value: string | boolean) => {
        setDoctorSchedules(prev => {
            const current: WorkingHours = prev[doctorId] ?? { ...workingHours };
            return {
                ...prev,
                [doctorId]: {
                    ...current,
                    [day]: { ...current[day], [field]: value },
                },
            };
        });
    };

    const toggleTreatment = (doctorId: string, treatmentId: string) => {
        setDoctorTreatments(prev => {
            const current = prev[doctorId] || [];
            if (current.includes(treatmentId)) {
                return { ...prev, [doctorId]: current.filter(id => id !== treatmentId) };
            } else {
                return { ...prev, [doctorId]: [...current, treatmentId] };
            }
        });
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50">
                <h3 className="text-xl font-black text-slate-900">Hekim Bazlı Müsaitlik</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Her hekim için ayrı çalışma saati tanımlayın.</p>
            </div>

            {saveMessage && (
                <div className={`mx-8 mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                    {saveMessage.type === 'success' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    )}
                    {saveMessage.text}
                </div>
            )}

            {doctorHoursLoading ? (
                <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : doctorList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium italic">Klinikte kayıtlı hekim bulunamadı.</div>
            ) : (
                <div className="p-8 space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {doctorList.map(doc => (
                            <button key={doc.id}
                                onClick={() => setSelectedDoctorId(doc.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedDoctorId === doc.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {doc.full_name}
                            </button>
                        ))}
                    </div>

                    {selectedDoctorId && (() => {
                        const hours: WorkingHours = doctorSchedules[selectedDoctorId] ?? workingHours;
                        const doc = doctorList.find(d => d.id === selectedDoctorId);
                        return (
                            <div className="space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex bg-slate-100 p-1 rounded-xl self-start">
                                        <button
                                            onClick={() => setActiveTab('hours')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'hours' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Haftalık Program
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('treatments')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'treatments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Yapılan Tedaviler
                                        </button>
                                    </div>

                                    {/* Uzmanlık Alanı - Yeni */}
                                    <div className="flex-1 max-w-sm">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={(doctorList.find(d => d.id === selectedDoctorId) as any)?.specialty_code || ""}
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setDoctorList(prev => prev.map(d => d.id === selectedDoctorId ? { ...d, specialty_code: val } : d));
                                                }}
                                                placeholder="Uzmanlık Alanı (Örn: Ortodontist)"
                                                className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-indigo-500 placeholder:text-slate-400 shadow-inner"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden lg:block">
                                        <button
                                            onClick={() => handleSaveDoctorHours(selectedDoctorId)}
                                            disabled={isLoading}
                                            className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                            {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            Kaydet
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Fixed Save Bar */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                                    <button
                                        onClick={() => handleSaveDoctorHours(selectedDoctorId)}
                                        disabled={isLoading}
                                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                        HEKİM TAKVİMİNİ KAYDET
                                    </button>
                                </div>

                                {activeTab === 'hours' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ORDERED_DAYS.map(day => (
                                            <div key={day} className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 ${hours[day]?.enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${hours[day]?.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${hours[day]?.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{DAY_LABELS[day]}</span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={hours[day]?.enabled || false} onChange={(e) => updateDoctorHour(selectedDoctorId, day, "enabled", e.target.checked)} />
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
                                                            <input type="time" value={hours[day]?.open || "09:00"} onChange={(e) => updateDoctorHour(selectedDoctorId, day, "open", e.target.value)} disabled={!hours[day]?.enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                                            <span className="text-slate-300 font-bold">-</span>
                                                            <input type="time" value={hours[day]?.close || "19:00"} onChange={(e) => updateDoctorHour(selectedDoctorId, day, "close", e.target.value)} disabled={!hours[day]?.enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="flex items-center justify-between gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            <div className="flex items-center gap-1.5">
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-9.75 0h9.75" /></svg>
                                                                Mola (Opsiyonel)
                                                            </div>
                                                            {(hours[day]?.lunch_start || hours[day]?.lunch_end) && (
                                                                <button
                                                                    onClick={() => {
                                                                        updateDoctorHour(selectedDoctorId, day, "lunch_start", "");
                                                                        updateDoctorHour(selectedDoctorId, day, "lunch_end", "");
                                                                    }}
                                                                    className="text-rose-500 hover:text-rose-700 transition-colors"
                                                                    title="Molayı Temizle"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            )}
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <input type="time" value={hours[day]?.lunch_start || ""} onChange={(e) => updateDoctorHour(selectedDoctorId, day, "lunch_start", e.target.value)} disabled={!hours[day]?.enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                                            <span className="text-slate-300 font-bold">-</span>
                                                            <input type="time" value={hours[day]?.lunch_end || ""} onChange={(e) => updateDoctorHour(selectedDoctorId, day, "lunch_end", e.target.value)} disabled={!hours[day]?.enabled} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-40 focus:bg-white focus:border-indigo-200 outline-none transition-all" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {treatmentDefinitions.length === 0 ? (
                                                <div className="col-span-full py-12 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Henüz hiçbir tedavi türü tanımlanmamış.</div>
                                            ) : treatmentDefinitions.map((treat: any) => (
                                                <button
                                                    key={treat.id}
                                                    onClick={() => toggleTreatment(selectedDoctorId, treat.id)}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${doctorTreatments[selectedDoctorId]?.includes(treat.id) ? 'bg-white border-indigo-200 shadow-sm' : 'bg-white/50 border-slate-100 opacity-60'}`}
                                                >
                                                    <span className={`text-[11px] font-black uppercase tracking-tight ${doctorTreatments[selectedDoctorId]?.includes(treat.id) ? 'text-slate-900' : 'text-slate-400'}`}>{treat.name}</span>
                                                    <div className={`w-8 h-4 rounded-full transition-all relative ${doctorTreatments[selectedDoctorId]?.includes(treat.id) ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${doctorTreatments[selectedDoctorId]?.includes(treat.id) ? 'right-0.5' : 'left-0.5'}`} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
