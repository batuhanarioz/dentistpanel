import React from "react";
import { AppointmentFormState } from "@/hooks/useAppointmentManagement";
import { AppointmentStatus } from "@/types/database";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { useClinic } from "@/app/context/ClinicContext";

interface AppointmentDetailsProps {
    form: AppointmentFormState;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
    doctors: string[];
    conflictWarning: string | null;
    today: string;
}

export function AppointmentDetails({
    form, setForm, doctors, conflictWarning, today
}: AppointmentDetailsProps) {
    const { clinicSettings } = useClinic();
    const channelOptions = clinicSettings?.appointment_channels ?? [];

    return (
        <>
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
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <svg className="h-3.5 w-3.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <p className="text-[11px] font-bold text-amber-800">{conflictWarning}</p>
                    </div>
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
                    <option value="">Belirtilmedi</option>
                    {channelOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
                {channelOptions.length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">
                        Kanal eklemek için Klinik Ayarları → Kanal Yönetimi bölümünü kullanın.
                    </p>
                )}
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
                    <option value="scheduled">Taslak</option>
                    <option value="arrived">Geldi</option>
                    <option value="in_treatment">Tedavide</option>
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