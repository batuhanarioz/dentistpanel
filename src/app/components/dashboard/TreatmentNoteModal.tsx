"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";

interface TreatmentNoteModalProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientName: string;
    onSuccess: () => void;
    checklistItemId?: string;
}

export function TreatmentNoteModal({ open, onClose, appointmentId, patientName, onSuccess, checklistItemId }: TreatmentNoteModalProps) {
    const { clinicId } = useClinic();
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [appointmentInfo, setAppointmentInfo] = useState<any>(null);

    useEffect(() => {
        if (!open || !appointmentId) return;

        let isMounted = true;
        setLoading(true);
        setError(null);
        setNote("");
        setAppointmentInfo(null);

        supabase
            .from("appointments")
            .select("treatment_note, starts_at, ends_at, treatment_type, doctor:users(full_name)")
            .eq("id", appointmentId)
            .single()
            .then(({ data }) => {
                if (!isMounted) return;
                if (data) {
                    setNote(data.treatment_note || "");
                    setAppointmentInfo(data);
                }
                setLoading(false);
            });

        return () => { isMounted = false; };
    }, [open, appointmentId]);

    if (!open) return null;

    const handleSave = async () => {
        if (!note.trim()) {
            setError("Lütfen tedavi notunu giriniz.");
            return;
        }

        setSaving(true);
        setError(null);

        const { error } = await supabase
            .from("appointments")
            .update({ treatment_note: note.trim() })
            .eq("id", appointmentId)
            .eq("clinic_id", clinicId);

        setSaving(false);

        if (error) {
            setError("Kaydedilirken bir hata oluştu: " + error.message);
        } else {
            // Eğer bir checklist item üzerinden gelindiyse onu da tamamla
            if (checklistItemId) {
                await supabase.from("checklist_items").update({
                    status: "completed",
                    completed_at: new Date().toISOString()
                }).eq("id", checklistItemId).eq("clinic_id", clinicId);
            }

            onSuccess();
            onClose();
        }
    };

    const formatDate = (iso: string) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
    };

    const formatTime = (iso: string) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white relative">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>📝</span> Tedavi Notu Ekle
                    </h2>
                    <p className="text-amber-100 text-xs mt-1 font-medium">{patientName}</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-28 bg-slate-100 rounded-2xl w-full"></div>
                            <div className="h-28 bg-slate-100 rounded-2xl w-full"></div>
                        </div>
                    ) : (
                        <>
                            {/* Randevu Bilgi Kartı */}
                            {appointmentInfo && (
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200/60">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İlgili Randevu</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-px bg-slate-100/60">
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Hasta</div>
                                            <div className="text-xs font-bold text-slate-800">{patientName}</div>
                                        </div>
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Hekim</div>
                                            <div className="text-xs font-bold text-slate-800">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {(appointmentInfo.doctor as any)?.full_name || "Atanmamış"}
                                            </div>
                                        </div>
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tarih</div>
                                            <div className="text-xs font-bold text-slate-800">{formatDate(appointmentInfo.starts_at)}</div>
                                        </div>
                                        <div className="bg-white px-4 py-3">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Saat</div>
                                            <div className="text-xs font-bold text-slate-800">
                                                {formatTime(appointmentInfo.starts_at)} – {formatTime(appointmentInfo.ends_at)}
                                            </div>
                                        </div>
                                        <div className="bg-white px-4 py-3 col-span-2">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">İşlem Türü</div>
                                            <div className="text-xs font-bold text-slate-800">
                                                {appointmentInfo.treatment_type || "Belirtilmemiş"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedavi Notu ve Detayları</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Yapılan işlemleri, teşhisleri ve kullanılan malzemeleri detaylıca yazın..."
                                    className="w-full h-28 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all text-xs flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Notu Kaydet
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
