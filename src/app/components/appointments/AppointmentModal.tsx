import React from "react";
import { TREATMENTS, REMINDER_OPTIONS, CHANNEL_OPTIONS } from "@/constants/appointments";
import { CalendarAppointment } from "@/hooks/useAppointmentManagement";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    editing: CalendarAppointment | null;
    formDate: string;
    setFormDate: (date: string) => void;
    formTime: string;
    setFormTime: (time: string) => void;
    today: string;
    todaySchedule: { open: string; close: string; enabled: boolean } | undefined;
    form: any;
    setForm: React.Dispatch<React.SetStateAction<any>>;
    doctors: string[];
    patients: any[];
    patientSearch: string;
    setPatientSearch: (val: string) => void;
    patientSearchResults: any[];
    patientSearchLoading: boolean;
    selectedPatientId: string;
    setSelectedPatientId: (val: string) => void;
    duplicatePatient: any;
    isNewPatient: boolean;
    patientMatchInfo: string | null;
    matchedPatientAllergies: string | null;
    matchedPatientMedicalAlerts: string | null;
    conflictWarning: string | null;
    phoneCountryCode: string;
    setPhoneCountryCode: (val: string) => void;
    phoneNumber: string;
    setPhoneNumber: (val: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleDelete: () => void;
    handleUseDuplicate: () => void;
}

export function AppointmentModal({
    isOpen, onClose, editing, formDate, setFormDate, formTime, setFormTime,
    today, todaySchedule, form, setForm, doctors, patients, patientSearch, setPatientSearch,
    patientSearchResults, patientSearchLoading, selectedPatientId, setSelectedPatientId,
    duplicatePatient, isNewPatient, patientMatchInfo, matchedPatientAllergies,
    matchedPatientMedicalAlerts, conflictWarning, phoneCountryCode, setPhoneCountryCode,
    phoneNumber, setPhoneNumber, handleSubmit, handleDelete, handleUseDuplicate
}: AppointmentModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-white/10 p-2">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">
                                    {editing ? "Randevuyu Düzenle" : "Yeni Randevu"}
                                </h2>
                                <p className="text-xs text-white/70">
                                    {formDate} · {formTime || "Saat seçilmedi"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[80vh] overflow-y-auto italic-none">
                    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1 md:col-span-1">
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
                        {editing && (() => {
                            const start = new Date(
                                `${editing.date}T${editing.startHour
                                    .toString()
                                    .padStart(2, "0")}:${(editing.startMinute ?? 0).toString().padStart(2, "0")}:00`
                            );
                            const end = new Date(
                                start.getTime() + editing.durationMinutes * 60000
                            );
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
                                            setForm((f: any) => ({
                                                ...f,
                                                result: e.target.value as
                                                    | ""
                                                    | "GERCEKLESTI"
                                                    | "IPTAL",
                                            }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Randevu tipi / işlem
                            </label>
                            <select
                                value={form.treatmentType}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const treatment = TREATMENTS.find(
                                        (t) => t.value === value
                                    );
                                    setForm((f: any) => ({
                                        ...f,
                                        treatmentType: value,
                                        durationMinutes:
                                            treatment?.duration ?? f.durationMinutes,
                                    }));
                                }}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                <option value="">Seçin</option>
                                {TREATMENTS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
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
                                    setForm((f: any) => ({
                                        ...f,
                                        durationMinutes: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            {formTime && (
                                <p className="text-[10px] text-slate-500">
                                    Bitiş saati yaklaşık{" "}
                                    {(() => {
                                        const [h, m] = formTime.split(":").map(Number);
                                        const totalMin = h * 60 + m + form.durationMinutes;
                                        return `${Math.floor(totalMin / 60)
                                            .toString()
                                            .padStart(2, "0")}:${(totalMin % 60)
                                                .toString()
                                                .padStart(2, "0")}`;
                                    })()}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Hasta seç
                            </label>
                            {!selectedPatientId ? (
                                <>
                                    <input
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Ad soyad veya telefon ile ara..."
                                    />
                                    <div className="max-h-40 overflow-y-auto border rounded-lg bg-white mt-1 shadow-sm">
                                        {patientSearchLoading && (
                                            <div className="px-3 py-2 text-[11px] text-slate-600">
                                                Hastalar yükleniyor...
                                            </div>
                                        )}
                                        {!patientSearchLoading &&
                                            patientSearch.trim() &&
                                            patientSearchResults.length === 0 && (
                                                <div className="px-3 py-2 text-[11px] text-slate-600">
                                                    Bu arama ile eşleşen hasta bulunamadı.
                                                </div>
                                            )}
                                        {!patientSearchLoading &&
                                            patientSearchResults.map((patient) => {
                                                return (
                                                    <div
                                                        key={patient.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedPatientId(patient.id);
                                                            setForm((f: any) => ({
                                                                ...f,
                                                                patientName: patient.full_name,
                                                                phone: patient.phone || "",
                                                                email: patient.email || "",
                                                                birthDate: patient.birth_date || "",
                                                            }));
                                                            const rawPhone = patient.phone || "";
                                                            let cleanPhone = rawPhone.replace(/\D/g, "");
                                                            if (rawPhone.startsWith("+90")) {
                                                                setPhoneCountryCode("+90");
                                                                setPhoneNumber(rawPhone.substring(3).replace(/\D/g, ""));
                                                            } else if (rawPhone.startsWith("+")) {
                                                                const match = rawPhone.match(/^(\+\d{1,3})(.*)$/);
                                                                setPhoneCountryCode(match?.[1] ?? "+90");
                                                                setPhoneNumber(match?.[2]?.replace(/\D/g, "") ?? "");
                                                            } else {
                                                                // Türkiye için akıllı temizleme
                                                                if (cleanPhone.length === 12 && cleanPhone.startsWith("90")) {
                                                                    cleanPhone = cleanPhone.substring(2);
                                                                    setPhoneCountryCode("+90");
                                                                } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
                                                                    cleanPhone = cleanPhone.substring(1);
                                                                    setPhoneCountryCode("+90");
                                                                } else if (cleanPhone.length === 10) {
                                                                    setPhoneCountryCode("+90");
                                                                } else {
                                                                    setPhoneCountryCode("+90");
                                                                }
                                                                setPhoneNumber(cleanPhone);
                                                            }
                                                            // Logic from hook usually handles this but we replicate here just in case
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-[11px] flex flex-col gap-0.5 transition-colors cursor-pointer hover:bg-slate-50"
                                                    >
                                                        <span className="font-medium text-slate-900 pointer-events-none">
                                                            {patient.full_name}{" "}
                                                            {patient.phone ? `· ${patient.phone}` : ""}
                                                        </span>
                                                        {patient.email && (
                                                            <span className="text-[10px] text-slate-600 pointer-events-none">
                                                                {patient.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-500">
                                        Hastayı arayın ve listeden seçin. Bulamadıysanız aşağıdaki alanlara manuel girin.
                                    </p>
                                </>
                            ) : (
                                <>
                                    {(() => {
                                        const selectedPatient = patients.find(p => p.id === selectedPatientId);
                                        if (!selectedPatient) return null;
                                        return (
                                            <div className="relative">
                                                <div className="w-full rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2.5 text-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-900">
                                                                {selectedPatient.full_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                                {selectedPatient.phone && `${selectedPatient.phone}`}
                                                                {selectedPatient.email && ` · ${selectedPatient.email}`}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPatientId("");
                                                                setPatientSearch("");
                                                                setForm((f: any) => ({
                                                                    ...f,
                                                                    patientName: "",
                                                                    phone: "",
                                                                    email: "",
                                                                    birthDate: "",
                                                                }));
                                                                setPhoneCountryCode("+90");
                                                                setPhoneNumber("");
                                                            }}
                                                            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 hover:bg-indigo-300 transition-colors"
                                                            title="Seçimi temizle"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <p className="mt-1 text-[10px] text-indigo-600">
                                        ✓ Hasta seçildi. Değiştirmek için X butonuna tıklayın.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Manuel hasta bilgileri - Yeni hasta veya düzenleme için */}
                        <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Hasta bilgileri {!selectedPatientId && "(Manuel giriş veya düzenleme)"}
                            </label>

                            {/* Duplicate Patient Warning Alert */}
                            {duplicatePatient && (
                                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                        </svg>
                                        <span>
                                            <span className="font-bold">Bu numara kayıtlı:</span> {duplicatePatient.full_name} ({duplicatePatient.phone})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUseDuplicate}
                                        className="shrink-0 rounded-md bg-amber-600 px-2 py-0.5 font-bold text-white hover:bg-amber-700 transition-colors"
                                    >
                                        Bu Hastayı Kullan
                                    </button>
                                </div>
                            )}

                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="flex gap-1">
                                    <input
                                        value={phoneCountryCode}
                                        onChange={(e) => {
                                            const code = e.target.value;
                                            setPhoneCountryCode(code);
                                            setForm((f: any) => ({ ...f, phone: code + phoneNumber }));
                                        }}
                                        className="w-[56px] shrink-0 rounded-lg border px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="+90"
                                    />
                                    <input
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => {
                                            const num = e.target.value.replace(/[^\d]/g, "");
                                            setPhoneNumber(num);
                                            setForm((f: any) => ({ ...f, phone: phoneCountryCode + num }));
                                        }}
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="5XX XXX XX XX"
                                    />
                                </div>
                                <input
                                    value={form.patientName}
                                    onChange={(e) =>
                                        setForm((f: any) => ({ ...f, patientName: e.target.value }))
                                    }
                                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="Hasta adı soyadı"
                                    required
                                />
                            </div>
                            {patientMatchInfo && (
                                <p className="mt-1 text-[10px] text-slate-600">
                                    {patientMatchInfo}{" "}
                                    <span className="font-semibold text-indigo-600">
                                        ({isNewPatient ? "Yeni hasta" : "Mevcut hasta"})
                                    </span>
                                </p>
                            )}
                            {(matchedPatientAllergies || matchedPatientMedicalAlerts) && (
                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px]">
                                    <p className="font-semibold text-amber-800 mb-1">Hasta alerji / tıbbi uyarı</p>
                                    {matchedPatientAllergies && (
                                        <p className="text-amber-900"><span className="font-medium">Alerjiler:</span> {matchedPatientAllergies}</p>
                                    )}
                                    {matchedPatientMedicalAlerts && (
                                        <p className="text-amber-900 mt-0.5"><span className="font-medium">Tıbbi uyarılar:</span> {matchedPatientMedicalAlerts}</p>
                                    )}
                                </div>
                            )}
                            {isNewPatient && (
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-600">Alerjiler (opsiyonel)</label>
                                        <input
                                            type="text"
                                            value={form.allergies}
                                            onChange={(e) => setForm((f: any) => ({ ...f, allergies: e.target.value }))}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="İlaç, lateks vb."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-600">Tıbbi uyarılar (opsiyonel)</label>
                                        <input
                                            type="text"
                                            value={form.medicalAlerts}
                                            onChange={(e) => setForm((f: any) => ({ ...f, medicalAlerts: e.target.value }))}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="Kan sulandırıcı, kalp vb."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Doğum tarihi
                            </label>
                            <PremiumDatePicker
                                value={form.birthDate || today}
                                onChange={(date) =>
                                    setForm((f: any) => ({ ...f, birthDate: date }))
                                }
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
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, email: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="ornek@hasta.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                TC Kimlik No <span className="text-slate-400 font-normal">(opsiyonel)</span>
                            </label>
                            <input
                                type="text"
                                maxLength={11}
                                value={form.tcIdentityNo}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                                    setForm((f: any) => ({ ...f, tcIdentityNo: val }));
                                }}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="Opsiyonel"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Doktor
                            </label>
                            <select
                                value={form.doctor}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setForm((f: any) => ({ ...f, doctor: value }));
                                }}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                {doctors.map((d) => (
                                    <option key={d} value={d}>
                                        {d || "Doktor atanmadı"}
                                    </option>
                                ))}
                            </select>
                            {conflictWarning && (
                                <p className="mt-1 text-[10px] text-rose-600 font-medium">
                                    {conflictWarning}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Kanal
                            </label>
                            <select
                                value={form.channel}
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, channel: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                    setForm((f: any) => ({
                                        ...f,
                                        status: e.target.value as
                                            | "ONAYLI"
                                            | "ONAY_BEKLIYOR",
                                    }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                <option value="ONAYLI">Onaylandı</option>
                                <option value="ONAY_BEKLIYOR">Onay bekliyor</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Tahmini ücret
                            </label>
                            <input
                                value={form.estimatedAmount}
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, estimatedAmount: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="Muayene sonrası netleşir"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                İletişim tercihi
                            </label>
                            <select
                                value={form.contactPreference}
                                onChange={(e) =>
                                    setForm((f: any) => ({
                                        ...f,
                                        contactPreference: e.target.value as
                                            | "WhatsApp"
                                            | "SMS"
                                            | "Arama",
                                    }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="SMS">SMS</option>
                                <option value="Arama">Arama</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Hatırlatma
                            </label>
                            <select
                                value={form.reminderMinutesBefore}
                                onChange={(e) =>
                                    setForm((f: any) => ({
                                        ...f,
                                        reminderMinutesBefore: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                {REMINDER_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Etiketler
                            </label>
                            <input
                                value={form.tags}
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, tags: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="Yeni hasta, Acil, VIP..."
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="block text-xs font-medium text-slate-700">
                                Randevu öncesi not / Hasta ile ilgili ön bilgiler
                            </label>
                            <textarea
                                value={form.patientNote}
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, patientNote: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                onChange={(e) =>
                                    setForm((f: any) => ({ ...f, treatmentNote: e.target.value }))
                                }
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                                        onChange={(e) =>
                                            setForm((f: any) => ({
                                                ...f,
                                                conversationId: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Opsiyonel"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-700">
                                        Kaynak message_id
                                    </label>
                                    <input
                                        value={form.messageId}
                                        onChange={(e) =>
                                            setForm((f: any) => ({
                                                ...f,
                                                messageId: e.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Opsiyonel"
                                    />
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="md:col-span-2 mt-4 pt-4 border-t flex items-center justify-between gap-2">
                            {editing && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                >
                                    Randevuyu sil
                                </button>
                            )}
                            <div className="ml-auto flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-xs font-medium text-white hover:from-indigo-700 hover:to-violet-600 transition-all font-bold"
                                >
                                    {editing ? "Kaydet" : "Oluştur"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
