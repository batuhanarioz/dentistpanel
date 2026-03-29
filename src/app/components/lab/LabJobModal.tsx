"use client";

import { useState, useEffect } from "react";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import {
    LabJob, LabJobStatus, LAB_JOB_STATUSES, JOB_TYPES, SHADES,
    useCreateLabJob, useUpdateLabJob,
} from "@/hooks/useLabJobs";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface PatientOption {
    id: string;
    full_name: string;
    phone: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    /** Düzenleme modunda dolu gelir */
    editJob?: LabJob | null;
    /** Hasta sayfasından açılırsa bu dolu gelir */
    prefilledPatient?: PatientOption | null;
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export function LabJobModal({ open, onClose, editJob, prefilledPatient }: Props) {
    const { clinicId } = useClinic();
    const createMutation = useCreateLabJob();
    const updateMutation = useUpdateLabJob();
    const isEdit = !!editJob;

    // Form state
    const [patientSearch, setPatientSearch] = useState("");
    const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
    const [patientSearchLoading, setPatientSearchLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

    const [labName, setLabName] = useState("");
    const [jobType, setJobType] = useState(JOB_TYPES[0]);
    const [customJobType, setCustomJobType] = useState("");
    const [shade, setShade] = useState("");
    const [toothNumbers, setToothNumbers] = useState("");
    const [sentAt, setSentAt] = useState("");
    const [expectedAt, setExpectedAt] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<LabJobStatus>("sent");

    const [formError, setFormError] = useState<string | null>(null);

    // Düzenleme modunda form doldur
    useEffect(() => {
        if (editJob) {
            setSelectedPatient(editJob.patients ? {
                id: editJob.patient_id,
                full_name: editJob.patients.full_name,
                phone: editJob.patients.phone ?? null,
            } : null);
            setLabName(editJob.lab_name);
            setJobType(JOB_TYPES.includes(editJob.job_type) ? editJob.job_type : "Diğer");
            setCustomJobType(JOB_TYPES.includes(editJob.job_type) ? "" : editJob.job_type);
            setShade(editJob.shade ?? "");
            setToothNumbers(editJob.tooth_numbers ?? "");
            setSentAt(editJob.sent_at);
            setExpectedAt(editJob.expected_at);
            setNotes(editJob.notes ?? "");
            setStatus(editJob.status);
        } else {
            // Reset
            setSelectedPatient(prefilledPatient ?? null);
            setPatientSearch("");
            setLabName("");
            setJobType(JOB_TYPES[0]);
            setCustomJobType("");
            setShade("");
            setToothNumbers("");
            const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
            setSentAt(today);
            setExpectedAt("");
            setNotes("");
            setStatus("sent");
        }
        setFormError(null);
    }, [open, editJob, prefilledPatient]);

    // Hasta arama
    useEffect(() => {
        if (!patientSearch.trim() || patientSearch.length < 2 || !clinicId) {
            setPatientResults([]);
            return;
        }
        setPatientSearchLoading(true);
        const t = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `/api/patients/search?q=${encodeURIComponent(patientSearch)}&clinic_id=${clinicId}`,
                { headers: { Authorization: `Bearer ${session?.access_token}` } }
            );
            const json = await res.json();
            setPatientResults(json.patients ?? []);
            setPatientSearchLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [patientSearch, clinicId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);

        if (!selectedPatient) { setFormError("Hasta seçiniz."); return; }
        if (!labName.trim()) { setFormError("Laboratuvar adı zorunludur."); return; }
        if (!expectedAt) { setFormError("Beklenen teslim tarihi zorunludur."); return; }

        const finalJobType = jobType === "Diğer" ? (customJobType.trim() || "Diğer") : jobType;

        try {
            if (isEdit && editJob) {
                await updateMutation.mutateAsync({
                    id: editJob.id,
                    lab_name: labName,
                    job_type: finalJobType,
                    shade: shade || null,
                    tooth_numbers: toothNumbers || null,
                    notes: notes || null,
                    expected_at: expectedAt,
                    status,
                    ...(status === "received" ? { received_at: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" }) } : {}),
                });
            } else {
                await createMutation.mutateAsync({
                    patient_id: selectedPatient.id,
                    lab_name: labName,
                    job_type: finalJobType,
                    shade: shade || null,
                    tooth_numbers: toothNumbers || null,
                    notes: notes || null,
                    sent_at: sentAt,
                    expected_at: expectedAt,
                });
            }
            onClose();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Hata oluştu");
        }
    }

    if (!open) return null;

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔬</span>
                            <h2 className="text-lg font-black text-slate-900">
                                {isEdit ? "Lab İşi Düzenle" : "Laboratuvar İşi Başlat"}
                            </h2>
                        </div>
                        {isEdit && editJob?.patients && (
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 ml-8">
                                {editJob.patients.full_name}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* Hasta seçimi */}
                    {!isEdit && !prefilledPatient && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Hasta <span className="text-rose-500">*</span>
                            </label>
                            {selectedPatient ? (
                                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 text-sm">{selectedPatient.full_name}</p>
                                        {selectedPatient.phone && <p className="text-[11px] text-slate-500">{selectedPatient.phone}</p>}
                                    </div>
                                    <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                                        className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
                                        Değiştir
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        value={patientSearch}
                                        onChange={e => setPatientSearch(e.target.value)}
                                        placeholder="İsim ile hasta ara..."
                                        className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 pl-4 pr-4 text-sm font-medium focus:border-slate-900 focus:bg-white outline-none transition-all"
                                    />
                                    {patientSearchLoading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                                    )}
                                    {patientResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                                            {patientResults.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatientResults([]); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                                >
                                                    <p className="font-semibold text-sm text-slate-800">{p.full_name}</p>
                                                    {p.phone && <p className="text-[11px] text-slate-500">{p.phone}</p>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prefilled hasta göster */}
                    {!isEdit && prefilledPatient && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{prefilledPatient.full_name}</p>
                                {prefilledPatient.phone && <p className="text-[11px] text-slate-500">{prefilledPatient.phone}</p>}
                            </div>
                        </div>
                    )}

                    {/* İş tipi */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                İş Türü <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={jobType}
                                onChange={e => setJobType(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:border-slate-900 focus:bg-white outline-none transition-all"
                            >
                                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {jobType === "Diğer" && (
                                <input
                                    value={customJobType}
                                    onChange={e => setCustomJobType(e.target.value)}
                                    placeholder="İş türünü yazın..."
                                    className="mt-2 w-full h-10 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 text-sm font-medium focus:border-slate-900 focus:bg-white outline-none transition-all"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Renk (Shade)
                            </label>
                            <select
                                value={shade}
                                onChange={e => setShade(e.target.value)}
                                className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:border-slate-900 focus:bg-white outline-none transition-all"
                            >
                                <option value="">Seçiniz</option>
                                {SHADES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Laboratuvar adı */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                            Laboratuvar Adı <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={labName}
                            onChange={e => setLabName(e.target.value)}
                            placeholder="Örn: Antalya Dental Lab"
                            className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-slate-900 focus:bg-white outline-none transition-all"
                        />
                    </div>

                    {/* Diş numaraları */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                            Diş Numaraları <span className="text-slate-400 font-normal normal-case">(opsiyonel, örn: 11,12,21)</span>
                        </label>
                        <input
                            value={toothNumbers}
                            onChange={e => setToothNumbers(e.target.value)}
                            placeholder="11, 12, 21"
                            className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 text-sm font-medium focus:border-slate-900 focus:bg-white outline-none transition-all"
                        />
                    </div>

                    {/* Tarihler */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Gönderim Tarihi
                            </label>
                            <PremiumDatePicker value={sentAt} onChange={setSentAt} compact />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Beklenen Teslim <span className="text-rose-500">*</span>
                            </label>
                            <PremiumDatePicker value={expectedAt} onChange={setExpectedAt} compact align="right" />
                        </div>
                    </div>

                    {/* Düzenleme modunda statü */}
                    {isEdit && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                                Statü
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {LAB_JOB_STATUSES.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setStatus(s.value)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${
                                            status === s.value
                                                ? `${s.bg} ${s.color} border-current`
                                                : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot} mr-1.5`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notlar */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                            Notlar
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Özel talimatlar, açıklamalar..."
                            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-slate-900 focus:bg-white outline-none transition-all resize-none"
                        />
                    </div>

                    {formError && (
                        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-700">
                            {formError}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 h-12 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Kaydediliyor...</>
                            ) : (
                                isEdit ? "Güncelle" : "🔬 Laboratuvara Gönder"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
