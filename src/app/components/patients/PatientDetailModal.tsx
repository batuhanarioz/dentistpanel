import React, { useState, useEffect, useMemo } from "react";
import { PatientRow, PatientAppointment, PatientPayment } from "@/hooks/usePatients";
import { useClinic } from "@/app/context/ClinicContext";

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientRow | null;
    appointments: PatientAppointment[];
    payments: PatientPayment[];
    loading: boolean;
    onDelete: (id: string) => Promise<boolean>;
    onUpdate: (id: string, updates: Partial<PatientRow>) => Promise<boolean>;
}

export function PatientDetailModal({
    isOpen,
    onClose,
    patient,
    appointments,
    payments,
    loading,
    onDelete,
    onUpdate
}: PatientDetailModalProps) {
    const clinic = useClinic();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<PatientRow>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (patient) {
            setEditForm({
                full_name: patient.full_name,
                phone: patient.phone,
                email: patient.email,
                birth_date: patient.birth_date,
                tc_identity_no: patient.tc_identity_no,
                allergies: patient.allergies,
                medical_alerts: patient.medical_alerts,
            });
        }
    }, [patient, isOpen]);

    // Stats calculations
    const stats = useMemo(() => {
        const totalVisits = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const totalPaid = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.amount : sum, 0);
        return { totalVisits, completed, cancelled, totalPaid };
    }, [appointments, payments]);

    if (!isOpen || !patient) return null;

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(patient.id);
        setDeleting(false);
        setShowDeleteConfirm(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const success = await onUpdate(patient.id, editForm);
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
            content += `Kayıt Tarihi: ${new Date(patient.created_at).toLocaleDateString("tr-TR")}\n\n`;

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
        confirmed: "Onaylandı",
        pending: "Onay Bekliyor",
        completed: "Tamamlandı",
        cancelled: "İptal Edildi"
    };

    return (
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
                                <h2 className="text-xl font-bold leading-tight">{patient.full_name}</h2>
                                <p className="text-xs text-emerald-100/80 font-medium">Kayıt: {new Date(patient.created_at).toLocaleDateString("tr-TR")}</p>
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
                            <p className="text-[9px] sm:text-[10px] font-bold text-teal-600 uppercase text-center">Toplam Ödeme</p>
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
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">TC No</label>
                                    {isEditing ? (
                                        <input
                                            className="w-full text-sm font-bold border-b-2 border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                            value={editForm.tc_identity_no || ""}
                                            onChange={e => setEditForm(f => ({ ...f, tc_identity_no: e.target.value }))}
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700">{patient.tc_identity_no || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Doğum</label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            className="w-full text-sm font-bold border-b-2 border-slate-100 focus:border-[#007f6e] outline-none py-1"
                                            value={editForm.birth_date || ""}
                                            onChange={e => setEditForm(f => ({ ...f, birth_date: e.target.value }))}
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("tr-TR") : "-"}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alerji / Tıbbi uyarı */}
                    <div className="bg-[#fff9e6] rounded-2xl p-4 border border-amber-100 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight">Alerji / Tıbbi uyarı</h3>
                        </div>
                        <div className="pl-8 space-y-1">
                            <p className="text-xs font-black text-amber-700 inline">Tıbbi uyarılar: </p>
                            {isEditing ? (
                                <textarea
                                    className="w-full mt-1 bg-white border border-amber-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                                    rows={2}
                                    value={editForm.medical_alerts || ""}
                                    onChange={e => setEditForm(f => ({ ...f, medical_alerts: e.target.value }))}
                                    placeholder="Tıbbi uyarıları buraya yazınız..."
                                />
                            ) : (
                                <p className="text-xs font-medium text-amber-800 inline leading-relaxed">
                                    {patient.medical_alerts || "Herhangi bir tıbbi uyarı bulunmuyor."}
                                    {patient.allergies && ` (Alerjiler: ${patient.allergies})`}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Randevu Geçmişi Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#007f6e]">
                            <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight">Randevu Geçmişi</h3>
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
                                                    'bg-indigo-100 text-indigo-700'
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
                                        <p className="text-[10px] font-bold truncate">Dr. {appt.doctor_name || "Atanmadı"}</p>
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
                                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
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
    );
}
