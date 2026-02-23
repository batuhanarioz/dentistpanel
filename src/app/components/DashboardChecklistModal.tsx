"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

type TaskDefinition = {
    id: string;
    code: string;
    title: string;
    description: string;
    default_role: string;
};

type TaskConfig = {
    task_definition_id: string;
    assigned_role: string;
    is_enabled: boolean;
};

interface DashboardChecklistModalProps {
    open: boolean;
    onClose: () => void;
}

export function DashboardChecklistModal({ open, onClose }: DashboardChecklistModalProps) {
    const clinic = useClinic();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [configs, setConfigs] = useState<Record<string, TaskConfig>>({});

    useEffect(() => {
        if (!open || !clinic.clinicId) return;

        const loadSettings = async () => {
            setLoading(true);
            setError(null);

            try {
                const [defsRes, configsRes] = await Promise.all([
                    supabase.from("dashboard_task_definitions").select("*"),
                    supabase.from("clinic_task_configs").select("*").eq("clinic_id", clinic.clinicId)
                ]);

                if (defsRes.error) {
                    setError(`Görev tanımları yüklenemedi: ${defsRes.error.message}`);
                    setLoading(false);
                    return;
                }

                if (configsRes.error) {
                    setError(`Ayarlar yüklenemedi: ${configsRes.error.message}`);
                    setLoading(false);
                    return;
                }

                setTaskDefs(defsRes.data || []);

                const configMap: Record<string, TaskConfig> = {};
                (configsRes.data || []).forEach(c => {
                    configMap[c.task_definition_id] = c;
                });
                setConfigs(configMap);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu";
                console.error("DashboardChecklistModal load error:", err);
                setError("Beklenmedik bir hata oluştu: " + errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [open, clinic.clinicId]);

    const handleToggleTask = (defId: string) => {
        setConfigs(prev => ({
            ...prev,
            [defId]: {
                ...prev[defId],
                task_definition_id: defId,
                is_enabled: prev[defId] ? !prev[defId].is_enabled : false,
                assigned_role: prev[defId]?.assigned_role || taskDefs.find(d => d.id === defId)?.default_role || UserRole.SEKRETER
            }
        }));
    };

    const handleRoleChange = (defId: string, role: string) => {
        setConfigs(prev => ({
            ...prev,
            [defId]: {
                ...prev[defId],
                task_definition_id: defId,
                assigned_role: role,
                is_enabled: prev[defId] ? prev[defId].is_enabled : true
            }
        }));
    };

    const saveSettings = async () => {
        if (!clinic.clinicId) return;
        setSaving(true);
        setError(null);
        setMessage(null);

        const upsertData = Object.values(configs).map(c => ({
            ...c,
            clinic_id: clinic.clinicId
        }));

        const { error: upsertError } = await supabase
            .from("clinic_task_configs")
            .upsert(upsertData, { onConflict: "clinic_id, task_definition_id" });

        if (upsertError) {
            setError("Ayarlar kaydedilemedi: " + upsertError.message);
        } else {
            setMessage("Ayarlar başarıyla kaydedildi.");
            setTimeout(() => {
                setMessage(null);
                onClose();
            }, 1500);
        }
        setSaving(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div
                className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Dashboard Kontrol Listesi</h2>
                            <p className="text-xs text-slate-500">Hangi görevlerin kime atanacağını ve görünürlüğünü belirleyin.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            {taskDefs.map((def) => {
                                const config = configs[def.id] || {
                                    task_definition_id: def.id,
                                    assigned_role: def.default_role,
                                    is_enabled: true
                                };

                                return (
                                    <div key={def.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${config.is_enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`mt-1 flex h-2 w-2 rounded-full shrink-0 ${config.is_enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">{def.title}</h3>
                                                <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">{def.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atanan Rol</label>
                                                <select
                                                    value={config.assigned_role}
                                                    onChange={(e) => handleRoleChange(def.id, e.target.value)}
                                                    disabled={!config.is_enabled}
                                                    className="text-xs rounded-lg border-slate-200 bg-white px-2 py-1.5 focus:ring-2 focus:ring-teal-500/20"
                                                >
                                                    <option value={UserRole.ADMIN}>ADMIN</option>
                                                    <option value={UserRole.DOKTOR}>DOKTOR</option>
                                                    <option value={UserRole.SEKRETER}>SEKRETER</option>
                                                    <option value={UserRole.FINANS}>FİNANS</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1 items-end">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durum</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleTask(def.id)}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.is_enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.is_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 mt-2">
                                <div className="flex gap-3">
                                    <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        <strong>Bilgi:</strong> Dashboard kontrol listesi, klinikteki süreçlerin aksamaması için otomatik hatırlatıcılar içerir. <strong>ADMIN</strong> rolü her zaman tüm maddeleri görebilir.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 border-t bg-slate-50/50 flex items-center justify-between">
                    <div>
                        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                        {message && <p className="text-xs text-emerald-600 font-medium">{message}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={saveSettings}
                            disabled={saving || loading}
                            className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
