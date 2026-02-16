import React from "react";
import { CHANNEL_OPTIONS } from "@/constants/appointments";
import { AppointmentFormState, CalendarAppointment } from "@/hooks/useAppointmentManagement";
import { AppointmentStatus } from "@/types/database";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

interface AppointmentDetailsProps {
    form: AppointmentFormState;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
    editing: CalendarAppointment | null;
    doctors: string[];
    conflictWarning: string | null;
    today: string;
}

export function AppointmentDetails({
    form, setForm, editing, doctors, conflictWarning, today
}: AppointmentDetailsProps) {
    return (
        <>
            {editing && (() => {
                const start = new Date(
                    `${editing.date}T${editing.startHour.toString().padStart(2, "0")}:${(editing.startMinute ?? 0).toString().padStart(2, "0")}:00`
                );
                const end = new Date(start.getTime() + editing.durationMinutes * 60000);
                const isPast = end < new Date();
                if (!isPast) return null;
                return (
                    <div className="space-y-1 md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700">
                            Randevu sonucu
                        </label>
                        <select
                            value={form.result}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    result: e.target.value as "" | "GERCEKLESTI" | "IPTAL",
                                }))
                            }
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                        >
                            <option value="">
                                Otomatik (varsayılan: Randevu gerçekleştirildi)
                            </option>
                            <option value="GERCEKLESTI">Randevu gerçekleştirildi</option>
                            <option value="IPTAL">Randevu iptal edildi</option>
                        </select>
                    </div>
                );
            })()}

            {/* Moved to DateTimeSection */}

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Doğum tarihi
                </label>
                <PremiumDatePicker
                    value={form.birthDate || today}
                    onChange={(date) => setForm((f) => ({ ...f, birthDate: date }))}
                    today={today}
                    compact
                />
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    E-posta
                </label>
                <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    placeholder="ornek@hasta.com"
                />
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    TC Kimlik No
                </label>
                <input
                    type="text"
                    maxLength={11}
                    value={form.tcIdentityNo}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setForm((f) => ({ ...f, tcIdentityNo: val }));
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    placeholder="Opsiyonel"
                />
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Doktor
                </label>
                <select
                    value={form.doctor}
                    onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                >
                    {doctors.map((d) => (
                        <option key={d} value={d}>{d || "Doktor atanmadı"}</option>
                    ))}
                </select>
                {conflictWarning && (
                    <p className="mt-1 text-[10px] text-rose-600 font-medium">{conflictWarning}</p>
                )}
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Kanal
                </label>
                <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                >
                    {CHANNEL_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Durum
                </label>
                <select
                    value={form.status}
                    onChange={(e) =>
                        setForm((f) => ({
                            ...f,
                            status: e.target.value as AppointmentStatus,
                        }))
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                >
                    <option value="confirmed">Planlandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal Edildi</option>
                    <option value="no_show">Gelmedi</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Tahmini ücret
                </label>
                <input
                    value={form.estimatedAmount}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedAmount: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    placeholder="Muayene sonrası netleşir"
                />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                    Etiketler
                </label>
                <input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    placeholder="Yeni hasta, Acil, VIP..."
                />
            </div>
        </>
    );
}
