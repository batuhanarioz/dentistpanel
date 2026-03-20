"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import type { ExtendedStatus } from "@/hooks/useAppointments";
import { STATUS_LABELS, STATUS_BADGE_COLORS } from "@/hooks/useAppointments";

interface DrawerAppointmentDetail {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    treatment_type: string | null;
    patient_note: string | null;
    treatment_note: string | null;
    estimated_amount: number | null;
    doctor_id: string | null;
    patients: { full_name: string; phone: string | null; email: string | null; birth_date: string | null } | null;
    users: { full_name: string } | null;
}

interface AppointmentDrawerProps {
    appointmentId: string | null;
    doctors: { id: string; full_name: string }[];
    onClose: () => void;
    onStatusChange: (id: string, status: ExtendedStatus) => void;
    onEditClick?: (id: string) => void;
}

function fmt(iso: string, type: "time" | "date" | "datetime") {
    if (!iso) return "—";
    const d = new Date(iso);
    if (type === "time") return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    if (type === "date") return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
    return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function AppointmentDrawer({
    appointmentId,
    doctors,
    onClose,
    onStatusChange,
    onEditClick,
}: AppointmentDrawerProps) {
    const { clinicId } = useClinic();

    const [appt, setAppt] = useState<DrawerAppointmentDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const isOpen = !!appointmentId;

    const fetchDetail = useCallback(async (id: string) => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("appointments")
                .select("id, starts_at, ends_at, status, treatment_type, patient_note, treatment_note, estimated_amount, doctor_id, patients(full_name, phone, email, birth_date), users!doctor_id(full_name)")
                .eq("id", id)
                .eq("clinic_id", clinicId)
                .maybeSingle();

            if (!error && data) {
                setAppt(data as unknown as DrawerAppointmentDetail);
            } else {
                setAppt(null);
            }
        } catch {
            setAppt(null);
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => {
        if (appointmentId) fetchDetail(appointmentId);
        else setAppt(null);
    }, [appointmentId, fetchDetail]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleCopyPhone = () => {
        if (appt?.patients?.phone) {
            navigator.clipboard.writeText(appt.patients.phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWhatsApp = () => {
        const phone = appt?.patients?.phone?.replace(/\D/g, "");
        if (phone) window.open(`https://wa.me/${phone}`, "_blank");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[4px] transition-opacity duration-500 ease-out ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-4 right-4 bottom-4 z-50 w-full max-w-[380px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? "translate-x-0 opacity-100 scale-100" : "translate-x-12 opacity-0 scale-95 pointer-events-none"}`}
            >
                {loading || !appt ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        {loading ? (
                            <div className="relative h-12 w-12 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="h-16 w-16 mx-auto rounded-3xl bg-slate-50 flex items-center justify-center mb-4 text-slate-200">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-bold text-slate-400">Veri yüklenemedi</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── Top Bar Container ── */}
                        <div className="relative px-6 pt-8 pb-4">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 h-10 w-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all active:scale-90"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Status Badge */}
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${STATUS_BADGE_COLORS[appt.status as ExtendedStatus] || "bg-slate-100 text-slate-500"}`}>
                                {STATUS_LABELS[appt.status as ExtendedStatus]}
                            </div>

                            {/* Patient Profile */}
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-violet-600 p-1 shadow-xl shadow-indigo-100 mb-4">
                                    <div className="h-full w-full rounded-[2.25rem] bg-white flex items-center justify-center text-2xl font-black text-indigo-600 uppercase tracking-tighter">
                                        {appt.patients?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || "?"}
                                    </div>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight px-4 capitalize">
                                    {appt.patients?.full_name?.toLowerCase() || "İsimsiz Hasta"}
                                </h2>

                                <div className="mt-4 flex items-center gap-2 group cursor-pointer" onClick={handleCopyPhone}>
                                    <span className="text-sm font-bold text-slate-500 tabular-nums">
                                        {appt.patients?.phone || "Telefon belirtilmedi"}
                                    </span>
                                    <button className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                        {copied ? (
                                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                                        ) : (
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Content Grid ── */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                            {/* Time & Date Card */}
                            <div className="rounded-[2rem] bg-indigo-50/40 p-5 flex flex-col items-center">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tarih</p>
                                        <p className="text-sm font-black text-indigo-900">{fmt(appt.starts_at, "date")}</p>
                                    </div>
                                    <div className="h-8 w-px bg-indigo-200/50 shrink-0" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Saat</p>
                                        <p className="text-sm font-black text-indigo-900">{fmt(appt.starts_at, "time")} – {fmt(appt.ends_at, "time")}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:bg-slate-50 group/item">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Uygulanan Tedavi</p>
                                    <p className="text-[13px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors capitalize">
                                        {appt.treatment_type?.toLowerCase() || "Genel muayene"}
                                    </p>
                                </div>
                                <div className="bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:bg-slate-50 group/item">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sorumlu Hekim</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                                            {appt.users?.full_name?.split(' ').map(n => n[0]).join('') || "?"}
                                        </div>
                                        <p className="text-[13px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                            {appt.users?.full_name || "Atanmamış"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Internal Note (if exists, subtly) */}
                            {appt.patient_note && (
                                <div className="rounded-2xl border-2 border-dashed border-slate-100 p-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hasta Notu</p>
                                    <p className="text-xs text-slate-500 font-medium italic leading-relaxed">{appt.patient_note}</p>
                                </div>
                            )}
                        </div>

                        {/* ── Footer Actions ── */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
                            {onEditClick && appt && (
                                <button
                                    onClick={() => { onEditClick(appt.id); onClose(); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-black transition-all active:scale-[0.98]"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                    </svg>
                                    Randevuyu Düzenle
                                </button>
                            )}
                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] group"
                            >
                                <svg className="h-5 w-5 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.04 2C6.59 2 2.18 6.41 2.18 11.86c0 2.09.61 4.02 1.78 5.71L2 22l4.57-1.91a9.8 9.8 0 0 0 5.47 1.61h.01c5.45 0 9.86-4.41 9.86-9.86C21.91 6.41 17.5 2 12.04 2Zm5.8 13.77c-.24.68-1.18 1.29-1.93 1.46-.52.11-1.2.2-3.48-.75-2.92-1.21-4.8-4.18-4.95-4.38-.14-.19-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.51.24.58.82 2.01.89 2.15.07.14.11.3.02.48-.09.19-.14.3-.29.46-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12.99 2.07 1.3 2.38 1.45.31.15.49.13.67-.08.18-.21.77-.9.98-1.21.21-.31.41-.26.69-.16.29.1 1.8.85 2.11 1.01.31.16.52.24.6.38.08.14.08.8-.16 1.48Z" />
                                </svg>
                                İletişime Geç (WhatsApp)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
