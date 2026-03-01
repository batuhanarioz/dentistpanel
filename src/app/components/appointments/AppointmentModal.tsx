import React from "react";
import { ModalHeader } from "./modal/ModalHeader";
import { DateTimeSection } from "./modal/DateTimeSection";
import { PatientPicker } from "./modal/PatientPicker";
import { AppointmentDetails } from "./modal/AppointmentDetails";
import { PatientNotes } from "./modal/PatientNotes";
import { ModalFooter } from "./modal/ModalFooter";
import { CalendarAppointment, AppointmentFormState, PatientSearchResult } from "@/hooks/useAppointmentManagement";

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
    form: AppointmentFormState;
    setForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
    doctors: string[];
    patientSearch: string;
    setPatientSearch: (val: string) => void;
    patientSearchResults: PatientSearchResult[];
    patientSearchLoading: boolean;
    selectedPatientId: string;
    setSelectedPatientId: (val: string) => void;
    duplicatePatient: PatientSearchResult | null;
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

export function AppointmentModal(props: AppointmentModalProps) {
    const [showMoreInfo, setShowMoreInfo] = React.useState(false);

    if (!props.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={props.onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <ModalHeader
                    editing={!!props.editing}
                    formDate={props.formDate}
                    formTime={props.formTime}
                    onClose={props.onClose}
                    onSubmit={props.handleSubmit}
                    phoneNumber={props.phoneNumber}
                    phoneCountryCode={props.phoneCountryCode}
                />

                <div className="relative max-h-[80vh] flex flex-col italic-none">
                    <div className="px-6 py-5 overflow-y-auto">
                        <form id="appointment-form" onSubmit={props.handleSubmit} className="grid gap-3 md:grid-cols-2">
                            <DateTimeSection
                                formDate={props.formDate}
                                setFormDate={props.setFormDate}
                                formTime={props.formTime}
                                setFormTime={props.setFormTime}
                                today={props.today}
                                todaySchedule={props.todaySchedule}
                                form={props.form}
                                setForm={props.setForm}
                            />

                            <PatientPicker
                                selectedPatientId={props.selectedPatientId}
                                setSelectedPatientId={props.setSelectedPatientId}
                                patientSearch={props.patientSearch}
                                setPatientSearch={props.setPatientSearch}
                                patientSearchResults={props.patientSearchResults}
                                patientSearchLoading={props.patientSearchLoading}
                                setForm={props.setForm}
                                setPhoneCountryCode={props.setPhoneCountryCode}
                                setPhoneNumber={props.setPhoneNumber}
                                duplicatePatient={props.duplicatePatient}
                                handleUseDuplicate={props.handleUseDuplicate}
                                phoneCountryCode={props.phoneCountryCode}
                                phoneNumber={props.phoneNumber}
                                form={props.form}
                                patientMatchInfo={props.patientMatchInfo}
                                isNewPatient={props.isNewPatient}
                                matchedPatientAllergies={props.matchedPatientAllergies}
                                matchedPatientMedicalAlerts={props.matchedPatientMedicalAlerts}
                                showAllInfo={showMoreInfo}
                            />

                            {showMoreInfo && (
                                <>
                                    <AppointmentDetails
                                        form={props.form}
                                        setForm={props.setForm}
                                        editing={props.editing}
                                        doctors={props.doctors}
                                        conflictWarning={props.conflictWarning}
                                        today={props.today}
                                    />

                                    <PatientNotes
                                        form={props.form}
                                        setForm={props.setForm}
                                    />
                                </>
                            )}
                        </form>
                    </div>

                    {/* ALWAYS VISIBLE TOGGLE BUTTON (Sticky) */}
                    <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent px-6 py-3 border-t border-slate-50 flex justify-center z-10">
                        <button
                            type="button"
                            onClick={() => setShowMoreInfo(!showMoreInfo)}
                            className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 backdrop-blur-sm px-5 py-2.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95 group"
                        >
                            {showMoreInfo ? "Detayları Gizle" : "Daha Fazla Bilgi (Alerjiler, Notlar, vb.)"}
                            <svg
                                className={`h-4 w-4 transition-transform duration-300 ${showMoreInfo ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-6 pb-5">
                        <ModalFooter
                            editing={!!props.editing}
                            handleDelete={props.handleDelete}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
