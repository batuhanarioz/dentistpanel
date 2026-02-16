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
                    Tedavi sonrası not (doktor)
                </label>
                <textarea
                    value={form.treatmentNote}
                    onChange={(e) => setForm((f) => ({ ...f, treatmentNote: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    rows={2}
                    placeholder="Randevu sonrası doktor tarafından doldurulur..."
                />
            </div>
            {(form.channel === "WhatsApp" || form.channel === "whatsapp") && (
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
        </>
    );
}
