"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";
import { updateClinicSettings } from "@/lib/api";

type TaskDefinition = { id: string; code: string; title: string; description: string };
type TaskRole = { definition_id: string; role: UserRole };

export function ChecklistSettings() {
    const clinic = useClinic();
    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [clinicRoles, setClinicRoles] = useState<TaskRole[]>([]);
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [dayCloseRoles, setDayCloseRoles] = useState<string[]>(
        clinic.clinicSettings?.feature_permissions?.day_close_roles ?? []
    );
    const [notifRules, setNotifRules] = useState({
        notify_doctor_on_new_appointment: clinic.clinicSettings?.notification_rules?.notify_doctor_on_new_appointment ?? true,
        notify_roles_on_new_appointment: clinic.clinicSettings?.notification_rules?.notify_roles_on_new_appointment ?? ["ADMIN", "SEKRETER"] as string[],
    });

    useEffect(() => {
        if (clinic.clinicId) loadChecklistSettings();
    }, [clinic.clinicId]);

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

    const handleToggleRole = (defId: string, role: UserRole) => {
        setClinicRoles(prev => {
            const exists = prev.find(r => r.definition_id === defId && r.role === role);
            return exists
                ? prev.filter(r => !(r.definition_id === defId && r.role === role))
                : [...prev, { definition_id: defId, role }];
        });
    };

    const isRoleSelected = (defId: string, role: UserRole) =>
        clinicRoles.some(r => r.definition_id === defId && r.role === role);

    const handleSaveChecklist = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            await supabase.from("checklist_clinic_roles").delete().eq("clinic_id", clinic.clinicId);
            if (clinicRoles.length > 0) {
                await supabase.from("checklist_clinic_roles").insert(clinicRoles.map(r => ({ ...r, clinic_id: clinic.clinicId })));
            }
            const existingPerms = clinic.clinicSettings?.feature_permissions ?? {};
            await updateClinicSettings(clinic.clinicId, {
                ...clinic.clinicSettings!,
                feature_permissions: { ...existingPerms, day_close_roles: dayCloseRoles },
                notification_rules: notifRules
            });
            setSaveMessage({ type: 'success', text: "Görev ve izin ayarları başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const RolePills = ({ defId, activeColor }: { defId: string; activeColor: string }) => (
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
            {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                const active = isRoleSelected(defId, role);
                return (
                    <button
                        key={role}
                        onClick={() => handleToggleRole(defId, role)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${active ? `${activeColor} text-white shadow-md` : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                    >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {role === UserRole.DOKTOR ? "HEKİM" : role}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Görev, Bildirim ve Rol Eşleşmesi</h2>
                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-2xl mt-1">
                            Klinik içerisindeki kritik olayların ve akıllı asistan bildirimlerinin hangi kullanıcı rollerine anlık bildirim olarak düşeceğini buradan yönetebilirsiniz.
                        </p>
                    </div>
                    <div className="hidden lg:block">
                        <button
                            onClick={handleSaveChecklist}
                            disabled={isLoading || checklistLoading}
                            className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                        >
                            Değişiklikleri Kaydet
                        </button>
                    </div>
                </div>

                {/* Mobile Fixed Save Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                    <button
                        onClick={handleSaveChecklist}
                        disabled={isLoading || checklistLoading}
                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading || checklistLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        AYARLARI KAYDET
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
                    <div className="space-y-6">
                        <div className="flex flex-col gap-8">
                            {/* Operasyonel Takip Bildirimleri */}
                            <div className="w-full">
                                <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 w-fit">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Operasyonel Takip Bildirimleri</h3>
                                        <p className="text-[10px] text-slate-500 font-bold tracking-tight max-w-lg leading-relaxed">
                                            Sistem tarafından otomatik üretilen aksaklık ve görev uyarılarının hangi rollere anlık bildirim olarak düşeceğini buradan belirleyin.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {taskDefs.filter(d => !d.code.startsWith('ASSISTANT_') && !['BIRTHDAY', 'DELAY', 'FOLLOWUP', 'INCOMPLETE', 'NEW_PATIENT', 'LAB_TRACKING'].includes(d.code)).map((def) => (
                                        <div key={def.id} className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-indigo-200 rounded-3xl p-5 transition-all shadow-sm">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="mt-0.5 w-10 h-10 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-100">
                                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0 px-1">
                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                            <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase">{def.title}</h3>
                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[100] border border-white/10">
                                                                    <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                        <span className="text-indigo-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5">Bilgilendirme</span>
                                                                        <p className="leading-relaxed text-slate-200">{def.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{def.description}</p>
                                                    </div>
                                                </div>
                                                <RolePills defId={def.id} activeColor="bg-indigo-600 border border-indigo-700" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hasta İletişimi & Asistan Bildirimleri */}
                            <div className="mt-4">
                                <div className="flex items-center gap-3 mb-6 bg-violet-50/50 p-4 rounded-3xl border border-violet-100 w-fit">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Hasta İletişimi & Asistan Bildirimleri</h3>
                                        <p className="text-[10px] text-slate-500 font-bold tracking-tight max-w-lg leading-relaxed">
                                            Hastalara giden otomatik mesajlar hakkında hangi ekip üyelerinin bilgilendirileceğini buradan seçin.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {taskDefs.filter(d => d.code.startsWith('ASSISTANT_') || ['BIRTHDAY', 'DELAY', 'FOLLOWUP', 'INCOMPLETE', 'NEW_PATIENT', 'LAB_TRACKING'].includes(d.code)).map((def) => (
                                        <div key={def.id} className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-violet-200 rounded-3xl p-5 transition-all shadow-sm">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="mt-0.5 w-10 h-10 rounded-2xl bg-violet-50/80 border border-violet-100 flex items-center justify-center shrink-0 shadow-sm shadow-violet-100">
                                                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0 px-1">
                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                            <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase">{def.title}</h3>
                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[100] border border-white/10">
                                                                    <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                        <span className="text-violet-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5">Bilgilendirme</span>
                                                                        <p className="leading-relaxed text-slate-200">{def.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{def.description}</p>
                                                    </div>
                                                </div>
                                                <RolePills defId={def.id} activeColor="bg-violet-600 border border-violet-700" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Anlık Sistemsel Bildirimler */}
                            <div className="w-full mt-4 group isolate relative">
                                <div className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-amber-200 rounded-3xl p-5 transition-all shadow-sm relative bg-white">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400/20 to-transparent rounded-t-3xl" />
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="mt-0.5 w-10 h-10 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm shadow-amber-100">
                                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                            </div>
                                            <div className="flex-1 min-w-0 px-1">
                                                <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase mb-1">Klinik İçi Anlık Sistemsel Bildirimler</h3>
                                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Randevu girişlerinde veya güncellemelerinde anlık bildirim alacak rolleri seçin.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                                            {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                const active = notifRules.notify_roles_on_new_appointment.includes(role);
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => {
                                                            const updated = active
                                                                ? notifRules.notify_roles_on_new_appointment.filter(r => r !== role)
                                                                : [...notifRules.notify_roles_on_new_appointment, role];
                                                            setNotifRules(prev => ({ ...prev, notify_roles_on_new_appointment: updated }));
                                                        }}
                                                        className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${active ? 'bg-amber-500 text-white shadow-md border border-amber-600' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                    >
                                                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                        {role === UserRole.DOKTOR ? 'HEKİM' : role}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gün Sonu Kasa Kapatma */}
                            <div className="w-full mt-4 group isolate relative">
                                <div className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-emerald-200 rounded-3xl p-5 transition-all shadow-sm relative bg-white">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400/20 to-transparent rounded-t-3xl" />
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="mt-0.5 w-10 h-10 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-100">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="flex-1 min-w-0 px-1">
                                                <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase mb-1">Gün Sonu Kasa Kapatma</h3>
                                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Seçilen roller günü kapatabilir. Hiç seçilmezse tüm kullanıcılar kapatır.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 border-t border-slate-100 lg:border-t-0 pt-4 lg:pt-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                    const selected = dayCloseRoles.includes(role);
                                                    return (
                                                        <button
                                                            key={role}
                                                            onClick={() => setDayCloseRoles(prev => selected ? prev.filter(r => r !== role) : [...prev, role])}
                                                            className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${selected ? 'bg-emerald-600 border border-emerald-700 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                        >
                                                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                            {role === UserRole.DOKTOR ? "HEKİM" : role}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {dayCloseRoles.length === 0 && (
                                                <p className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-tight flex items-center gap-1.5 border border-emerald-100">
                                                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                                    Tüm kullanıcılar kapatabilir
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
