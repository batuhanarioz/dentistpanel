"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { useTreatmentPlanMutations } from "@/hooks/useTreatmentPlanning";
import { getTreatmentDefinitions } from "@/lib/api";
import { ToothChart } from "@/app/components/dental/ToothChart";
import { useDentalChart } from "@/hooks/useDentalChart";
import { AnamnesisSection } from "@/app/components/patients/AnamnesisSection";
import { useAnamnesis, useAnamnesisMutation } from "@/hooks/useAnamnesis";
import type { PatientAnamnesis } from "@/types/database";

interface TreatmentActionModalProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientId: string;
    patientName: string;
    onSuccess: () => void;
    checklistItemId?: string;
}

interface PlanItem {
    id: string;
    procedure_name: string;
    tooth_no: string;
    quantity: number;
    unit_price: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppointmentInfo = Record<string, any>;

const EMPTY_ITEM = (): PlanItem => ({
    id: crypto.randomUUID(),
    procedure_name: "",
    tooth_no: "",
    quantity: 1,
    unit_price: 0,
});

function formatDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
}
function formatTime(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function TreatmentActionModal({
    open, onClose, appointmentId, patientId, patientName, onSuccess, checklistItemId
}: TreatmentActionModalProps) {
    const { clinicId } = useClinic();
    const { createPlan } = useTreatmentPlanMutations(patientId);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [appointmentInfo, setAppointmentInfo] = useState<AppointmentInfo | null>(null);
    const [showDentalChart, setShowDentalChart] = useState(true);
    const [presentChartModal, setPresentChartModal] = useState(false);
    const [showAnamnesis, setShowAnamnesis] = useState(false);

    const { data: dentalChart } = useDentalChart(open ? patientId : undefined);
    const { data: anamnesis, isLoading: anamnesisLoading } = useAnamnesis(open ? patientId : undefined);
    const saveAnamnesisMutation = useAnamnesisMutation(patientId);
    const handleSaveAnamnesis = async (
        draft: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">
    ) => { await saveAnamnesisMutation.mutateAsync(draft); };

    // Tedavi notu
    const [note, setNote] = useState("");

    // Plan bölümü açık mı
    const [planOpen, setPlanOpen] = useState(false);

    // Plan alanları
    const [planTitle, setPlanTitle] = useState("");
    const [planNote, setPlanNote] = useState("");
    const [items, setItems] = useState<PlanItem[]>([EMPTY_ITEM()]);
    const [nextDate, setNextDate] = useState("");
    const [nextTime, setNextTime] = useState("09:00");
    const [nextDuration, setNextDuration] = useState(30);
    const [treatmentDefs, setTreatmentDefs] = useState<{ id: string; name: string; default_duration: number }[]>([]);

    useEffect(() => {
        if (!open || !appointmentId) return;
        let mounted = true;
        setLoading(true);
        setError(null);
        setNote("");
        setPlanOpen(false);
        setAppointmentInfo(null);
        setItems([EMPTY_ITEM()]);
        setPlanTitle("");
        setPlanNote("");
        setNextDate("");
        setNextTime("09:00");
        setNextDuration(30);

        Promise.all([
            supabase
                .from("appointments")
                .select("treatment_note, starts_at, ends_at, treatment_type, doctor_id, doctor:users!doctor_id(full_name, id)")
                .eq("id", appointmentId)
                .single(),
            clinicId ? getTreatmentDefinitions(clinicId) : Promise.resolve([]),
        ]).then(([{ data: apptData }, defs]) => {
            if (!mounted) return;
            if (apptData) {
                setNote(apptData.treatment_note || "");
                setAppointmentInfo(apptData);
                if (apptData.treatment_type) setPlanTitle(apptData.treatment_type);
            }
            setTreatmentDefs(defs);
            setLoading(false);
        });

        return () => { mounted = false; };
    }, [open, appointmentId, clinicId]);

    const completeChecklistItem = useCallback(async () => {
        if (!checklistItemId || !clinicId) return;
        await supabase
            .from("checklist_items")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", checklistItemId)
            .eq("clinic_id", clinicId);
    }, [checklistItemId, clinicId]);

    const handleSave = async () => {
        if (!note.trim()) { setError("Lütfen tedavi notunu giriniz."); return; }
        const validItems = planOpen ? items.filter(i => i.procedure_name.trim()) : [];
        if (planOpen && validItems.length === 0) { setError("Tedavi planı açıksa en az bir işlem ekleyin."); return; }

        setSaving(true);
        setError(null);

        // 1) Tedavi notunu kaydet
        const { error: noteErr } = await supabase
            .from("appointments")
            .update({ treatment_note: note.trim() })
            .eq("id", appointmentId)
            .eq("clinic_id", clinicId);

        if (noteErr) { setError("Kaydedilirken hata oluştu: " + noteErr.message); setSaving(false); return; }

        // 2) Tedavi planı varsa kaydet
        if (planOpen && validItems.length > 0) {
            let nextAppointment = null;
            if (nextDate) {
                const [h, m] = nextTime.split(":").map(Number);
                const start = new Date(`${nextDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
                const end = new Date(start.getTime() + nextDuration * 60000);
                nextAppointment = {
                    starts_at: start.toISOString(),
                    ends_at: end.toISOString(),
                    treatment_type: planTitle || appointmentInfo?.treatment_type || null,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    doctor_id: appointmentInfo?.doctor_id ?? (Array.isArray(appointmentInfo?.doctor) ? (appointmentInfo.doctor[0] as any)?.id : null) ?? null,
                    channel: "phone" as const,
                };
            }

            const result = await createPlan.mutateAsync({
                patient_id: patientId,
                appointment_id: appointmentId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                doctor_id: appointmentInfo?.doctor_id ?? (Array.isArray(appointmentInfo?.doctor) ? (appointmentInfo.doctor[0] as any)?.id : null) ?? null,
                title: planTitle || null,
                note: planNote || null,
                items: validItems.map((item, idx) => ({
                    procedure_name: item.procedure_name,
                    tooth_no: item.tooth_no || null,
                    description: null,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    sort_order: idx,
                })),
                nextAppointment,
            });

            if (result.error) {
                setError("Tedavi planı kaydedilirken hata oluştu.");
                setSaving(false);
                return;
            }
        }

        // 3) Checklist item'ı tamamla
        await completeChecklistItem();

        setSaving(false);
        onSuccess();
        onClose();
    };

    const addItem = () => setItems(prev => [...prev, EMPTY_ITEM()]);
    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
    const updateItem = (id: string, field: keyof PlanItem, value: string | number) =>
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split("T")[0];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">

                {/* Header */}
                <div className="p-6 text-white relative flex-shrink-0 bg-gradient-to-r from-teal-600 to-indigo-600">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold">Tedavi Kaydı</h2>
                    <p className="text-white/80 text-xs mt-0.5 font-medium">{patientName}</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-16 bg-slate-100 rounded-2xl w-full" />
                            <div className="h-24 bg-slate-100 rounded-2xl w-full" />
                        </div>
                    ) : (
                        <>
                            {/* Randevu bilgi kartı */}
                            {appointmentInfo && (
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/60">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İlgili Randevu</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-px bg-slate-100/60">
                                        <div className="bg-white px-4 py-2.5">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Hekim</div>
                                            <div className="text-xs font-bold text-slate-800">
                                                {Array.isArray(appointmentInfo.doctor)
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    ? ((appointmentInfo.doctor[0] as any)?.full_name ?? "Atanmamış")
                                                    : (appointmentInfo.doctor?.full_name ?? "Atanmamış")}
                                            </div>
                                        </div>
                                        <div className="bg-white px-4 py-2.5">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">İşlem Türü</div>
                                            <div className="text-xs font-bold text-slate-800">{appointmentInfo.treatment_type || "Belirtilmemiş"}</div>
                                        </div>
                                        <div className="bg-white px-4 py-2.5">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tarih</div>
                                            <div className="text-xs font-bold text-slate-800">{formatDate(appointmentInfo.starts_at)}</div>
                                        </div>
                                        <div className="bg-white px-4 py-2.5">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Saat</div>
                                            <div className="text-xs font-bold text-slate-800">{formatTime(appointmentInfo.starts_at)} – {formatTime(appointmentInfo.ends_at)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── ANAMNEZ (collapsible) ── */}
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowAnamnesis(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-amber-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="h-5 w-5 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <svg className="h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                            </svg>
                                        </span>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Anamnez</span>
                                        {anamnesis && (anamnesis.systemic_conditions.length > 0 || anamnesis.allergies_list.length > 0 || anamnesis.uses_anticoagulants || anamnesis.has_pacemaker) && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[8px] font-black">Dikkat</span>
                                        )}
                                        {(!anamnesis || (anamnesis.systemic_conditions.length === 0 && anamnesis.allergies_list.length === 0)) && (
                                            <span className="text-[9px] text-slate-400 font-medium">Kayıt yok</span>
                                        )}
                                    </div>
                                    <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform flex-shrink-0 ${showAnamnesis ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                                {showAnamnesis && (
                                    <div className="p-4 bg-white">
                                        <AnamnesisSection
                                            patientId={patientId}
                                            data={anamnesis}
                                            isLoading={anamnesisLoading}
                                            onSave={handleSaveAnamnesis}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ── DİŞ ŞEMASI (collapsible reference) ── */}
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowDentalChart(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-emerald-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="h-5 w-5 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <svg className="h-3 w-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v1a4 4 0 004 4h2a4 4 0 004-4V5a2 2 0 00-2-2h-2zM9 3v2m6-2v2M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6M9 21h6" />
                                            </svg>
                                        </span>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Diş Şeması</span>
                                        {dentalChart && Object.keys(dentalChart.teeth_data ?? {}).length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black">
                                                {Object.keys(dentalChart.teeth_data).length} diş işaretli
                                            </span>
                                        )}
                                        {(!dentalChart || Object.keys(dentalChart.teeth_data ?? {}).length === 0) && (
                                            <span className="text-[9px] text-slate-400 font-medium">Kayıt yok</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {dentalChart && Object.keys(dentalChart.teeth_data ?? {}).length > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setPresentChartModal(true); }}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#007f6e] text-white text-[8px] font-black uppercase tracking-widest hover:bg-[#006d5e] transition-colors"
                                            >
                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                                </svg>
                                                Göster
                                            </button>
                                        )}
                                        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showDentalChart ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </button>
                                {showDentalChart && (
                                    <div className="p-3 bg-white">
                                        <ToothChart
                                            teethData={dentalChart?.teeth_data ?? {}}
                                            editMode={false}
                                            patientName={patientName}
                                            presentationOpen={presentChartModal}
                                            onPresentationClose={() => setPresentChartModal(false)}
                                        />
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">{error}</div>
                            )}

                            {/* ── TEDAVİ NOTU ── */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Tedavi Notu <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Yapılan işlemleri, teşhisleri ve kullanılan malzemeleri detaylıca yazın..."
                                    className="w-full h-28 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                                />
                            </div>

                            {/* ── TEDAVİ PLANI (isteğe bağlı) ── */}
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => setPlanOpen(v => !v)}
                                    className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-base">🦷</span>
                                        <span className="text-xs font-black text-slate-600">
                                            Tedavi Planı Ekle
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">(isteğe bağlı)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {planOpen && totalAmount > 0 && (
                                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">
                                                {totalAmount.toLocaleString("tr-TR")} ₺
                                            </span>
                                        )}
                                        <svg
                                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${planOpen ? "rotate-180" : ""}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {planOpen && (
                                    <div className="p-5 space-y-5 border-t-2 border-dashed border-slate-200">
                                        {/* Plan başlık ve not */}
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Başlığı</label>
                                                <input
                                                    type="text"
                                                    value={planTitle}
                                                    onChange={(e) => setPlanTitle(e.target.value)}
                                                    placeholder="ör. Üst çene implant tedavisi"
                                                    className="w-full h-10 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:bg-white transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Notu (opsiyonel)</label>
                                                <textarea
                                                    value={planNote}
                                                    onChange={(e) => setPlanNote(e.target.value)}
                                                    placeholder="Tedavi hakkında genel notlar..."
                                                    className="w-full h-16 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                                                />
                                            </div>
                                        </div>

                                        {/* İşlem listesi */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Planlanan İşlemler <span className="text-rose-400">*</span>
                                                </label>
                                                {totalAmount > 0 && (
                                                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">
                                                        Toplam: {totalAmount.toLocaleString("tr-TR")} ₺
                                                    </span>
                                                )}
                                            </div>

                                            {items.map((item, idx) => (
                                                <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{idx + 1} İşlem</span>
                                                        {items.length > 1 && (
                                                            <button
                                                                onClick={() => removeItem(item.id)}
                                                                className="text-rose-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="col-span-2 space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İşlem Adı *</label>
                                                            {treatmentDefs.length > 0 ? (
                                                                <select
                                                                    value={item.procedure_name}
                                                                    onChange={(e) => updateItem(item.id, "procedure_name", e.target.value)}
                                                                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                                >
                                                                    <option value="">Seçin veya yazın...</option>
                                                                    {treatmentDefs.map(d => (
                                                                        <option key={d.id} value={d.name}>{d.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={item.procedure_name}
                                                                    onChange={(e) => updateItem(item.id, "procedure_name", e.target.value)}
                                                                    placeholder="ör. İmplant, Dolgu, Kanal..."
                                                                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diş No</label>
                                                            <input
                                                                type="text"
                                                                value={item.tooth_no}
                                                                onChange={(e) => updateItem(item.id, "tooth_no", e.target.value)}
                                                                placeholder="ör. 14, 36"
                                                                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adet</label>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                                                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                            />
                                                        </div>
                                                        <div className="col-span-2 space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Birim Fiyat (₺)</label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={item.unit_price || ""}
                                                                onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                                                                placeholder="0"
                                                                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    {item.quantity > 0 && item.unit_price > 0 && (
                                                        <div className="text-right text-[10px] font-black text-teal-600">
                                                            {item.quantity} × {item.unit_price.toLocaleString("tr-TR")} ₺ = {(item.quantity * item.unit_price).toLocaleString("tr-TR")} ₺
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={addItem}
                                                className="w-full py-2.5 border-2 border-dashed border-teal-200 rounded-2xl text-xs font-bold text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                </svg>
                                                İşlem Ekle
                                            </button>
                                        </div>

                                        {/* Sonraki randevu */}
                                        <div className="bg-teal-50/60 rounded-2xl border border-teal-100 p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Sonraki Randevu (Otomatik Oluştur)</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 -mt-1">
                                                Tarih seçerseniz randevu otomatik oluşturulur, tekrar randevu almanız gerekmez.
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarih</label>
                                                    <input
                                                        type="date"
                                                        value={nextDate}
                                                        min={minDateStr}
                                                        onChange={(e) => setNextDate(e.target.value)}
                                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saat</label>
                                                    <input
                                                        type="time"
                                                        value={nextTime}
                                                        onChange={(e) => setNextTime(e.target.value)}
                                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Süre (dakika)</label>
                                                    <select
                                                        value={nextDuration}
                                                        onChange={(e) => setNextDuration(parseInt(e.target.value))}
                                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 transition-all"
                                                    >
                                                        {[15, 20, 30, 45, 60, 90, 120].map(d => (
                                                            <option key={d} value={d}>{d} dakika</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            {nextDate && (
                                                <div className="flex items-center gap-2 bg-teal-100 rounded-xl px-3 py-2">
                                                    <svg className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-[10px] font-bold text-teal-700">
                                                        {new Date(`${nextDate}T${nextTime}`).toLocaleDateString("tr-TR", {
                                                            day: "2-digit", month: "long", year: "numeric", weekday: "long"
                                                        })} saat {nextTime} için randevu otomatik oluşturulacak.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 flex-shrink-0">
                    {planOpen && totalAmount > 0 ? (
                        <span className="text-sm font-black text-slate-700">
                            Toplam: <span className="text-teal-600">{totalAmount.toLocaleString("tr-TR")} ₺</span>
                        </span>
                    ) : <span />}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200/50 transition-colors text-xs"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-6 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center gap-2 disabled:opacity-60 active:scale-95 bg-teal-600 hover:bg-teal-700 shadow-teal-600/30"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {planOpen && nextDate ? "Kaydet & Randevu Oluştur" : "Kaydet"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
