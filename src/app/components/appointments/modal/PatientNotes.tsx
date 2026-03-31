import React from "react";

import { AppointmentFormState } from "@/hooks/useAppointmentManagement";

interface PatientNotesProps {
    form: AppointmentFormState;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
}

export function PatientNotes({ form, setForm }: PatientNotesProps) {
    return (
        <>

            <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Randevu öncesi not / Hasta ile ilgili ön bilgiler
                </label>
                <textarea
                    value={form.patientNote}
                    onChange={(e) => setForm((f) => ({ ...f, patientNote: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    rows={2}
                    placeholder="Hastanın şikayeti, talep veya randevu öncesi notlar..."
                />
            </div>
            <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Tedavi sonrası not (hekim)
                </label>
                <textarea
                    value={form.treatmentNote}
                    onChange={(e) => setForm((f) => ({ ...f, treatmentNote: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    rows={2}
                    placeholder="Randevu sonrası hekim tarafından doldurulur..."
                />
            </div>
            {form.channel === "whatsapp" && (
                <>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                            Kaynak conversation_id
                        </label>
                        <input
                            value={form.conversationId}
                            onChange={(e) => setForm((f) => ({ ...f, conversationId: e.target.value }))}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                            placeholder="Opsiyonel"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                            Kaynak message_id
                        </label>
                        <input
                            value={form.messageId}
                            onChange={(e) => setForm((f) => ({ ...f, messageId: e.target.value }))}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                            placeholder="Opsiyonel"
                        />
                    </div>
                </>
            )}
            <div className="md:col-span-2 space-y-1 mt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    Hasta Modu (Mood)
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                </label>
                <div className="flex justify-between items-center px-4 py-3 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-inner">
                    {[
                        { val: "😊", label: "Rahat", color: "text-emerald-500" },
                        { val: "😨", label: "Endişeli", color: "text-amber-500" },
                        { val: "🤒", label: "Ağrılı", color: "text-rose-500" },
                        { val: "✨", label: "Heyecanlı", color: "text-fuchsia-500" },
                        { val: "😴", label: "Sakin", color: "text-indigo-500" },
                    ].map((m) => (
                        <button
                            key={m.val}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, patientMood: m.val }))}
                            className={`flex flex-col items-center gap-1.5 transition-all duration-300 hover:scale-125 active:scale-90 ${form.patientMood === m.val ? "opacity-100 scale-110 drop-shadow-md" : "opacity-30 grayscale blur-[0.3px] hover:blur-0"}`}
                        >
                            <span className="text-2xl" role="img" aria-label={m.label}>{m.val}</span>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${form.patientMood === m.val ? m.color : "text-slate-400"}`}>{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}