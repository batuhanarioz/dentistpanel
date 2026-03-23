"use client";
import React, { useState, useEffect } from "react";
import {
    PatientAnamnesis,
    EMPTY_ANAMNESIS,
    SYSTEMIC_CONDITIONS,
    ALLERGY_OPTIONS,
    SmokingStatus,
    AlcoholStatus,
} from "@/types/database";

interface AnamnesisSectionProps {
    patientId: string;
    data: PatientAnamnesis | null | undefined;
    isLoading: boolean;
    onSave: (draft: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">) => Promise<void>;
    editMode?: boolean;
    onEditModeChange?: (v: boolean) => void;
    hideEditButton?: boolean;
}

type Draft = Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">;

// ─── küçük yardımcı bileşenler ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            {children}
        </p>
    );
}

function CheckChip({
    label,
    checked,
    onChange,
    danger,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all select-none ${
                checked
                    ? danger
                        ? "bg-rose-100 border-rose-300 text-rose-700"
                        : "bg-emerald-100 border-emerald-300 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
        >
            <span
                className={`h-3 w-3 rounded-full border-2 flex-shrink-0 transition-colors ${
                    checked
                        ? danger
                            ? "bg-rose-500 border-rose-500"
                            : "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 bg-white"
                }`}
            />
            {label}
        </button>
    );
}

function Toggle({
    label,
    checked,
    onChange,
    danger,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between w-full py-1.5 group"
        >
            <span className={`text-xs font-semibold ${checked ? (danger ? "text-rose-700" : "text-emerald-700") : "text-slate-600"}`}>
                {label}
            </span>
            <div
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    checked ? (danger ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-200"
                }`}
            >
                <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        checked ? "translate-x-4" : "translate-x-0.5"
                    }`}
                />
            </div>
        </button>
    );
}

// ─── Anamnez özet rozetleri (sadece okuma modunda) ─────────────────────────────

function RiskBadge({ label, color }: { label: string; color: "red" | "amber" | "blue" }) {
    const cls = {
        red: "bg-rose-100 text-rose-700 border-rose-200",
        amber: "bg-amber-100 text-amber-700 border-amber-200",
        blue: "bg-blue-100 text-blue-700 border-blue-200",
    }[color];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cls}`}>
            {label}
        </span>
    );
}

// ─── Ana bileşen ───────────────────────────────────────────────────────────────

export function AnamnesisSection({ patientId, data, isLoading, onSave, editMode: controlledEditMode, onEditModeChange, hideEditButton }: AnamnesisSectionProps) {
    const isControlled = controlledEditMode !== undefined;
    const [internalEditMode, setInternalEditMode] = useState(false);
    const editMode = isControlled ? controlledEditMode : internalEditMode;
    const setEditMode = (v: boolean) => {
        if (isControlled) {
            onEditModeChange?.(v);
        } else {
            setInternalEditMode(v);
        }
    };
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Draft>({ ...EMPTY_ANAMNESIS });

    // data yüklendiğinde draft'ı güncelle
    useEffect(() => {
        if (data) {
            const { id: _id, clinic_id: _c, patient_id: _p, updated_at: _u, updated_by: _ub, ...rest } = data;
            setDraft(rest as Draft);
        } else {
            setDraft({ ...EMPTY_ANAMNESIS });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, patientId]);

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
        setDraft(prev => ({ ...prev, [key]: value }));

    const toggleArray = (key: "systemic_conditions" | "allergies_list", item: string) => {
        setDraft(prev => {
            const arr = prev[key] as string[];
            return {
                ...prev,
                [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item],
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(draft);
        setSaving(false);
        setEditMode(false);
    };

    const handleCancel = () => {
        if (data) {
            const { id: _id, clinic_id: _c, patient_id: _p, updated_at: _u, updated_by: _ub, ...rest } = data;
            setDraft(rest as Draft);
        } else {
            setDraft({ ...EMPTY_ANAMNESIS });
        }
        setEditMode(false);
    };

    // ── Risk özeti hesapla (okuma modu için) ──────────────────────────────────
    const source = editMode ? draft : (data ?? EMPTY_ANAMNESIS);
    const criticalFlags = [
        source.has_pacemaker && "Pacemaker",
        source.had_organ_transplant && "Organ Nakli",
        source.uses_anticoagulants && "Kan Sulandırıcı",
        source.prolonged_bleeding_history && "Uzun Kanama",
    ].filter(Boolean) as string[];

    const warningFlags = [
        source.is_pregnant && `Gebelik${source.pregnancy_month ? ` (${source.pregnancy_month}. ay)` : ""}`,
        source.is_breastfeeding && "Emziriyor",
        source.has_prosthetic_joint && "Protez Eklem",
        source.dental_anxiety && "Diş Hekimi Korkusu",
        source.bad_anesthesia_history && "Kötü Anestezi Deneyimi",
    ].filter(Boolean) as string[];

    const hasAnyData = data && (
        data.systemic_conditions.length > 0 ||
        data.allergies_list.length > 0 ||
        criticalFlags.length > 0 ||
        warningFlags.length > 0 ||
        data.current_medications ||
        data.additional_notes
    );

    // ── Yükleniyor ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-16 text-slate-400 text-xs font-bold">
                Yükleniyor...
            </div>
        );
    }

    // ── Okuma modu ────────────────────────────────────────────────────────────
    if (!editMode) {
        return (
            <div className="space-y-3">
                {/* Düzenle butonu */}
                {!hideEditButton && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setEditMode(true)}
                            className="h-8 px-4 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                            Düzenle
                        </button>
                    </div>
                )}
                {/* Kritik uyarılar */}
                {(criticalFlags.length > 0 || warningFlags.length > 0 || (data?.allergies_list?.length ?? 0) > 0) && (
                    <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Dikkat Gerektiren Durumlar</p>
                        <div className="flex flex-wrap gap-1.5">
                            {criticalFlags.map(f => <RiskBadge key={f} label={f} color="red" />)}
                            {warningFlags.map(f => <RiskBadge key={f} label={f} color="amber" />)}
                            {(data?.allergies_list ?? []).map(a => {
                                const opt = ALLERGY_OPTIONS.find(o => o.key === a);
                                return <RiskBadge key={a} label={`Alerji: ${opt?.label ?? a}`} color="red" />;
                            })}
                            {data?.allergies_other && <RiskBadge label={`Alerji: ${data.allergies_other}`} color="red" />}
                        </div>
                    </div>
                )}

                {/* Sistemik hastalıklar */}
                {(data?.systemic_conditions?.length ?? 0) > 0 && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Sistemik Hastalıklar</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(data?.systemic_conditions ?? []).map(c => {
                                const opt = SYSTEMIC_CONDITIONS.find(s => s.key === c);
                                return (
                                    <span key={c} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                        {opt?.label ?? c}
                                    </span>
                                );
                            })}
                            {data?.systemic_other && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    {data.systemic_other}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* İlaçlar */}
                {data?.current_medications && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Kullanılan İlaçlar</p>
                        <p className="text-xs font-medium text-slate-600">{data.current_medications}</p>
                    </div>
                )}

                {/* Yaşam tarzı */}
                {(data?.smoking_status !== "never" || data?.alcohol_status !== "never") && (
                    <div className="flex gap-3">
                        {data?.smoking_status !== "never" && (
                            <span className="text-xs font-semibold text-slate-500">
                                🚬 Sigara: {({ occasional: "Arada", regular: "Düzenli", quit: "Bıraktı" } as Record<string, string>)[data?.smoking_status ?? ""] ?? "-"}
                            </span>
                        )}
                        {data?.alcohol_status !== "never" && (
                            <span className="text-xs font-semibold text-slate-500">
                                🍷 Alkol: {({ occasional: "Arada", regular: "Düzenli" } as Record<string, string>)[data?.alcohol_status ?? ""] ?? "-"}
                            </span>
                        )}
                    </div>
                )}

                {/* Acil iletişim */}
                {data?.emergency_contact_name && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Acil İletişim</p>
                        <p className="text-xs font-medium text-slate-600">
                            {data.emergency_contact_name}
                            {data.emergency_contact_relation && ` (${data.emergency_contact_relation})`}
                            {data.emergency_contact_phone && ` — ${data.emergency_contact_phone}`}
                        </p>
                    </div>
                )}

                {/* Ek notlar */}
                {data?.additional_notes && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Ek Notlar</p>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{data.additional_notes}</p>
                    </div>
                )}

                {!hasAnyData && (
                    <p className="text-xs font-medium text-slate-400 text-center py-4">
                        Henüz anamnez bilgisi eklenmemiş.
                    </p>
                )}

                {data?.updated_at && (
                    <p className="text-[10px] text-slate-300 text-right">
                        Güncellendi: {new Date(data.updated_at).toLocaleDateString("tr-TR")}
                    </p>
                )}
            </div>
        );
    }

    // ── Düzenleme modu ────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* Sistemik hastalıklar */}
            <div>
                <SectionTitle>Sistemik Hastalıklar</SectionTitle>
                <div className="flex flex-wrap gap-2">
                    {SYSTEMIC_CONDITIONS.map(({ key, label }) => (
                        <CheckChip
                            key={key}
                            label={label}
                            checked={draft.systemic_conditions.includes(key)}
                            onChange={() => toggleArray("systemic_conditions", key)}
                        />
                    ))}
                </div>
                <input
                    type="text"
                    className="mt-2 w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                    placeholder="Diğer hastalık varsa belirtiniz..."
                    value={draft.systemic_other ?? ""}
                    onChange={e => set("systemic_other", e.target.value || null)}
                />
            </div>

            {/* İlaçlar */}
            <div>
                <SectionTitle>Kullanılan İlaçlar</SectionTitle>
                <textarea
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
                    rows={2}
                    placeholder="Kullandığı ilaçları belirtiniz..."
                    value={draft.current_medications ?? ""}
                    onChange={e => set("current_medications", e.target.value || null)}
                />
                <div className="mt-2">
                    <Toggle
                        label="Kan sulandırıcı / Antikoagülan kullanıyor"
                        checked={draft.uses_anticoagulants}
                        onChange={v => set("uses_anticoagulants", v)}
                        danger
                    />
                    {draft.uses_anticoagulants && (
                        <input
                            type="text"
                            className="mt-1.5 w-full text-xs border border-rose-200 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-400 bg-rose-50"
                            placeholder="İlaç adı (örn: Warfarin, Aspirin...)"
                            value={draft.anticoagulant_name ?? ""}
                            onChange={e => set("anticoagulant_name", e.target.value || null)}
                        />
                    )}
                </div>
            </div>

            {/* Alerjiler */}
            <div>
                <SectionTitle>Alerjiler</SectionTitle>
                <div className="flex flex-wrap gap-2">
                    {ALLERGY_OPTIONS.map(({ key, label }) => (
                        <CheckChip
                            key={key}
                            label={label}
                            checked={draft.allergies_list.includes(key)}
                            onChange={() => toggleArray("allergies_list", key)}
                            danger
                        />
                    ))}
                </div>
                <input
                    type="text"
                    className="mt-2 w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                    placeholder="Diğer alerji varsa belirtiniz..."
                    value={draft.allergies_other ?? ""}
                    onChange={e => set("allergies_other", e.target.value || null)}
                />
            </div>

            {/* Geçmiş */}
            <div>
                <SectionTitle>Geçirilmiş Ameliyatlar / Önemli Hastalıklar</SectionTitle>
                <textarea
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
                    rows={2}
                    placeholder="Geçirilen ameliyatlar veya önemli hastalıklar..."
                    value={draft.previous_surgeries ?? ""}
                    onChange={e => set("previous_surgeries", e.target.value || null)}
                />
            </div>

            {/* Özel durumlar */}
            <div>
                <SectionTitle>Özel Durumlar</SectionTitle>
                <div className="space-y-1 divide-y divide-slate-100">
                    <Toggle label="Gebelik" checked={draft.is_pregnant} onChange={v => set("is_pregnant", v)} danger />
                    {draft.is_pregnant && (
                        <div className="py-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Kaçıncı ay?</label>
                            <input
                                type="number"
                                min={1}
                                max={9}
                                className="mt-1 w-24 text-xs border border-rose-200 rounded-xl px-3 py-1.5 focus:outline-none bg-rose-50"
                                placeholder="Ay"
                                value={draft.pregnancy_month ?? ""}
                                onChange={e => set("pregnancy_month", e.target.value ? parseInt(e.target.value) : null)}
                            />
                        </div>
                    )}
                    <Toggle label="Emziriyor" checked={draft.is_breastfeeding} onChange={v => set("is_breastfeeding", v)} danger />
                    <Toggle label="Pacemaker (Kalp Pili)" checked={draft.has_pacemaker} onChange={v => set("has_pacemaker", v)} danger />
                    <Toggle label="Protez Eklem" checked={draft.has_prosthetic_joint} onChange={v => set("has_prosthetic_joint", v)} />
                    <Toggle label="Organ Nakli" checked={draft.had_organ_transplant} onChange={v => set("had_organ_transplant", v)} danger />
                </div>
            </div>

            {/* Diş geçmişi */}
            <div>
                <SectionTitle>Diş Hekimliği Geçmişi</SectionTitle>
                <div className="space-y-1 divide-y divide-slate-100">
                    <Toggle label="Diş hekimi korkusu / anksiyete" checked={draft.dental_anxiety} onChange={v => set("dental_anxiety", v)} />
                    <Toggle label="Kötü anestezi deneyimi geçirdi" checked={draft.bad_anesthesia_history} onChange={v => set("bad_anesthesia_history", v)} />
                    <Toggle label="Uzun süreli kanama geçmişi var" checked={draft.prolonged_bleeding_history} onChange={v => set("prolonged_bleeding_history", v)} danger />
                </div>
            </div>

            {/* Yaşam tarzı */}
            <div>
                <SectionTitle>Yaşam Tarzı</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block mb-1">Sigara</label>
                        <select
                            value={draft.smoking_status}
                            onChange={e => set("smoking_status", e.target.value as SmokingStatus)}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white"
                        >
                            <option value="never">Kullanmıyor</option>
                            <option value="occasional">Arada</option>
                            <option value="regular">Düzenli</option>
                            <option value="quit">Bıraktı</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block mb-1">Alkol</label>
                        <select
                            value={draft.alcohol_status}
                            onChange={e => set("alcohol_status", e.target.value as AlcoholStatus)}
                            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white"
                        >
                            <option value="never">Kullanmıyor</option>
                            <option value="occasional">Arada</option>
                            <option value="regular">Düzenli</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Acil iletişim */}
            <div>
                <SectionTitle>Acil İletişim</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                        type="text"
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                        placeholder="Yakının adı"
                        value={draft.emergency_contact_name ?? ""}
                        onChange={e => set("emergency_contact_name", e.target.value || null)}
                    />
                    <input
                        type="text"
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                        placeholder="Telefon"
                        value={draft.emergency_contact_phone ?? ""}
                        onChange={e => set("emergency_contact_phone", e.target.value || null)}
                    />
                    <input
                        type="text"
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                        placeholder="Yakınlık (eş, anne...)"
                        value={draft.emergency_contact_relation ?? ""}
                        onChange={e => set("emergency_contact_relation", e.target.value || null)}
                    />
                </div>
            </div>

            {/* Ek notlar */}
            <div>
                <SectionTitle>Ek Notlar</SectionTitle>
                <textarea
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 resize-none"
                    rows={3}
                    placeholder="Diğer önemli bilgiler..."
                    value={draft.additional_notes ?? ""}
                    onChange={e => set("additional_notes", e.target.value || null)}
                />
            </div>

            {/* Aksiyon butonları */}
            <div className="flex justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="h-9 px-5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                    Vazgeç
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-9 px-6 rounded-xl bg-[#007f6e] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#006d5e] transition-colors disabled:opacity-60"
                >
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
            </div>
        </div>
    );
}
