"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { UserRole, DayOfWeek, DaySchedule, ClinicSettings, WorkingHours } from "@/types/database";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";
import { updateClinicSettings, getTreatmentDefinitions, upsertTreatmentDefinition, deleteTreatmentDefinition } from "@/lib/api";
import { PremiumDatePicker } from "../PremiumDatePicker";
import { localDateStr } from "@/lib/dateUtils";
import { TreatmentDefinition } from "@/types/database";

const PLACEHOLDERS = [
    { key: "{patient_name}", label: "Hasta Adı" },
    { key: "{appointment_time}", label: "Randevu Saati" },
    { key: "{amount}", label: "Ödeme Tutarı" },
    { key: "{clinic_name}", label: "Klinik Adı" }
];

type MessageType = "REMINDER" | "SATISFACTION" | "PAYMENT";
type SubSection = "general" | "checklist" | "assistant" | "treatments" | "channels";

type TaskDefinition = {
    id: string;
    code: string;
    title: string;
    description: string;
};

type TaskRole = {
    definition_id: string;
    role: UserRole;
};

interface WorkingHoursOverride {
    date: string;
    open: string;
    close: string;
    is_closed: boolean;
    note?: string;
}

export function ClinicSettingsTab() {
    const clinic = useClinic();
    const [activeSub, setActiveSub] = useState<SubSection>("assistant");
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Assistant Settings State
    const [localSettings, setLocalSettings] = useState<ClinicSettings | null>(clinic.clinicSettings);
    const [activeMessage, setActiveMessage] = useState<MessageType>("REMINDER");

    // Checklist State
    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [clinicRoles, setClinicRoles] = useState<TaskRole[]>([]);
    const [checklistLoading, setChecklistLoading] = useState(false);

    // General (Working Hours) State
    const [activeGeneralTab, setActiveGeneralTab] = useState<"standard" | "exceptions">("standard");
    const [localHours, setLocalHours] = useState<WorkingHours>(clinic.workingHours);
    const [localOverrides, setLocalOverrides] = useState<WorkingHoursOverride[]>(clinic.workingHoursOverrides || []);
    const [newOverrideDate, setNewOverrideDate] = useState(() => localDateStr());
    const [newOverrideEndDate, setNewOverrideEndDate] = useState(() => localDateStr());
    const [newOverrideOpen, setNewOverrideOpen] = useState("09:00");
    const [newOverrideClose, setNewOverrideClose] = useState("19:00");
    const [isRangeMode, setIsRangeMode] = useState(false);
    const [isFullDayOverride, setIsFullDayOverride] = useState(true);
    const [newOverrideNote, setNewOverrideNote] = useState("");

    // Treatment State
    const [treatmentDefinitions, setTreatmentDefinitions] = useState<TreatmentDefinition[]>([]);
    const [newTreatmentName, setNewTreatmentName] = useState("");
    const [newTreatmentDuration, setNewTreatmentDuration] = useState(30);
    const [isTreatmentsLoading, setIsTreatmentsLoading] = useState(false);

    // Channel State
    const [channels, setChannels] = useState<string[]>(clinic.clinicSettings?.appointment_channels ?? []);
    const [newChannelName, setNewChannelName] = useState("");

    useEffect(() => {
        if (clinic.clinicSettings) {
            setLocalSettings(clinic.clinicSettings);
            setChannels(clinic.clinicSettings.appointment_channels ?? []);
        }
    }, [clinic.clinicSettings]);

    useEffect(() => {
        setLocalHours(clinic.workingHours);
        setLocalOverrides(clinic.workingHoursOverrides || []);
    }, [clinic.workingHours, clinic.workingHoursOverrides]);

    useEffect(() => {
        if (activeSub === "checklist" && clinic.clinicId) {
            loadChecklistSettings();
        } else if (activeSub === "treatments" && clinic.clinicId) {
            loadTreatmentSettings();
        }
    }, [activeSub, clinic.clinicId]);

    const loadChecklistSettings = async () => {
        if (!clinic.clinicId) return;
        setChecklistLoading(true);
        try {
            const [defsRes, rolesRes] = await Promise.all([
                supabase.from("checklist_definitions").select("id, code, title, description"),
                supabase.from("checklist_clinic_roles").select("definition_id, role").eq("clinic_id", clinic.clinicId)
            ]);
            setTaskDefs(defsRes.data || []);
            setClinicRoles(rolesRes.data || []);
        } catch (err: unknown) {
            console.error("Load error:", err);
        } finally {
            setChecklistLoading(false);
        }
    };

    const loadTreatmentSettings = async () => {
        if (!clinic.clinicId) return;
        setIsTreatmentsLoading(true);
        try {
            const data = await getTreatmentDefinitions(clinic.clinicId);
            setTreatmentDefinitions(data);
        } finally {
            setIsTreatmentsLoading(false);
        }
    };

    const handleSaveTreatment = async () => {
        if (!clinic.clinicId || !newTreatmentName) return;
        setIsLoading(true);
        try {
            const { error } = await upsertTreatmentDefinition(clinic.clinicId, {
                name: newTreatmentName,
                default_duration: newTreatmentDuration
            });
            if (error) throw error;
            setNewTreatmentName("");
            setNewTreatmentDuration(30);
            await loadTreatmentSettings();
            setSaveMessage({ type: 'success', text: "Tedavi başarıyla eklendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTreatment = async (id: string) => {
        if (!confirm("Bu tedavi türünü silmek istediğinize emin misiniz?")) return;
        setIsLoading(true);
        try {
            const { error } = await deleteTreatmentDefinition(id, clinic.clinicId!);
            if (error) throw error;
            await loadTreatmentSettings();
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Silme sırasında hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAssistant = async () => {
        if (!clinic.clinicId || !localSettings) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            // appointment_channels'ı channels state'inden al — localSettings'teki eski değeri ezmesin
            const { error } = await updateClinicSettings(clinic.clinicId, { ...localSettings, appointment_channels: channels });
            if (error) {
                setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
            } else {
                setSaveMessage({ type: 'success', text: "Ayarlar başarıyla kaydedildi." });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch {
            setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddChannel = () => {
        const name = newChannelName.trim();
        if (!name) return;
        if (channels.includes(name)) return;
        setChannels(prev => [...prev, name]);
        setNewChannelName("");
    };

    const handleDeleteChannel = (name: string) => {
        setChannels(prev => prev.filter(c => c !== name));
    };

    const handleSaveChannels = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const { error } = await updateClinicSettings(clinic.clinicId, { appointment_channels: channels } as Partial<ClinicSettings>);
            if (error) {
                setSaveMessage({ type: 'error', text: "Kanal ayarları kaydedilemedi." });
            } else {
                setSaveMessage({ type: 'success', text: "Kanal ayarları kaydedildi." });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch {
            setSaveMessage({ type: 'error', text: "Kanal ayarları kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    const updateMessageTemplate = (type: MessageType, text: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            message_templates: {
                ...localSettings.message_templates,
                [type]: text
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateTiming = (type: MessageType, field: string, value: any) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            assistant_timings: {
                ...localSettings.assistant_timings,
                [type]: {
                    ...localSettings.assistant_timings[type],
                    [field]: value
                }
            }
        });
    };

    const toggleEnabled = (field: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            notification_settings: {
                ...localSettings.notification_settings,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [(field as any)]: !((localSettings.notification_settings as any)[field])
            }
        });
    };

    const renderPreview = (text: string) => {
        let preview = text;
        preview = preview.replace(/{patient_name}/g, "Zeynep Arslan");
        preview = preview.replace(/{appointment_time}/g, "14:30");
        preview = preview.replace(/{amount}/g, "1.250");
        preview = preview.replace(/{clinic_name}/g, clinic.clinicName || "Klinik");
        return preview;
    };

    const handleToggleRole = (defId: string, role: UserRole) => {
        setClinicRoles(prev => {
            const exists = prev.find(r => r.definition_id === defId && r.role === role);
            if (exists) {
                return prev.filter(r => !(r.definition_id === defId && r.role === role));
            } else {
                return [...prev, { definition_id: defId, role }];
            }
        });
    };

    const isRoleSelected = (defId: string, role: UserRole) => {
        return clinicRoles.some(r => r.definition_id === defId && r.role === role);
    };

    const handleSaveChecklist = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            await supabase.from("checklist_clinic_roles").delete().eq("clinic_id", clinic.clinicId);
            if (clinicRoles.length > 0) {
                await supabase.from("checklist_clinic_roles").insert(clinicRoles.map(r => ({ ...r, clinic_id: clinic.clinicId })));
            }
            setSaveMessage({ type: 'success', text: "Görev ayarları başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

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

        setNewOverrideDate("");
        setNewOverrideEndDate("");
        setNewOverrideNote("");
    };

    const removeOverride = (date: string) => {
        setLocalOverrides(prev => prev.filter(o => o.date !== date));
    };

    const handleSaveGeneral = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({
                    working_hours: localHours,
                    working_hours_overrides: localOverrides
                })
                .eq("id", clinic.clinicId);

            if (error) throw error;
            setSaveMessage({ type: 'success', text: "Çalışma saatleri başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 shrink-0">
                <div className="bg-white rounded-3xl border border-slate-200/60 p-2 shadow-sm sticky top-24">
                    <button
                        onClick={() => setActiveSub("assistant")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${activeSub === "assistant"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'assistant' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 4.99 4.99 0 0 1 .63-1.536C3.908 17.204 3 15.204 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        </div>
                        <span>Akıllı Asistan</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("checklist")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "checklist"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'checklist' ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <span>Görev Ayarları</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("general")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "general"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'general' ? 'bg-white/20' : 'bg-slate-50 text-slate-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <span>Çalışma Saatleri</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("treatments")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "treatments"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'treatments' ? 'bg-white/20' : 'bg-teal-50 text-teal-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                            </svg>
                        </div>
                        <span>Tedavi Ayarları</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("channels")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "channels"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'channels' ? 'bg-white/20' : 'bg-sky-50 text-sky-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>
                        </div>
                        <span>Kanal Yönetimi</span>
                    </button>
                </div>
            </aside >

            {/* Main Content Area */}
            < main className="flex-1" >
                {activeSub === "assistant" && localSettings && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Akıllı Mesaj Asistanı</h2>
                                    <p className="text-sm text-slate-500 font-medium italic">Otomatik mesajları ve zamanlamaları özelleştirin.</p>
                                </div>
                                <button
                                    onClick={handleSaveAssistant}
                                    disabled={isLoading}
                                    className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                    Ayarları Kaydet
                                </button>
                            </div>

                            {saveMessage && (
                                <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                                    }`}>
                                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {saveMessage.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                <div className="space-y-10">
                                    {/* Tab Buttons for Message Types */}
                                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
                                        {(["REMINDER", "SATISFACTION", "PAYMENT"] as MessageType[]).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setActiveMessage(type)}
                                                className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeMessage === type
                                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                                                    : "text-slate-400 hover:text-slate-600"
                                                    }`}
                                            >
                                                {type === 'REMINDER' ? 'Hatırlatma' : type === 'SATISFACTION' ? 'Memnuniyet' : 'Ödeme'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Settings for Active Message */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">Bu Bildirim Aktif Olsun</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Açık olduğunda asistan ve bildirimlerde görünür.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    checked={(localSettings.notification_settings as any)[`is_${activeMessage.toLowerCase()}_enabled`]}
                                                    onChange={() => toggleEnabled(`is_${activeMessage.toLowerCase()}_enabled`)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                Zamanlama Ayarı
                                            </h4>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <input
                                                        type="number"
                                                        value={localSettings.assistant_timings[activeMessage].value}
                                                        onChange={(e) => updateTiming(activeMessage, 'value', parseInt(e.target.value))}
                                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="flex-[2]">
                                                    <select
                                                        value={localSettings.assistant_timings[activeMessage].unit}
                                                        onChange={(e) => updateTiming(activeMessage, 'unit', e.target.value)}
                                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                                    >
                                                        <option value="minutes">Dakika</option>
                                                        <option value="hours">Saat</option>
                                                        <option value="days">Gün</option>
                                                    </select>
                                                </div>
                                                <span className="text-sm font-bold text-slate-400">
                                                    {activeMessage === 'REMINDER' ? 'Önce' : 'Sonra'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                Mesaj Taslağı
                                            </h4>
                                            <div className="relative group">
                                                <textarea
                                                    value={localSettings.message_templates[activeMessage]}
                                                    onChange={(e) => updateMessageTemplate(activeMessage, e.target.value)}
                                                    rows={6}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-sm font-medium leading-relaxed text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none italic shadow-inner"
                                                    placeholder="Mesajınızı yazın..."
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {PLACEHOLDERS.map(p => (
                                                    <button
                                                        key={p.key}
                                                        onClick={() => updateMessageTemplate(activeMessage, localSettings.message_templates[activeMessage] + " " + p.key)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-tighter hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100/50"
                                                    >
                                                        {p.label} {p.key}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Area */}
                                <div className="hidden xl:flex flex-col items-center">
                                    <div className="relative w-72 h-[580px] bg-slate-900 rounded-[45px] p-3 shadow-2xl ring-8 ring-slate-800">
                                        {/* Phone Header */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-20 flex items-center justify-center">
                                            <div className="w-10 h-1 bg-slate-800 rounded-full" />
                                        </div>

                                        <div className="w-full h-full bg-[#E5DDD5] rounded-[35px] overflow-hidden flex flex-col relative border-4 border-slate-900">
                                            {/* WhatsApp Header */}
                                            <div className="bg-[#075E54] p-4 pt-8 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/20 rounded-full" />
                                                <div>
                                                    <p className="text-white text-xs font-bold">{clinic.clinicName}</p>
                                                    <p className="text-white/70 text-[8px]">WhatsApp İşletme Hesabı</p>
                                                </div>
                                            </div>

                                            {/* Messages Content */}
                                            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] relative">
                                                    <p className="text-[11px] leading-relaxed text-slate-800 font-medium whitespace-pre-wrap italic">
                                                        {renderPreview(localSettings.message_templates[activeMessage])}
                                                    </p>
                                                    <div className="flex justify-end mt-1">
                                                        <span className="text-[8px] text-slate-400 uppercase">10:45 ✓</span>
                                                    </div>
                                                    {/* bubble spike */}
                                                    <div className="absolute -left-2 top-0 w-3 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                                                </div>
                                            </div>

                                            {/* WhatsApp Input Mockup */}
                                            <div className="bg-white/80 backdrop-blur p-2 pb-4 flex items-center gap-2">
                                                <div className="flex-1 h-8 bg-white rounded-full border border-slate-200 px-4 flex items-center">
                                                    <div className="h-1 w-12 bg-slate-100 rounded-full" />
                                                </div>
                                                <div className="w-8 h-8 bg-[#128C7E] rounded-full flex items-center justify-center text-white shadow-lg">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="absolute -bottom-8 text-center w-full text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            CANLI ÖNİZLEME
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {/* Other sub-sections */}
                {
                    activeSub === "checklist" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Görev & Rol Eşleşmeleri</h2>
                                        <p className="text-sm text-slate-500 font-medium italic">Hangi görevlerin hangi ekip üyelerine görüneceğini belirleyin.</p>
                                    </div>
                                    <button
                                        onClick={handleSaveChecklist}
                                        disabled={isLoading || checklistLoading}
                                        className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                                    >
                                        Değişiklikleri Kaydet
                                    </button>
                                </div>

                                {saveMessage && (
                                    <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                        {saveMessage.text}
                                    </div>
                                )}

                                {checklistLoading ? (
                                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {taskDefs.map((def) => (
                                            <div key={def.id} className="p-5 rounded-[24px] border border-slate-100 bg-slate-50/30 space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 flex h-2 w-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 leading-tight">{def.title}</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{def.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                        const selected = isRoleSelected(def.id, role);
                                                        return (
                                                            <button
                                                                key={role}
                                                                onClick={() => handleToggleRole(def.id, role)}
                                                                className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black tracking-widest uppercase transition-all ${selected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                                            >
                                                                {role}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeSub === "general" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Klinik Çalışma Saatleri</h2>
                                        <p className="text-sm text-slate-500 font-medium italic">Haftalık düzen ve özel gün istisnalarını yönetin.</p>
                                    </div>
                                    <button
                                        onClick={handleSaveGeneral}
                                        disabled={isLoading}
                                        className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                                    >
                                        Ayarları Kaydet
                                    </button>
                                </div>

                                <div className="flex gap-4 border-b border-slate-100 mb-8">
                                    <button onClick={() => setActiveGeneralTab("standard")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'standard' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        Haftalık Düzen
                                        {activeGeneralTab === 'standard' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                                    </button>
                                    <button onClick={() => setActiveGeneralTab("exceptions")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'exceptions' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        Özel Günler
                                        {activeGeneralTab === 'exceptions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                                    </button>
                                </div>

                                {activeGeneralTab === "standard" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ORDERED_DAYS.map((day) => (
                                            <div key={day} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                                <span className="w-20 text-[10px] font-black text-slate-700 uppercase tracking-tighter shrink-0">{DAY_LABELS[day]}</span>
                                                <div className="flex items-center gap-2">
                                                    <input type="time" value={localHours[day].open} onChange={(e) => handleUpdateStandard(day, "open", e.target.value)} disabled={!localHours[day].enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                    <span className="text-slate-400">-</span>
                                                    <input type="time" value={localHours[day].close} onChange={(e) => handleUpdateStandard(day, "close", e.target.value)} disabled={!localHours[day].enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-auto">
                                                    <input type="checkbox" className="sr-only peer" checked={localHours[day].enabled} onChange={(e) => handleUpdateStandard(day, "enabled", e.target.checked)} />
                                                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
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
                                                    <PremiumDatePicker
                                                        value={newOverrideDate}
                                                        onChange={setNewOverrideDate}
                                                        compact
                                                    />
                                                </div>
                                                {isRangeMode && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bitiş</label>
                                                        <PremiumDatePicker
                                                            value={newOverrideEndDate}
                                                            onChange={setNewOverrideEndDate}
                                                            compact
                                                        />
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
                    )
                }
                {
                    activeSub === "treatments" && (
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Tedavi Türleri ve Süreleri</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Randevu alırken kullanılan işlem türlerini yönetin.</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
                                        Yeni Tedavi Ekle
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tedavi Adı</label>
                                            <input
                                                type="text"
                                                placeholder="Örn: Kanal Tedavisi"
                                                value={newTreatmentName}
                                                onChange={(e) => setNewTreatmentName(e.target.value)}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Varsayılan Süre (Dakika)</label>
                                            <input
                                                type="number"
                                                value={newTreatmentDuration}
                                                onChange={(e) => setNewTreatmentDuration(parseInt(e.target.value))}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleSaveTreatment}
                                                disabled={isLoading || !newTreatmentName}
                                                className="w-full h-[52px] bg-gradient-to-r from-teal-600 to-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:shadow-teal-200 transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Ekle
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {isTreatmentsLoading ? (
                                        <div className="col-span-full py-12 flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                                        </div>
                                    ) : treatmentDefinitions.map((td) => (
                                        <div key={td.id} className="group relative p-6 rounded-[32px] border border-slate-100 bg-white hover:border-teal-200 transition-all shadow-sm hover:shadow-md">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-900">{td.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">İşlem Türü</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteTreatment(td.id)}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                    </svg>
                                                    <span className="text-[11px] font-black uppercase tracking-tighter">{td.default_duration} Dakika</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {!isTreatmentsLoading && treatmentDefinitions.length === 0 && (
                                        <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                                            <p className="text-xs font-bold text-slate-400 italic">Henüz özel bir tedavi türü tanımlanmamış.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {activeSub === "channels" && (
                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Kanal Yönetimi</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Randevularda kullanılacak kanalları tanımlayın.</p>
                            </div>
                            <button
                                onClick={handleSaveChannels}
                                disabled={isLoading}
                                className="h-11 px-6 bg-gradient-to-r from-sky-600 to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-sky-100 hover:shadow-sky-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isLoading ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Yeni kanal ekle */}
                            <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
                                    Yeni Kanal Ekle
                                </h4>
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="Örn: WhatsApp, Telefon, Instagram..."
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChannel(); } }}
                                        className="flex-1 h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                                    />
                                    <button
                                        onClick={handleAddChannel}
                                        disabled={!newChannelName.trim()}
                                        className="h-[52px] px-8 bg-gradient-to-r from-sky-600 to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-sky-100 hover:shadow-sky-200 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Mevcut kanallar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {channels.length === 0 ? (
                                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                                        <p className="text-xs font-bold text-slate-400 italic">Henüz kanal tanımlanmamış. Randevular &quot;Belirtilmedi&quot; olarak görünür.</p>
                                    </div>
                                ) : channels.map((ch) => (
                                    <div key={ch} className="group relative p-5 rounded-[24px] border border-slate-100 bg-white hover:border-sky-200 transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-900">{ch}</span>
                                        <button
                                            onClick={() => handleDeleteChannel(ch)}
                                            className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {saveMessage && (
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                    {saveMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main >
        </div >
    );
}
