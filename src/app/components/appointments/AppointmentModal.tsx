import React from "react";
import { ModalHeader } from "./modal/ModalHeader";
import { DateTimeSection } from "./modal/DateTimeSection";
import { PatientPicker } from "./modal/PatientPicker";
import { AppointmentDetails } from "./modal/AppointmentDetails";
import { PatientNotes } from "./modal/PatientNotes";
import { ModalFooter } from "./modal/ModalFooter";
import { CalendarAppointment, AppointmentFormState, PatientSearchResult } from "@/hooks/useAppointmentManagement";
import { CreateTreatmentPlanModal } from "@/app/components/treatments/CreateTreatmentPlanModal";
import { AnamnesisSection } from "@/app/components/patients/AnamnesisSection";
import { useAnamnesis, useAnamnesisMutation } from "@/hooks/useAnamnesis";
import type { PatientAnamnesis } from "@/types/database";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treatmentDefinitions: any[];
}

export function AppointmentModal(props: AppointmentModalProps) {
    const [showMoreInfo, setShowMoreInfo] = React.useState(false);
    const [showCreatePlan, setShowCreatePlan] = React.useState(false);
    const [showAnamnesisModal, setShowAnamnesisModal] = React.useState(false);

    // Mevcut hasta seçiliyken anamnezi yükle
    const activePatientId = props.selectedPatientId || props.editing?.patientId;
    const { data: anamnesis, isLoading: anamnesisLoading } = useAnamnesis(activePatientId || undefined);
    const saveAnamnesisMutation = useAnamnesisMutation(activePatientId || undefined);
    const handleSaveAnamnesis = async (
        draft: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">
    ) => {
        await saveAnamnesisMutation.mutateAsync(draft);
        setShowAnamnesisModal(false);
    };

    if (!props.isOpen) return null;

    return (
        <>
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
                                    treatmentDefinitions={props.treatmentDefinitions}
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
                                {showMoreInfo ? "Detayları Gizle" : "Daha Fazla Bilgi"}
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
                                onAddTreatmentPlan={props.editing ? () => setShowCreatePlan(true) : undefined}
                                onOpenAnamnesis={activePatientId ? () => setShowAnamnesisModal(true) : undefined}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {props.editing && (
                <CreateTreatmentPlanModal
                    open={showCreatePlan}
                    onClose={() => setShowCreatePlan(false)}
                    onSuccess={() => setShowCreatePlan(false)}
                    patientId={props.editing.patientId}
                    patientName={props.editing.patientName}
                    appointmentId={props.editing.id}
                    doctorId={props.editing.doctorId ?? undefined}
                />
            )}

            {/* Anamnez Modalı */}
            {showAnamnesisModal && activePatientId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAnamnesisModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">Anamnez</h3>
                                    <p className="text-[10px] font-medium text-slate-400">
                                        {props.editing?.patientName || props.form.patientName || "Hasta"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAnamnesisModal(false)}
                                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <AnamnesisSection
                                patientId={activePatientId}
                                data={anamnesis}
                                isLoading={anamnesisLoading}
                                onSave={handleSaveAnamnesis}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}