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
    if (!props.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={props.onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <ModalHeader
                    editing={!!props.editing}
                    formDate={props.formDate}
                    formTime={props.formTime}
                    onClose={props.onClose}
                />

                <div className="px-6 py-5 max-h-[80vh] overflow-y-auto italic-none">
                    <form onSubmit={props.handleSubmit} className="grid gap-3 md:grid-cols-2">
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
                        />

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

                        <ModalFooter
                            editing={!!props.editing}
                            onClose={props.onClose}
                            handleDelete={props.handleDelete}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
