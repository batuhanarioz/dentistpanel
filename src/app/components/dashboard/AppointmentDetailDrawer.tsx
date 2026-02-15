import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_LABEL_MAP, STATUS_BADGE_CLASS } from "@/constants/dashboard";

interface AppointmentDetailDrawerProps {
    appointmentId: string | null;
    onClose: () => void;
    onStatusChange: (id: string, status: any) => void;
    onAssignDoctor: (id: string, doctorId: string) => void;
    doctors: Array<{ id: string; full_name: string }>;
}

export function AppointmentDetailDrawer({
    appointmentId,
    onClose,
    onStatusChange,
    onAssignDoctor,
    doctors
}: AppointmentDetailDrawerProps) {
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [statusChanging, setStatusChanging] = useState(false);

    useEffect(() => {
        if (appointmentId) {
            setIsOpen(true);
            fetchDetail(appointmentId);
        } else {
            setIsOpen(false);
            setAppointment(null);
        }
    }, [appointmentId]);

    const fetchDetail = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("appointments")
            .select("*, patients(*), users!doctor_id(full_name)")
            .eq("id", id)
            .maybeSingle();

        if (!error && data) {
            setAppointment(data);
        }
        setLoading(false);
    };

    if (!appointmentId && !isOpen) return null;

    const formatTime = (iso: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (iso: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-all duration-500 ease-out ${appointmentId ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 right-0 z-[70] w-full max-w-[400px] bg-white shadow-2xl transition-all duration-500 ease-out transform ${appointmentId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : appointment ? (
                    <div className="flex h-full flex-col overflow-y-auto italic-none">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-8 text-white">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold shadow-inner">
                                    {appointment.patients?.full_name?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">{appointment.patients?.full_name}</h2>
                                    <p className="text-sm text-indigo-100 font-medium opacity-80">{appointment.patients?.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Detailed Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarih</p>
                                    <p className="text-xs font-bold text-slate-900">{formatDate(appointment.starts_at)}</p>
                                </div>
                                <div className="rounded-2xl border bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saat</p>
                                    <p className="text-xs font-bold text-slate-900">{formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Randevu Durumu</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(STATUS_LABEL_MAP).map(([val, label]) => (
                                            <button
                                                key={val}
                                                onClick={async () => {
                                                    setStatusChanging(true);
                                                    await onStatusChange(appointment.id, val as any);
                                                    setAppointment((prev: any) => ({ ...prev, status: val }));
                                                    setTimeout(() => setStatusChanging(false), 500);
                                                }}
                                                disabled={statusChanging}
                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-50 ${appointment.status === val
                                                    ? STATUS_BADGE_CLASS[val as keyof typeof STATUS_BADGE_CLASS] + " shadow-md scale-105 ring-2 ring-offset-2 ring-teal-500/30"
                                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-teal-200"
                                                    }`}
                                            >
                                                {statusChanging && appointment.status === val ? (
                                                    <svg className="h-3 w-3 animate-spin inline-block" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : label}
                                            </button>
                                        ))}
                                    </div>
                                    {statusChanging && (
                                        <p className="text-[10px] text-teal-600 font-bold mt-2 animate-pulse">Durum güncelleniyor...</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Atanan Doktor</label>
                                    <select
                                        value={appointment.doctor_id || ""}
                                        onChange={(e) => {
                                            const docId = e.target.value;
                                            onAssignDoctor(appointment.id, docId);
                                            setAppointment((prev: any) => ({ ...prev, doctor_id: docId }));
                                        }}
                                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    >
                                        <option value="">Doktor Atanmadı</option>
                                        {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                    </select>
                                </div>

                                <div className="rounded-2xl border-2 border-slate-50 bg-slate-50/50 p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">İşlem & Ücret</p>
                                            <p className="text-xs font-bold text-slate-900">{appointment.treatment_type || "Genel Muayene"}</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                        {appointment.estimated_amount?.toLocaleString("tr-TR") || "0"} <span className="text-sm font-semibold text-slate-400">₺</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Hasta Notu</label>
                                    <div className="rounded-2xl border-2 border-indigo-50 bg-indigo-50/30 p-4 text-xs font-medium text-slate-600 leading-relaxed italic">
                                        {appointment.patient_note || "Bu randevu için eklenmiş bir not bulunmuyor."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto border-t p-6 bg-slate-50/50">
                            <button
                                onClick={() => window.open(`https://wa.me/${appointment.patients?.phone?.replace(/\D/g, "")}`, "_blank")}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.59 2 2.18 6.41 2.18 11.86c0 2.09.61 4.02 1.78 5.71L2 22l4.57-1.91a9.8 9.8 0 0 0 5.47 1.61h.01c5.45 0 9.86-4.41 9.86-9.86C21.91 6.41 17.5 2 12.04 2Zm5.8 13.77c-.24.68-1.18 1.29-1.93 1.46-.52.11-1.2.2-3.48-.75-2.92-1.21-4.8-4.18-4.95-4.38-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.51.24.58.82 2.01.89 2.15.07.14.11.3.02.48-.09.19-.14.3-.29.46-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12.99 2.07 1.3 2.38 1.45.31.15.49.13.67-.08.18-.21.77-.9.98-1.21.21-.31.41-.26.69-.16.29.1 1.8.85 2.11 1.01.31.16.52.24.6.38.08.14.08.8-.16 1.48Z" /></svg>
                                WhatsApp ile İletişime Geç
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center italic-none">
                        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-slate-800">Randevu bulunamadı</h3>
                        <p className="text-xs text-slate-400 mt-1">Görüntülemek istediğiniz randevu artık mevcut olmayabilir.</p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Kapat</button>
                    </div>
                )}
            </div>
        </>
    );
}
