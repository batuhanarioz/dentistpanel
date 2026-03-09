import React from "react";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { AppointmentFormState } from "@/hooks/useAppointmentManagement";

interface DateTimeSectionProps {
    formDate: string;
    setFormDate: (date: string) => void;
    formTime: string;
    setFormTime: (time: string) => void;
    today: string;
    todaySchedule: { open: string; close: string; enabled: boolean } | undefined;
    form: AppointmentFormState;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treatmentDefinitions: any[];
}

export function DateTimeSection({
    formDate, setFormDate, formTime, setFormTime, today, todaySchedule, form, setForm, treatmentDefinitions
}: DateTimeSectionProps) {
    return (
        <>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Tarih
                </label>
                <PremiumDatePicker
                    value={formDate}
                    onChange={setFormDate}
                    today={today}
                    compact
                />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Başlangıç saati
                </label>
                <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    min={todaySchedule?.open || "09:00"}
                    max={todaySchedule?.close || "19:00"}
                    step="300"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                />
                <p className="text-[9px] text-slate-500">
                    {todaySchedule?.open || "09:00"} – {todaySchedule?.close || "19:00"} arası
                </p>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Randevu tipi / işlem
                </label>
                <select
                    value={form.treatmentType}
                    onChange={(e) => {
                        const value = e.target.value;
                        const treatment = treatmentDefinitions.find((t) => t.name === value);
                        setForm((f) => ({
                            ...f,
                            treatmentType: value,
                            durationMinutes: treatment?.default_duration ?? f.durationMinutes,
                        }));
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                >
                    <option value="">Seçin</option>
                    {treatmentDefinitions.map((t) => (
                        <option key={t.id || t.name} value={t.name}>{t.name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Süre (dakika)
                </label>
                <input
                    type="number"
                    min={10}
                    max={180}
                    value={form.durationMinutes}
                    onChange={(e) =>
                        setForm((f) => ({
                            ...f,
                            durationMinutes: Number(e.target.value),
                        }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                />
            </div>
        </>
    );
}