import React, { useState, useEffect, useMemo } from "react";
import { PatientRow, PatientAppointment, PatientPayment } from "@/hooks/usePatients";
import { useClinic } from "@/app/context/ClinicContext";
import { isPaid, getPaymentStatusConfig, normalizePaymentMethod } from "@/constants/payments";
import { useTreatmentPlans, useTreatmentPlanMutations, PLAN_STATUS_CONFIG, ITEM_STATUS_CONFIG } from "@/hooks/useTreatmentPlanning";
import { CreateTreatmentPlanModal } from "@/app/components/treatments/CreateTreatmentPlanModal";
import { ToothChart } from "@/app/components/dental/ToothChart";
import { useDentalChart, useDentalChartMutation } from "@/hooks/useDentalChart";
import { AnamnesisSection } from "@/app/components/patients/AnamnesisSection";
import { useAnamnesis, useAnamnesisMutation } from "@/hooks/useAnamnesis";
import type { TeethData, ToothData, PatientAnamnesis } from "@/types/database";
import { printReceipt } from "@/lib/receiptGenerator";
import { useAppointmentManagement } from "@/hooks/useAppointmentManagement";
import { AppointmentModal } from "@/app/components/appointments/AppointmentModal";
import { QuickPaymentModal } from "@/app/components/dashboard/QuickPaymentModal";

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientRow | null;
    appointments: PatientAppointment[];
    payments: PatientPayment[];
    onDelete: (id: string) => Promise<boolean>;
    onUpdate: (id: string, updates: Partial<PatientRow>) => Promise<boolean>;
}

export function PatientDetailModal({
    isOpen,
    onClose,
    patient,
    appointments,
    payments,
    onDelete,
    onUpdate
}: PatientDetailModalProps) {
    const clinic = useClinic();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Tedavi planları
    const { data: treatmentPlans = [], isLoading: plansLoading } = useTreatmentPlans(isOpen ? patient?.id : undefined);
    const { updateStatus: updatePlanStatus, removePlan } = useTreatmentPlanMutations(patient?.id);
    const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
    const [showCreatePlan, setShowCreatePlan] = useState(false);

    // Anamnez
    const { data: anamnesis, isLoading: anamnesisLoading } = useAnamnesis(isOpen ? patient?.id : undefined);
    const saveAnamnesisMutation = useAnamnesisMutation(patient?.id);
    const handleSaveAnamnesis = async (
        draft: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by">
    ) => {
        await saveAnamnesisMutation.mutateAsync(draft);
    };

    // Diş şeması
    const { data: dentalChart, isLoading: chartLoading } = useDentalChart(isOpen ? patient?.id : undefined);
    const saveChart = useDentalChartMutation(patient?.id);
    const [chartDraft, setChartDraft] = useState<TeethData>({});
    const [chartEditMode, setChartEditMode] = useState(false);
    const [chartSaving, setChartSaving] = useState(false);

    useEffect(() => {
        setChartDraft(dentalChart?.teeth_data ?? {});
    }, [dentalChart, patient?.id]);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [anamnesisEditMode, setAnamnesisEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<PatientRow>>({});
    const [saving, setSaving] = useState(false);

    // Randevu oluşturma (inline)
    const apptMgmt = useAppointmentManagement();

    // Ödeme ekleme (inline) — seçili randevu üzerinden
    const [paymentTarget, setPaymentTarget] = useState<{ appointmentId: string; patientName: string; amount: number } | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setAnamnesisEditMode(false);
            setChartEditMode(false);
        }
        if (patient) {
            setEditForm({
                full_name: patient.full_name,
                phone: patient.phone,
                email: patient.email,
                birth_date: patient.birth_date,
                tc_identity_no: patient.tc_identity_no,
                gender: patient.gender,
                blood_group: patient.blood_group,
                address: patient.address,
                occupation: patient.occupation,
                notes: patient.notes,
            });
        }
    }, [patient, isOpen]);

    // Stats calculations
    const stats = useMemo(() => {
        const totalVisits = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const totalPaid = payments.reduce((sum, p) => isPaid(p.status) ? sum + p.amount : sum, 0);
        const totalPending = payments
            .filter(p => p.status === 'pending' || p.status === 'partial')
            .reduce((sum, p) => sum + p.amount, 0);
        const pastAppts = appointments
            .filter(a => a.status !== 'cancelled' && new Date(a.starts_at) <= new Date())
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        const lastVisit = pastAppts[0] ?? null;
        return { totalVisits, completed, cancelled, totalPaid, totalPending, lastVisit };
    }, [appointments, payments]);

    if (!isOpen || !patient) return null;

    const age = patient.birth_date
        ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

    const handlePlanCreated = () => {
        setShowCreatePlan(false);
    };

    const handleToothChange = (toothNo: string, data: ToothData | null) => {
        setChartDraft(prev => {
            const next = { ...prev };
            if (data === null) delete next[toothNo];
            else next[toothNo] = data;
            return next;
        });
    };

    const handleChartSave = async () => {
        if (!patient) return;
        setChartSaving(true);
        await saveChart.mutateAsync(chartDraft);
        setChartSaving(false);
        setChartEditMode(false);
    };

    const handleChartCancel = () => {
        setChartDraft(dentalChart?.teeth_data ?? {});
        setChartEditMode(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(patient.id);
        setDeleting(false);
        setShowDeleteConfirm(false);
    };

    const handleSave = async () => {
        setSaving(true);
        // null değerleri çıkar — schema undefined bekliyor, null değil
        const filtered = Object.fromEntries(
            Object.entries(editForm).filter(([, v]) => v !== null && v !== undefined)
        ) as Partial<PatientRow>;
        const success = await onUpdate(patient.id, filtered);
        if (success) setIsEditing(false);
        setSaving(false);
    };

    const downloadData = (format: 'csv' | 'txt') => {
        const dateStr = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
        const fileName = `${patient.full_name}-${clinic.clinicName || "Klinik"}-${dateStr}.${format}`;

        let content = "";
        if (format === 'csv') {
            const headers = ["Tür", "Tarih", "İşlem/Detay", "Durum", "Tutar/Not"];
            const rows = [
                ["HASTA BİLGİLERİ"],
                ["Ad Soyad", patient.full_name],
                ["Telefon", patient.phone || "-"],
                ["Kayıt Tarihi", new Date(patient.created_at).toLocaleDateString("tr-TR")],
                [""],
                ["RANDEVU GEÇMİŞİ"],
                headers,
                ...appointments.map(a => [
                    "Randevu",
                    new Date(a.starts_at).toLocaleDateString("tr-TR"),
                    a.treatment_type || "-",
                    a.status,
                    a.treatment_note || "-"
                ]),
                [""],
                ["ÖDEME HAREKETLERİ"],
                headers,
                ...payments.map(p => [
                    "Ödeme",
                    p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "-",
                    p.method || "-",
                    p.status || "-",
                    `${p.amount} ₺`
                ])
            ];
            content = "\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
        } else {
            content = `HASTA DETAY RAPORU\n`;
            content += `====================================\n`;
            content += `Ad Soyad: ${patient.full_name}\n`;
            content += `Telefon: ${patient.phone || "-"}\n`;
            content += `E-posta: ${patient.email || "-"}\n`;
            content += `TC No: ${patient.tc_identity_no || "-"}\n`;
            content += `Cinsiyet: ${patient.gender || "-"}\n`;
            content += `Kan Grubu: ${patient.blood_group || "-"}\n`;
            content += `Meslek: ${patient.occupation || "-"}\n`;
            content += `Adres: ${patient.address || "-"}\n`;
            content += `Kayıt Tarihi: ${new Date(patient.created_at).toLocaleDateString("tr-TR")}\n`;
            if (patient.notes) content += `Genel Notlar: ${patient.notes}\n`;
            content += `\n`;

            content += `RANDEVU GEÇMİŞİ\n`;
            content += `------------------------------------\n`;
            appointments.forEach(a => {
                content += `[${new Date(a.starts_at).toLocaleDateString("tr-TR")}] ${a.treatment_type} - ${a.status}\n`;
                if (a.treatment_note) content += `Not: ${a.treatment_note}\n`;
            });

            content += `\nÖDEME HAREKETLERİ\n`;
            content += `------------------------------------\n`;
            payments.forEach(p => {
                content += `[${p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "-"}] ${p.amount} ₺ - ${p.method} (${p.status})\n`;
            });
        }

        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    const whatsappLink = patient.phone
        ? `https://wa.me/${patient.phone.replace(/\D/g, "")}`
        : null;

    const statusMap: Record<string, string> = {
        confirmed: "Planlandı",
        completed: "Tamamlandı",
        cancelled: "İptal Edildi",
        no_show: "Gelmedi"
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
                <div className="bg-[#f0f4f8] rounded-[2rem] shadow-2xl border-none w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 my-auto" onClick={(e) => e.stopPropagation()}>

                    {/* Header Section */}
                    <div className="bg-[#007f6e] p-6 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-[#007f6e] text-xl font-bold shadow-lg">
                                    {patient.full_name[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-xl font-bold leading-tight">{patient.full_name}</h2>
                                        {age !== null && (
                                            <span className="text-[11px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">{age} yaş</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <p className="text-xs text-emerald-100/80 font-medium">Kayıt: {new Date(patient.created_at).toLocaleDateString("tr-TR")}</p>
                                        {stats.lastVisit && (
                                            <p className="text-xs text-emerald-100/80 font-medium">
                                                Son Ziyaret: {new Date(stats.lastVisit.starts_at).toLocaleDateString("tr-TR")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => downloadData('csv')} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/10">CSV indir</button>
                                <button onClick={() => downloadData('txt')} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/10">TXT indir</button>
                                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors border border-white/10 ml-2">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 mb-2">
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                                </div>
                                <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tighter">{stats.totalVisits}</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Toplam Ziyaret</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mb-2">
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tighter">{stats.completed}</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase text-center">Tamamlanan</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </div>
                                <p className="text-lg sm:text-xl font-black text-rose-600 tracking-tighter">{stats.cancelled}</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-rose-400 uppercase text-center">İptal</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 mb-2">
                                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tighter">{stats.totalPaid.toLocaleString('tr-TR')} ₺</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-teal-600 uppercase text-center">Ödenen</p>
                                {stats.totalPending > 0 && (
                                    <p className="text-[9px] font-bold text-amber-500 mt-0.5">{stats.totalPending.toLocaleString('tr-TR')} ₺ bekliyor</p>
                                )}
                            </div>
                        </div>

                        {/* Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* İletişim */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-[#007f6e]">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.281-5.117-3.573-6.398-6.398l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">İletişim</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Telefon</label>
                                        <div className="flex items-center justify-between group">
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-sm font-bold border-b-2 border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                                    value={editForm.phone || ""}
                                                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                                />
                                            ) : (
                                                <>
                                                    <p className="text-sm font-bold text-slate-700">{patient.phone || "-"}</p>
                                                    {whatsappLink && (
                                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="h-6 w-6 bg-emerald-500 rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm" title="WhatsApp Mesaj Gönder">
                                                            <svg className="h-3.5 w-3.5 text-white fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.898-5.335 11.9-11.894a11.83 11.83 0 00-3.486-8.412z" /></svg>
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">E-posta</label>
                                        {isEditing ? (
                                            <input
                                                className="w-full text-sm font-bold border-b-2 border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                                value={editForm.email || ""}
                                                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                            />
                                        ) : (
                                            <p className="text-sm font-bold text-slate-700 truncate">{patient.email || "-"}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Kişisel Bilgiler */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-indigo-500">
                                    <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Kişisel Bilgiler</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Doğum / TC</label>
                                        <div className="flex gap-2">
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="date"
                                                        className="w-1/2 text-xs font-bold border-b border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                                        value={editForm.birth_date || ""}
                                                        onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))}
                                                    />
                                                    <input
                                                        className="w-1/2 text-xs font-bold border-b border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                                        value={editForm.tc_identity_no || ""}
                                                        onChange={e => setEditForm(f => ({ ...f, tc_identity_no: e.target.value }))}
                                                        placeholder="TC No"
                                                    />
                                                </>
                                            ) : (
                                                <p className="text-sm font-bold text-slate-700">
                                                    {patient.birth_date ? (
                                                        <>
                                                            {new Date(patient.birth_date).toLocaleDateString("tr-TR")}
                                                            {age !== null && <span className="ml-1.5 text-xs font-bold text-slate-400">({age} yaş)</span>}
                                                        </>
                                                    ) : "-"}
                                                    {patient.tc_identity_no && ` / ${patient.tc_identity_no}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cinsiyet</label>
                                            {isEditing ? (
                                                <select
                                                    className="w-full text-xs font-bold border-b border-slate-100 focus:border-[#007f6e] outline-none py-1 bg-transparent"
                                                    value={editForm.gender || ""}
                                                    onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                                >
                                                    <option value="">Seçilmedi</option>
                                                    <option value="Kadın">Kadın</option>
                                                    <option value="Erkek">Erkek</option>
                                                    <option value="Diğer">Diğer</option>
                                                </select>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-700">{patient.gender || "-"}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Kan Grubu</label>
                                            {isEditing ? (
                                                <select
                                                    className="w-full text-xs font-bold border-b border-slate-100 focus:border-[#007f6e] outline-none py-1 bg-transparent"
                                                    value={editForm.blood_group || ""}
                                                    onChange={e => setEditForm(f => ({ ...f, blood_group: e.target.value }))}
                                                >
                                                    <option value="">Seçilmedi</option>
                                                    {["A Rh+", "A Rh-", "B Rh+", "B Rh-", "AB Rh+", "AB Rh-", "0 Rh+", "0 Rh-"].map(bg => (
                                                        <option key={bg} value={bg}>{bg}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-700">{patient.blood_group || "-"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Adres ve Notlar */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Meslek</label>
                                    {isEditing ? (
                                        <input
                                            className="w-full text-xs font-bold border-b border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                            value={editForm.occupation || ""}
                                            onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))}
                                            placeholder="Meslek"
                                        />
                                    ) : (
                                        <p className="text-xs font-bold text-slate-700">{patient.occupation || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Adres</label>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full text-xs font-medium border border-slate-100 rounded-lg p-2 focus:border-[#007f6e] outline-none bg-slate-50 mt-1"
                                            rows={2}
                                            value={editForm.address || ""}
                                            onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                                            placeholder="Açık adres..."
                                        />
                                    ) : (
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">{patient.address || "Adres belirtilmedi."}</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Genel Notlar</label>
                                {isEditing ? (
                                    <textarea
                                        className="w-full text-xs font-medium border border-slate-100 rounded-lg p-2 focus:border-[#007f6e] outline-none bg-slate-50"
                                        rows={4}
                                        value={editForm.notes || ""}
                                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Hasta hakkında genel klinik notlar..."
                                    />
                                ) : (
                                    <div className="bg-slate-50 rounded-xl p-3 h-full max-h-[120px] overflow-y-auto">
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                            {patient.notes || "Henüz bir not eklenmemiş."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Randevu Geçmişi Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[#007f6e]">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Randevu Geçmişi</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (patient) {
                                            apptMgmt.openNew();
                                            // hasta bilgilerini ön doldur
                                            apptMgmt.setPatientSearch(patient.full_name);
                                            apptMgmt.setSelectedPatientId(patient.id);
                                            if (patient.phone) apptMgmt.setPhoneNumber(patient.phone.replace(/^\+90/, "").replace(/\s/g, ""));
                                            apptMgmt.setForm(prev => ({ ...prev, patientName: patient.full_name }));
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Yeni Randevu
                                </button>
                            </div>

                            <div className="space-y-3">
                                {appointments.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400">Henüz randevu kaydı bulunmuyor.</p>
                                    </div>
                                ) : appointments.map(appt => (
                                    <div key={appt.id} className="bg-white rounded-[1.5rem] p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{appt.treatment_type}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    appt.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                        appt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {statusMap[appt.status] || appt.status}
                                                </span>
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                {new Date(appt.starts_at).toLocaleDateString("tr-TR")} – {new Date(appt.starts_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                            <p className="text-[10px] font-bold truncate">{appt.doctor_name || "Atanmadı"}</p>
                                        </div>
                                        {appt.treatment_note && (
                                            <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                                                <p className="text-[10px] font-bold text-indigo-400 mb-1">Tedavi sonrası not:</p>
                                                <p className="text-[10px] font-medium text-indigo-700">{appt.treatment_note}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ödeme Geçmişi ve Taksitler Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-teal-600">
                                    <div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Ödeme Geçmişi ve Taksitler</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {stats.totalPending > 0 && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-700">
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                            {stats.totalPending.toLocaleString('tr-TR')} ₺ bekleyen
                                        </span>
                                    )}
                                    {appointments.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => patient && setPaymentTarget({
                                                appointmentId: appointments[0].id,
                                                patientName: patient.full_name,
                                                amount: 0,
                                            })}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Yeni Ödeme
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {payments.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400">Henüz ödeme kaydı bulunmuyor.</p>
                                    </div>
                                ) : payments.map(pay => {
                                    const linkedAppt = appointments.find(a => a.id === pay.appointment_id);
                                    return (
                                        <div key={pay.id} className="bg-white rounded-[1.5rem] p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-xs font-black text-slate-800 tracking-tighter">
                                                        {pay.amount.toLocaleString('tr-TR')} ₺
                                                    </p>
                                                    {pay.installment_count && pay.installment_count > 1 && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-black border border-amber-100">
                                                            TAKSİT {pay.installment_number}/{pay.installment_count}
                                                        </span>
                                                    )}
                                                    {(() => {
                                                        const sc = getPaymentStatusConfig(pay.status); return (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.colors.bg} ${sc.colors.text}`}>
                                                                {sc.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                    Vade: {pay.due_date ? new Date(pay.due_date).toLocaleDateString("tr-TR") : "-"}
                                                </p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75m0 3v.75m0 3v.75m0 3v.75m11.1-1.3l2.58 2.58a1.5 1.5 0 102.12-2.12l-2.58-2.58m0 0l-3.3-3.3a1.5 1.5 0 00-2.12 2.12l3.3 3.3z" /></svg>
                                                    <p className="text-[10px] font-bold">Yöntem: {normalizePaymentMethod(pay.method)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {linkedAppt && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                                            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                                {new Date(linkedAppt.starts_at).toLocaleDateString("tr-TR")} – {linkedAppt.treatment_type}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Makbuz yazdır"
                                                        onClick={() => printReceipt({
                                                            clinicName: clinic.clinicName || "Klinik",
                                                            patient: { name: patient.full_name, phone: patient.phone },
                                                            payments: [{
                                                                id: pay.id,
                                                                amount: pay.amount,
                                                                method: pay.method,
                                                                status: pay.status,
                                                                due_date: pay.due_date,
                                                                installment_number: pay.installment_number,
                                                                installment_count: pay.installment_count,
                                                                treatment_type: linkedAppt?.treatment_type,
                                                            }],
                                                        })}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                                    >
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                                        </svg>
                                                        Makbuz
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tedavi Planları Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-teal-700">
                                    <div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Tedavi Planları</h3>
                                    {treatmentPlans.length > 0 && (
                                        <span className="text-[10px] font-black bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{treatmentPlans.length}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowCreatePlan(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Yeni Plan
                                </button>
                            </div>

                            <div className="space-y-3">
                                {plansLoading ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-16 bg-slate-100 rounded-2xl" />
                                        <div className="h-16 bg-slate-100 rounded-2xl" />
                                    </div>
                                ) : treatmentPlans.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400">Bu hasta için henüz tedavi planı oluşturulmamış.</p>
                                    </div>
                                ) : treatmentPlans.map(plan => {
                                    const statusCfg = PLAN_STATUS_CONFIG[plan.status];
                                    const isExpanded = expandedPlanId === plan.id;
                                    const completedItems = plan.items.filter(i => i.status === "completed").length;
                                    return (
                                        <div key={plan.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            {/* Plan başlık satırı */}
                                            <button
                                                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${statusCfg.bg} ${statusCfg.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                        {statusCfg.label}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{plan.title || "İsimsiz Plan"}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(plan.created_at).toLocaleDateString("tr-TR")} · {plan.items.length} işlem
                                                            {plan.items.length > 0 && ` · ${completedItems}/${plan.items.length} tamamlandı`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {plan.total_estimated_amount != null && (
                                                        <span className="text-xs font-black text-teal-700">{plan.total_estimated_amount.toLocaleString("tr-TR")} ₺</span>
                                                    )}
                                                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {/* Genişletilmiş içerik */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 px-4 pb-4 space-y-4">
                                                    {plan.note && (
                                                        <div className="pt-3">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Notu</p>
                                                            <p className="text-xs text-slate-600">{plan.note}</p>
                                                        </div>
                                                    )}

                                                    {/* İşlem listesi */}
                                                    {plan.items.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">İşlemler</p>
                                                            {plan.items.map(item => {
                                                                const itemCfg = ITEM_STATUS_CONFIG[item.status];
                                                                return (
                                                                    <div key={item.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            {item.tooth_no && (
                                                                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md shrink-0">#{item.tooth_no}</span>
                                                                            )}
                                                                            <span className="text-xs font-bold text-slate-700 truncate">{item.procedure_name}</span>
                                                                            {item.quantity > 1 && <span className="text-[10px] text-slate-400">×{item.quantity}</span>}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${itemCfg.bg} ${itemCfg.text}`}>{itemCfg.label}</span>
                                                                            {item.total_price != null && (
                                                                                <span className="text-[10px] font-black text-slate-600">{item.total_price.toLocaleString("tr-TR")} ₺</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Sonraki randevu */}
                                                    {plan.next_appointment_id && (
                                                        <div className="flex items-center gap-2 bg-teal-50 rounded-xl px-3 py-2 border border-teal-100">
                                                            <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold text-teal-700">Sonraki randevu otomatik oluşturuldu</span>
                                                        </div>
                                                    )}

                                                    {/* Plan durum güncelleme + sil */}
                                                    <div className="flex items-center justify-between gap-2 pt-1">
                                                        <select
                                                            value={plan.status}
                                                            onChange={(e) => updatePlanStatus.mutate({ id: plan.id, status: e.target.value as typeof plan.status })}
                                                            className="h-8 px-3 bg-slate-100 rounded-xl text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer border-0"
                                                        >
                                                            {Object.entries(PLAN_STATUS_CONFIG).map(([val, cfg]) => (
                                                                <option key={val} value={val}>{cfg.label}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => { if (confirm("Bu tedavi planı silinsin mi?")) removePlan.mutate(plan.id); }}
                                                            className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors"
                                                        >
                                                            Planı Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Anamnez / Tıbbi Geçmiş */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Anamnez</h3>
                                    {anamnesis?.updated_at && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {new Date(anamnesis.updated_at).toLocaleDateString("tr-TR")}
                                        </span>
                                    )}
                                </div>
                                {!anamnesisEditMode && (
                                    <button
                                        onClick={() => setAnamnesisEditMode(true)}
                                        className="h-8 px-4 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-colors"
                                    >
                                        Düzenle
                                    </button>
                                )}
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                <AnamnesisSection
                                    patientId={patient.id}
                                    data={anamnesis}
                                    isLoading={anamnesisLoading}
                                    onSave={handleSaveAnamnesis}
                                    editMode={anamnesisEditMode}
                                    onEditModeChange={setAnamnesisEditMode}
                                    hideEditButton
                                />
                            </div>
                        </div>

                        {/* Diş Şeması Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v1a4 4 0 004 4h2a4 4 0 004-4V5a2 2 0 00-2-2h-2zM9 3v2m6-2v2M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6M9 21h6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-tight">Diş Şeması</h3>
                                    {dentalChart?.updated_at && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {new Date(dentalChart.updated_at).toLocaleDateString("tr-TR")}
                                        </span>
                                    )}
                                </div>
                                {!chartEditMode ? (
                                    <button
                                        onClick={() => setChartEditMode(true)}
                                        className="h-8 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                    >
                                        Düzenle
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleChartCancel}
                                            className="h-8 px-4 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            onClick={handleChartSave}
                                            disabled={chartSaving}
                                            className="h-8 px-5 rounded-xl bg-[#007f6e] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#006d5e] transition-colors disabled:opacity-60"
                                        >
                                            {chartSaving ? "..." : "Kaydet"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                                {chartLoading ? (
                                    <div className="flex items-center justify-center h-24 text-slate-400 text-xs font-bold">
                                        Yükleniyor...
                                    </div>
                                ) : (
                                    <ToothChart
                                        teethData={chartEditMode ? chartDraft : (dentalChart?.teeth_data ?? {})}
                                        editMode={chartEditMode}
                                        onChange={handleToothChange}
                                        patientName={patient.full_name}
                                    />
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Footer Selection */}
                    <div className="p-4 sm:p-6 bg-white border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {!showDeleteConfirm ? (
                            <>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-2 uppercase tracking-tight order-3 sm:order-1"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0-.34-9m9.27 1.5h-15.5m1.5-3v14m12.5-3V5.25a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75V11.25" />
                                    </svg>
                                    Kaydı Sil
                                </button>

                                <div className="flex w-full sm:w-auto items-center gap-3 order-1 sm:order-2">
                                    <button
                                        onClick={isEditing ? handleSave : () => { setIsEditing(true); setAnamnesisEditMode(true); setChartEditMode(true); }}
                                        disabled={saving}
                                        className="w-full sm:w-auto px-6 sm:px-12 h-12 rounded-2xl bg-white border-2 border-slate-100 text-xs font-black text-slate-600 hover:border-[#007f6e] hover:text-[#007f6e] transition-all uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                                    >
                                        {saving ? "..." : (isEditing ? "Kaydet" : "Düzenle")}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex items-center justify-between bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100 animate-in slide-in-from-bottom-2 duration-300">
                                <span className="text-[11px] font-black text-rose-700 uppercase tracking-tight">Kayıt kalıcı olarak silinsin mi?</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 rounded-xl bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest border border-rose-200 hover:bg-slate-50 transition-all"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="px-6 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
                                    >
                                        {deleting ? '...' : 'Evet, Sil'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreateTreatmentPlanModal
                open={showCreatePlan}
                onClose={() => setShowCreatePlan(false)}
                onSuccess={handlePlanCreated}
                patientId={patient.id}
                patientName={patient.full_name}
            />

            {/* Hasta kartından randevu oluşturma */}
            <AppointmentModal
                isOpen={apptMgmt.modalOpen}
                onClose={apptMgmt.closeModal}
                editing={apptMgmt.editing}
                formDate={apptMgmt.formDate}
                setFormDate={apptMgmt.setFormDate}
                formTime={apptMgmt.formTime}
                setFormTime={apptMgmt.setFormTime}
                today={apptMgmt.today}
                todaySchedule={apptMgmt.todaySchedule}
                form={apptMgmt.form}
                setForm={apptMgmt.setForm}
                doctors={apptMgmt.doctors}
                patientSearch={apptMgmt.patientSearch}
                setPatientSearch={apptMgmt.setPatientSearch}
                patientSearchResults={apptMgmt.patientSearchResults}
                patientSearchLoading={apptMgmt.patientSearchLoading}
                selectedPatientId={apptMgmt.selectedPatientId}
                setSelectedPatientId={apptMgmt.setSelectedPatientId}
                duplicatePatient={apptMgmt.duplicatePatient}
                isNewPatient={apptMgmt.isNewPatient}
                patientMatchInfo={apptMgmt.patientMatchInfo}
                conflictWarning={apptMgmt.conflictWarning}
                phoneCountryCode={apptMgmt.phoneCountryCode}
                setPhoneCountryCode={apptMgmt.setPhoneCountryCode}
                phoneNumber={apptMgmt.phoneNumber}
                setPhoneNumber={apptMgmt.setPhoneNumber}
                handleSubmit={apptMgmt.handleSubmit}
                handleDelete={apptMgmt.handleDelete}
                handleUseDuplicate={apptMgmt.handleUseDuplicate}
                submitError={apptMgmt.submitError}
                isSubmitting={apptMgmt.isSubmitting}
                treatmentDefinitions={apptMgmt.treatmentDefinitions}
            />

            {/* Hasta kartından ödeme ekleme */}
            {paymentTarget && (
                <QuickPaymentModal
                    open={!!paymentTarget}
                    onClose={() => setPaymentTarget(null)}
                    appointmentId={paymentTarget.appointmentId}
                    patientName={paymentTarget.patientName}
                    patientId={patient.id}
                    initialAmount={paymentTarget.amount}
                    onSuccess={() => setPaymentTarget(null)}
                />
            )}
        </>
    );
}
