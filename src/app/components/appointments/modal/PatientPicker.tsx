import React from "react";
import { PatientSearchResult, AppointmentFormState } from "@/hooks/useAppointmentManagement";

interface PatientPickerProps {
    selectedPatientId: string;
    setSelectedPatientId: (val: string) => void;
    patientSearch: string;
    setPatientSearch: (val: string) => void;
    patientSearchResults: PatientSearchResult[];
    patientSearchLoading: boolean;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
    setPhoneCountryCode: (val: string) => void;
    setPhoneNumber: (val: string) => void;
    duplicatePatient: PatientSearchResult | null;
    handleUseDuplicate: () => void;
    phoneCountryCode: string;
    phoneNumber: string;
    form: AppointmentFormState;
    patientMatchInfo: string | null;
    isNewPatient: boolean;
}

export function PatientPicker({
    selectedPatientId, setSelectedPatientId, patientSearch, setPatientSearch,
    patientSearchResults, patientSearchLoading, setForm,
    setPhoneCountryCode, setPhoneNumber, duplicatePatient, handleUseDuplicate,
    phoneCountryCode, phoneNumber, form, patientMatchInfo, isNewPatient,
}: PatientPickerProps) {
    return (
        <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
            <label className="block text-xs font-medium text-slate-700">
                Hasta seç
            </label>
            {!selectedPatientId ? (
                <>
                    <div className="flex gap-2">
                        <input
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            placeholder="Ad soyad veya telefon ile ara..."
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const qrUrl = `https://dentist-panel.vercel.app/register?clinic=${form.patientName || "new"}`;
                                window.open(`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(qrUrl)}&choe=UTF-8`, "_blank");
                            }}
                            className="group relative flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
                            title="Hızlı Kayıt QR Kodu"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.875 15.75a1.125 1.125 0 01-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a1.125 1.125 0 011.125-1.125h1.5a1.125 1.125 0 011.125 1.125v1.5zM16.875 18.75v.75c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a1.125 1.125 0 011.125-1.125h.75m0 3h.75a1.125 1.125 0 001.125-1.125v-1.5a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 00-1.125 1.125v1.5a1.125 1.125 0 001.125 1.125z" />
                            </svg>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none uppercase tracking-widest">
                                HIZLI KAYIT QR
                            </div>
                        </button>
                    </div>
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
                            patientSearchResults.map((patient) => (
                                <div
                                    key={patient.id}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedPatientId(patient.id);
                                        setForm((f) => ({
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
                                            if (cleanPhone.length === 12 && cleanPhone.startsWith("90")) {
                                                cleanPhone = cleanPhone.substring(2);
                                                setPhoneCountryCode("+90");
                                            } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
                                                cleanPhone = cleanPhone.substring(1);
                                                setPhoneCountryCode("+90");
                                            } else {
                                                setPhoneCountryCode("+90");
                                            }
                                            setPhoneNumber(cleanPhone);
                                        }
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
                            ))}
                    </div>
                </>
            ) : (
                <div className="relative">
                    <div className="w-full rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900">
                                    {form.patientName}
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                    {form.phone && `${form.phone}`}
                                    {form.email && ` · ${form.email}`}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPatientId("");
                                    setPatientSearch("");
                                    setForm((f) => ({
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
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-1 md:col-span-2 border-t pt-3 mt-1">
                <label className="block text-xs font-medium text-slate-700">
                    Hasta bilgileri {!selectedPatientId && "(Manuel giriş veya düzenleme)"}
                </label>

                {duplicatePatient && (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px]">
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
                            className="shrink-0 rounded-md bg-amber-600 px-2 py-0.5 font-bold text-white hover:bg-amber-700"
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
                                setForm((f) => ({ ...f, phone: code + phoneNumber }));
                            }}
                            className="w-[56px] shrink-0 rounded-lg border px-2 py-2 text-sm text-center focus:outline-none"
                            placeholder="+90"
                        />
                        <input
                            required
                            value={phoneNumber}
                            onChange={(e) => {
                                const num = e.target.value.replace(/[^\d]/g, "");
                                setPhoneNumber(num);
                                setForm((f) => ({ ...f, phone: phoneCountryCode + num }));
                            }}
                            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                            placeholder="5XX XXX XX XX"
                        />
                    </div>
                    <input
                        value={form.patientName}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, patientName: e.target.value }))
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
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
            </div>
        </div>
    );
}