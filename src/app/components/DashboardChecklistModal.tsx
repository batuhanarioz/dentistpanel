"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

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
    const [clinicRoles, setClinicRoles] = useState<TaskRole[]>([]);

    useEffect(() => {
        if (!open || !clinic.clinicId) return;

        const loadSettings = async () => {
            setLoading(true);
            setError(null);

            try {
                const [defsRes, rolesRes] = await Promise.all([
                    supabase.from("checklist_definitions").select("id, code, title, description"),
                    supabase.from("checklist_clinic_roles").select("definition_id, role").eq("clinic_id", clinic.clinicId)
                ]);

                if (defsRes.error) throw defsRes.error;
                if (rolesRes.error) throw rolesRes.error;

                setTaskDefs(defsRes.data || []);
                setClinicRoles(rolesRes.data || []);
            } catch (err: unknown) {
                console.error("Load error:", err);
                setError("Ayarlar yüklenemedi: " + (err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [open, clinic.clinicId]);

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

    const saveSettings = async () => {
        if (!clinic.clinicId) return;
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            // Önce mevcutları sil, sonra yenileri ekle (basit sync)
            const { error: deleteError } = await supabase
                .from("checklist_clinic_roles")
                .delete()
                .eq("clinic_id", clinic.clinicId);

            if (deleteError) throw deleteError;

            if (clinicRoles.length > 0) {
                const { error: insertError } = await supabase
                    .from("checklist_clinic_roles")
                    .insert(clinicRoles.map(r => ({ ...r, clinic_id: clinic.clinicId })));
                if (insertError) throw insertError;
            }

            setMessage("Ayarlar başarıyla kaydedildi.");
            setTimeout(() => {
                setMessage(null);
                onClose();
            }, 1000);
        } catch (err: unknown) {
            setError("Kaydedilemedi: " + (err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const isRoleSelected = (defId: string, role: UserRole) => {
        return clinicRoles.some(r => r.definition_id === defId && r.role === role);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div
                className="bg-white rounded-2xl shadow-xl border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
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
                            <h2 className="text-base font-bold text-slate-900">Dashboard Kontrol Listesi Ayarları</h2>
                            <p className="text-xs text-slate-500">Hangi görevlerin hangi ekip üyelerine görüneceğini belirleyin.</p>
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
                            {taskDefs.map((def) => (
                                <div key={def.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex h-2 w-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{def.title}</h3>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{def.description}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Görünür Olacak Roller</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                const selected = isRoleSelected(def.id, role);
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => handleToggleRole(def.id, role)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${selected
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className={`h-3.5 w-3.5 rounded flex items-center justify-center border transition-all ${selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                                                            }`}>
                                                            {selected && <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        {role}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 mt-2">
                                <div className="flex gap-3">
                                    <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                        <strong>Bilgi:</strong> Seçilen rollere sahip kullanıcılar dashboard sayfasındaki kontrol listesinde bu görevleri görebilecektir. Boş bırakılan görevler sadece <strong>SUPER_ADMIN</strong> (varsa) tarafından görünür.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 border-t bg-slate-50/50 flex items-center justify-between">
                    <div>
                        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
                        {message && <p className="text-xs text-emerald-600 font-bold">{message}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={saveSettings}
                            disabled={saving || loading}
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                        >
                            {saving ? (
                                <div className="flex items-center gap-2">
                                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Kaydediliyor...
                                </div>
                            ) : "Ayarları Kaydet"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
