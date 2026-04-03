"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { useConfirm } from "@/app/context/ConfirmContext";
import { getTreatmentDefinitions, upsertTreatmentDefinition, deleteTreatmentDefinition } from "@/lib/api";
import { TreatmentDefinition } from "@/types/database";

export function TreatmentsSettings() {
    const { confirm } = useConfirm();
    const clinic = useClinic();
    const [treatmentDefinitions, setTreatmentDefinitions] = useState<TreatmentDefinition[]>([]);
    const [newTreatmentName, setNewTreatmentName] = useState("");
    const [newTreatmentDuration, setNewTreatmentDuration] = useState(30);
    const [newTreatmentMaterialCost, setNewTreatmentMaterialCost] = useState(0);
    const [newTreatmentPrimPercent, setNewTreatmentPrimPercent] = useState(0);
    const [newTreatmentRecallDays, setNewTreatmentRecallDays] = useState<number | null>(null);
    const [isTreatmentsLoading, setIsTreatmentsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
    const [editingTreatmentName, setEditingTreatmentName] = useState("");
    const [editingTreatmentDuration, setEditingTreatmentDuration] = useState(30);
    const [editingMaterialCost, setEditingMaterialCost] = useState(0);
    const [editingPrimPercent, setEditingPrimPercent] = useState(0);
    const [editingRecallDays, setEditingRecallDays] = useState<number | null>(null);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (clinic.clinicId) loadTreatmentSettings();
    }, [clinic.clinicId]);

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
                default_duration: newTreatmentDuration,
                material_cost: newTreatmentMaterialCost,
                doctor_prim_percent: newTreatmentPrimPercent,
                recall_interval_days: newTreatmentRecallDays,
            });
            if (error) throw error;
            setNewTreatmentName("");
            setNewTreatmentDuration(30);
            setNewTreatmentMaterialCost(0);
            setNewTreatmentPrimPercent(0);
            setNewTreatmentRecallDays(null);
            await loadTreatmentSettings();
            setSaveMessage({ type: 'success', text: "Tedavi başarıyla eklendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTreatment = async (id: string) => {
        confirm({
            title: "Tedaviyi Sil",
            message: "Bu tedavi türünü silmek istediğinize emin misiniz?",
            variant: "danger",
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    const { error } = await deleteTreatmentDefinition(id, clinic.clinicId!);
                    if (error) throw error;
                    await loadTreatmentSettings();
                } catch {
                    setSaveMessage({ type: 'error', text: "Silme sırasında hata oluştu." });
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleStartEditTreatment = (td: TreatmentDefinition) => {
        setEditingTreatmentId(td.id);
        setEditingTreatmentName(td.name);
        setEditingTreatmentDuration(td.default_duration);
        setEditingMaterialCost(td.material_cost ?? 0);
        setEditingPrimPercent(td.doctor_prim_percent ?? 0);
        setEditingRecallDays(td.recall_interval_days ?? null);
    };

    const handleCancelEditTreatment = () => {
        setEditingTreatmentId(null);
        setEditingTreatmentName("");
        setEditingTreatmentDuration(30);
        setEditingMaterialCost(0);
        setEditingPrimPercent(0);
        setEditingRecallDays(null);
    };

    const handleUpdateTreatment = async () => {
        if (!clinic.clinicId || !editingTreatmentId || !editingTreatmentName.trim()) return;
        setIsLoading(true);
        try {
            const { error } = await upsertTreatmentDefinition(clinic.clinicId, {
                id: editingTreatmentId,
                name: editingTreatmentName.trim(),
                default_duration: editingTreatmentDuration,
                material_cost: editingMaterialCost,
                doctor_prim_percent: editingPrimPercent,
                recall_interval_days: editingRecallDays,
            });
            if (error) throw error;
            handleCancelEditTreatment();
            await loadTreatmentSettings();
            setSaveMessage({ type: 'success', text: "Tedavi başarıyla güncellendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Güncelleme sırasında hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Tedavi Türleri ve Süreleri</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Randevu alırken kullanılan işlem türlerini yönetin.</p>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {saveMessage && (
                    <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                        {saveMessage.text}
                    </div>
                )}

                <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                        Yeni Tedavi Ekle
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tedavi Adı</label>
                            <input
                                type="text"
                                placeholder="Örn: Kanal Tedavisi"
                                value={newTreatmentName}
                                onChange={(e) => setNewTreatmentName(e.target.value)}
                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Varsayılan Süre (Dakika)</label>
                            <input
                                type="number"
                                value={newTreatmentDuration}
                                onChange={(e) => setNewTreatmentDuration(parseInt(e.target.value))}
                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Malzeme Maliyeti (₺)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newTreatmentMaterialCost}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setNewTreatmentMaterialCost(parseFloat(e.target.value) || 0)}
                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hekim Prim (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={newTreatmentPrimPercent}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setNewTreatmentPrimPercent(parseFloat(e.target.value) || 0)}
                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Geri Çağırma (Gün)</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Örn: 180"
                                value={newTreatmentRecallDays ?? ""}
                                onChange={(e) => setNewTreatmentRecallDays(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="flex items-end xl:col-start-5">
                            <button
                                onClick={handleSaveTreatment}
                                disabled={isLoading || !newTreatmentName}
                                className="w-full h-[52px] bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Ekle
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isTreatmentsLoading ? (
                        <div className="col-span-full py-12 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : treatmentDefinitions.map((td) => (
                        <div key={td.id} className={`group relative p-6 rounded-[32px] border transition-all shadow-sm ${editingTreatmentId === td.id ? "border-indigo-300 bg-indigo-50/30 shadow-md" : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md"}`}>
                            {editingTreatmentId === td.id ? (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tedavi Adı</label>
                                        <input
                                            type="text"
                                            value={editingTreatmentName}
                                            onChange={e => setEditingTreatmentName(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") handleUpdateTreatment(); if (e.key === "Escape") handleCancelEditTreatment(); }}
                                            autoFocus
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Süre (Dakika)</label>
                                        <input
                                            type="number"
                                            value={editingTreatmentDuration}
                                            onChange={e => setEditingTreatmentDuration(parseInt(e.target.value) || 0)}
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Malzeme Maliyeti (₺)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editingMaterialCost}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setEditingMaterialCost(parseFloat(e.target.value) || 0)}
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hekim Prim (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={editingPrimPercent}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setEditingPrimPercent(parseFloat(e.target.value) || 0)}
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Geri Çağırma (Gün)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Örn: 180"
                                            value={editingRecallDays ?? ""}
                                            onChange={e => setEditingRecallDays(e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleUpdateTreatment}
                                            disabled={isLoading || !editingTreatmentName.trim()}
                                            className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Kaydet
                                        </button>
                                        <button
                                            onClick={handleCancelEditTreatment}
                                            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95"
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-slate-900">{td.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">İşlem Türü</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => handleStartEditTreatment(td)}
                                                className="p-2 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                title="Düzenle"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTreatment(td.id)}
                                                className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                title="Sil"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                            <span className="text-[11px] font-black uppercase tracking-tighter">{td.default_duration} Dakika</span>
                                        </div>
                                        {(td.material_cost ?? 0) > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                                                <span className="text-[11px] font-black">₺{td.material_cost} Malzeme</span>
                                            </div>
                                        )}
                                        {(td.doctor_prim_percent ?? 0) > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                <span className="text-[11px] font-black">%{td.doctor_prim_percent} Prim</span>
                                            </div>
                                        )}
                                        {(td.recall_interval_days ?? 0) > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                                                <span className="text-[11px] font-black">🔁 {td.recall_interval_days}g Recall</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
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
    );
}
