"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { useTreatmentPlanMutations } from "@/hooks/useTreatmentPlanning";
import { getAllPatients, getTreatmentDefinitions } from "@/lib/api";

const UPPER_TEETH_PICKER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH_PICKER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function ToothPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const toggle = (n: number) => onChange(value === String(n) ? "" : String(n));
    const Row = ({ teeth }: { teeth: number[] }) => (
        <div className="flex gap-0.5">
            {teeth.map(n => (
                <button
                    key={n}
                    type="button"
                    onClick={() => toggle(n)}
                    className={`w-[22px] h-[22px] text-[8px] font-black rounded transition-colors ${value === String(n) ? "bg-[#007f6e] text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-[#007f6e]"}`}
                >
                    {n}
                </button>
            ))}
        </div>
    );
    return (
        <div className="space-y-0.5">
            <Row teeth={UPPER_TEETH_PICKER} />
            <Row teeth={LOWER_TEETH_PICKER} />
        </div>
    );
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    /** Eğer verilmezse hasta arama alanı gösterilir */
    patientId?: string;
    patientName?: string;
    /** Opsiyonel: mevcut bir randevuya bağlamak için */
    appointmentId?: string;
    doctorId?: string;
}

interface PlanItem {
    id: string;
    procedure_name: string;
    tooth_no: string;
    quantity: number;
    unit_price: number;
}

interface PatientOption {
    id: string;
    full_name: string;
    phone: string | null;
}

const EMPTY_ITEM = (): PlanItem => ({
    id: crypto.randomUUID(),
    procedure_name: "",
    tooth_no: "",
    quantity: 1,
    unit_price: 0,
});

export function CreateTreatmentPlanModal({
    open, onClose, onSuccess,
    patientId: initialPatientId,
    patientName: initialPatientName,
    appointmentId,
    doctorId,
}: Props) {
    const { clinicId } = useClinic();

    // Hasta seçimi (patientId verilmemişse)
    const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId ?? "");
    const [selectedPatientName, setSelectedPatientName] = useState(initialPatientName ?? "");
    const [patientSearch, setPatientSearch] = useState("");
    const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
    const [patientSearchLoading, setPatientSearchLoading] = useState(false);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Plan alanları
    const [planTitle, setPlanTitle] = useState("");
    const [planNote, setPlanNote] = useState("");
    const [items, setItems] = useState<PlanItem[]>([EMPTY_ITEM()]);
    const [nextDate, setNextDate] = useState("");
    const [nextTime, setNextTime] = useState("09:00");
    const [nextDuration, setNextDuration] = useState(30);
    const [treatmentDefs, setTreatmentDefs] = useState<{ id: string; name: string; default_duration: number }[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { createPlan } = useTreatmentPlanMutations(selectedPatientId || undefined);

    // Modal açıldığında sıfırla
    useEffect(() => {
        if (!open) return;
        setSelectedPatientId(initialPatientId ?? "");
        setSelectedPatientName(initialPatientName ?? "");
        setPatientSearch("");
        setPatientOptions([]);
        setPlanTitle("");
        setPlanNote("");
        setItems([EMPTY_ITEM()]);
        setNextDate("");
        setNextTime("09:00");
        setNextDuration(30);
        setError(null);

        if (clinicId) {
            getTreatmentDefinitions(clinicId).then(setTreatmentDefs);
        }
    }, [open, initialPatientId, initialPatientName, clinicId]);

    // Hasta arama (debounced)
    useEffect(() => {
        if (!patientSearch.trim() || patientSearch.length < 2 || !clinicId) {
            setPatientOptions([]);
            return;
        }
        const timer = setTimeout(async () => {
            setPatientSearchLoading(true);
            const result = await getAllPatients(clinicId, 1, 100);
            const q = patientSearch.toLowerCase();
            setPatientOptions(
                (result as PatientOption[])
                    .filter((p) =>
                        p.full_name?.toLowerCase().includes(q) ||
                        p.phone?.includes(q)
                    )
                    .slice(0, 8)
            );
            setPatientSearchLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [patientSearch, clinicId]);

    const selectPatient = useCallback((p: PatientOption) => {
        setSelectedPatientId(p.id);
        setSelectedPatientName(p.full_name);
        setPatientSearch(p.full_name);
        setShowPatientDropdown(false);
    }, []);

    const handleSave = async () => {
        if (!selectedPatientId) { setError("Lütfen bir hasta seçin."); return; }
        const validItems = items.filter(i => i.procedure_name.trim());
        if (validItems.length === 0) { setError("En az bir işlem ekleyin."); return; }

        setSaving(true);
        setError(null);

        let nextAppointment = null;
        if (nextDate) {
            const [h, m] = nextTime.split(":").map(Number);
            const start = new Date(`${nextDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
            const end = new Date(start.getTime() + nextDuration * 60000);
            nextAppointment = {
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                treatment_type: planTitle || null,
                doctor_id: doctorId ?? null,
                channel: "phone" as const,
            };
        }

        const result = await createPlan.mutateAsync({
            patient_id: selectedPatientId,
            appointment_id: appointmentId ?? null,
            doctor_id: doctorId ?? null,
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
            setError("Plan kaydedilirken hata oluştu.");
            setSaving(false);
            return;
        }

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

    const needsPatientSelect = !initialPatientId;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[92vh]">

                {/* Header */}
                <div className="p-6 text-white relative flex-shrink-0 bg-gradient-to-r from-teal-600 to-indigo-600">
                    <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold">🦷 Yeni Tedavi Planı</h2>
                    <p className="text-white/80 text-xs mt-0.5 font-medium">
                        {selectedPatientName ? selectedPatientName : "Hasta seçilmedi"}
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Hasta seçimi (sadece patientId verilmemişse) */}
                    {needsPatientSelect && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Hasta <span className="text-rose-400">*</span>
                            </label>
                            <div className="relative">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={patientSearch}
                                        onChange={e => {
                                            setPatientSearch(e.target.value);
                                            setShowPatientDropdown(true);
                                            if (!e.target.value) {
                                                setSelectedPatientId("");
                                                setSelectedPatientName("");
                                            }
                                        }}
                                        onFocus={() => setShowPatientDropdown(true)}
                                        placeholder="Hasta adı veya telefonu ile ara..."
                                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:bg-white transition-all"
                                    />
                                    {selectedPatientId && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {showPatientDropdown && (patientOptions.length > 0 || patientSearchLoading) && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 z-10 overflow-hidden">
                                        {patientSearchLoading ? (
                                            <div className="p-3 text-xs text-slate-400 text-center">Aranıyor...</div>
                                        ) : patientOptions.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => selectPatient(p)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-teal-50 transition-colors text-left"
                                            >
                                                <span className="text-sm font-bold text-slate-800">{p.full_name}</span>
                                                {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">{error}</div>
                    )}

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
                                        <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
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
                                                <option value="">Seçin...</option>
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
                                    <div className="space-y-1 col-span-full">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Diş No
                                            {item.tooth_no && <span className="ml-2 text-[#007f6e]">#{item.tooth_no} seçili</span>}
                                        </label>
                                        <div className="bg-white border border-slate-200 rounded-xl p-2 overflow-x-auto">
                                            <ToothPicker
                                                value={item.tooth_no}
                                                onChange={(v) => updateItem(item.id, "tooth_no", v)}
                                            />
                                        </div>
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
                            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Sonraki Randevu (Otomatik)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 -mt-1">Tarih seçerseniz randevu otomatik oluşturulur.</p>
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
                                    })} saat {nextTime} için randevu oluşturulacak.
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 flex-shrink-0">
                    {totalAmount > 0 ? (
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
                            disabled={saving}
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
                                    {nextDate ? "Kaydet & Randevu Oluştur" : "Planı Kaydet"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
