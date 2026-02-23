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
    matchedPatientAllergies: string | null;
    matchedPatientMedicalAlerts: string | null;
    showAllInfo?: boolean;
}

export function PatientPicker({
    selectedPatientId, setSelectedPatientId, patientSearch, setPatientSearch,
    patientSearchResults, patientSearchLoading, setForm,
    setPhoneCountryCode, setPhoneNumber, duplicatePatient, handleUseDuplicate,
    phoneCountryCode, phoneNumber, form, patientMatchInfo, isNewPatient,
    matchedPatientAllergies, matchedPatientMedicalAlerts, showAllInfo = false
}: PatientPickerProps) {
    return (
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
                {showAllInfo && isNewPatient && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-600">Alerjiler (opsiyonel)</label>
                            <input
                                type="text"
                                value={form.allergies}
                                onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="İlaç, lateks vb."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-600">Tıbbi uyarılar (opsiyonel)</label>
                            <input
                                type="text"
                                value={form.medicalAlerts}
                                onChange={(e) => setForm((f) => ({ ...f, medicalAlerts: e.target.value }))}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Kan sulandırıcı, kalp vb."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
