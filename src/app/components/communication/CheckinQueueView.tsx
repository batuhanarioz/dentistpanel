"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { useCheckin } from "@/hooks/useCheckin";
import toast from "react-hot-toast";
import { PatientDetailModal } from "@/app/components/patients/PatientDetailModal";
import { getPatientDetails } from "@/lib/api";
import type { PatientRow, PatientAppointment, PatientPayment } from "@/hooks/usePatients";

interface CheckinAppointment {
    id: string;
    patient_name: string;
    patient_phone: string;
    appointment_time: string;
    starts_at: string;
    anamnesis_status: "FILLED" | "EMPTY" | "PATIENT_FILLED";
    checkin_code?: string;
    patient_id: string;
    isPast: boolean;
}

export function CheckinQueueView() {
    const { clinicId } = useClinic();
    const [appointments, setAppointments] = useState<CheckinAppointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
    const { generateCode } = useCheckin(clinicId);

    // Patient Detail Modal States
    const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
    const [patientAppts, setPatientAppts] = useState<PatientAppointment[]>([]);
    const [patientPays, setPatientPays] = useState<PatientPayment[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openPatientDetail = async (patientId: string) => {
        try {
            // 1. Hasta ana bilgisini çek
            const { data: pData, error: pError } = await supabase
                .from("patients")
                .select("*")
                .eq("id", patientId)
                .single();

            if (pError) throw pError;

            // 2. Randevu ve ödemeleri çek
            const details = await getPatientDetails(patientId);

            setSelectedPatient(pData as PatientRow);
            setPatientAppts(details.appointments as PatientAppointment[]);
            setPatientPays(details.payments as PatientPayment[]);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Hasta detay yükleme hatası:", error);
            toast.error("Hasta detayları yüklenemedi");
        }
    };

    const handleUpdatePatient = async (id: string, updates: Partial<PatientRow>) => {
        const { error } = await supabase.from("patients").update(updates).eq("id", id);
        if (error) {
            toast.error("Güncellenemedi");
            return false;
        }
        toast.success("Güncellendi");
        // Lokal state güncelle
        setSelectedPatient(prev => prev ? { ...prev, ...updates } : null);
        return true;
    };

    const handleDeletePatient = async (id: string) => {
        if (!window.confirm("Bu hastayı silmek istediğinize emin misiniz?")) return false;
        const { error } = await supabase.from("patients").delete().eq("id", id);
        if (error) {
            toast.error("Silinemedi");
            return false;
        }
        toast.success("Hasta silindi");
        setIsModalOpen(false);
        loadQueue();
        return true;
    };

    const handleGenerate = async (apptId: string) => {
        const now = Date.now();
        const lastTime = cooldowns[apptId] || 0;

        if (now - lastTime < 60000) {
            const remaining = Math.ceil((60000 - (now - lastTime)) / 1000);
            toast.error(`Lütfen ${remaining} saniye bekleyin.`);
            return;
        }

        const success = await generateCode(apptId);
        if (success) {
            setCooldowns(prev => ({ ...prev, [apptId]: now }));
            loadQueue(); // Refresh to show new code
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Giriş şifresi kopyalandı!");
    };

    const loadQueue = async () => {
        if (!clinicId) return;
        setIsLoading(true);
        try {
            // İstanbul saatine göre bugünün başlangıç ve bitişini hesapla
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const { data: appts, error: apptError } = await supabase
                .from("appointments")
                .select("id, starts_at, patient_id, status, patients!inner(full_name, phone)")
                .eq("clinic_id", clinicId)
                .in("status", ["confirmed", "scheduled", "arrived"]) // Bekleyen, Taslak veya Geldi aşamasındakiler
                .gte("starts_at", startOfDay)
                .lte("starts_at", endOfDay)
                .order("starts_at");

            if (apptError) throw apptError;

            let anamMap = new Map();
            let codeMap = new Map();

            if (appts && appts.length > 0) {
                const patientIds = appts.map(a => a.patient_id).filter(Boolean);
                const apptIds = appts.map(a => a.id);

                const [anamnesisRes, codesRes] = await Promise.all([
                    patientIds.length > 0 ? supabase.from("patient_anamnesis").select("patient_id, filled_by").in("patient_id", patientIds) : Promise.resolve({ data: [], error: null }),
                    apptIds.length > 0 ? supabase.from("checkin_codes").select("appointment_id, code").in("appointment_id", apptIds).gt("expires_at", new Date().toISOString()) : Promise.resolve({ data: [], error: null })
                ]);

                if (anamnesisRes.data) anamMap = new Map(anamnesisRes.data.map(a => [a.patient_id, a.filled_by]));
                if (codesRes.data) codeMap = new Map(codesRes.data.map(c => [c.appointment_id, c.code]));
            }

            const merged = (appts || []).map((a: any) => {
                const startsAt = new Date(a.starts_at);
                const isPast = (now.getTime() - startsAt.getTime()) > (30 * 60 * 1000); // 30+ dakikadır bekliyor mu?

                return {
                    id: a.id,
                    patient_name: a.patients?.full_name || "Bilinmiyor",
                    patient_phone: a.patients?.phone || "No Yok",
                    appointment_time: a.starts_at ? startsAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--",
                    starts_at: a.starts_at,
                    anamnesis_status: (anamMap.get(a.patient_id) === 'PATIENT' ? 'PATIENT_FILLED' : anamMap.has(a.patient_id) ? 'FILLED' : 'EMPTY') as any,
                    checkin_code: codeMap.get(a.id),
                    patient_id: a.patient_id,
                    isPast
                };
            });

            setAppointments(merged);
        } catch (error: any) {
            console.error("Queue load error details:", error?.message || error);
            toast.error("Bekleyen listesi yüklenemedi");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
        const sub = supabase.channel('checkin-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_codes' }, loadQueue)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_anamnesis' }, loadQueue)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [clinicId]);

    if (isLoading && appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100">
                <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-slate-400">Giriş listesi hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl font-bold">📱</div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800">QR Giriş & Form Yönetimi</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                            Bugün bekleyen {appointments.length} randevu
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadQueue}
                    className="px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                    Listeyi Yenile 🔄
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {appointments.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400">
                        Bugün için henüz randevu bulunmuyor.
                    </div>
                ) : (
                    appointments.map((appt) => (
                        <div
                            key={appt.id}
                            className={`bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group relative ${appt.isPast && appt.anamnesis_status === 'EMPTY' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-1">
                                    <span className="px-2.5 py-0.5 bg-slate-100 rounded-full text-[9px] font-black uppercase text-slate-500 w-fit">
                                        🕒 {appt.appointment_time}
                                    </span>
                                    {appt.isPast && appt.anamnesis_status === 'EMPTY' && (
                                        <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-[7px] font-black uppercase tracking-widest animate-pulse w-fit">
                                            ⚠️ GECİKTİ
                                        </span>
                                    )}
                                </div>
                                {appt.anamnesis_status === 'PATIENT_FILLED' ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase border border-emerald-200">
                                        ✨ DOLDURDU
                                    </span>
                                ) : appt.anamnesis_status === 'FILLED' ? (
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[8px] font-black uppercase border border-blue-200">
                                        🏥 KAYITLI
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase border border-amber-100">
                                        ⏳ BEKLENİYOR
                                    </span>
                                )}
                            </div>

                            <h3 className="font-black text-slate-800 text-sm mb-0.5 truncate">{appt.patient_name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mb-4">{appt.patient_phone || "Numara Yok"}</p>

                            <div className="space-y-3">
                                {appt.checkin_code ? (
                                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 relative group/code overflow-hidden">
                                        <div className="flex items-end justify-between relative">
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block font-sans">Giriş Şifresi</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xl font-black text-indigo-600 tracking-wider font-mono">{appt.checkin_code}</span>
                                                    <button
                                                        onClick={() => copyCode(appt.checkin_code!)}
                                                        className="p-1 hover:bg-white rounded text-indigo-300 hover:text-indigo-600 transition-all"
                                                        title="Kopyala"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleGenerate(appt.id)}
                                                className="mb-0.5 text-[8px] font-black text-indigo-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                            >
                                                Yenile
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleGenerate(appt.id)}
                                        className="w-full py-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-[9px] font-black text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all uppercase tracking-widest"
                                    >
                                        Şifre Oluştur 🔑
                                    </button>
                                )}

                                {appt.anamnesis_status !== 'EMPTY' && (
                                    <button
                                        className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all uppercase tracking-widest shadow-sm"
                                        onClick={() => openPatientDetail(appt.patient_id)}
                                    >
                                        Formu İncele 📄
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Patient Detail Modal */}
            {selectedPatient && (
                <PatientDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    patient={selectedPatient}
                    appointments={patientAppts}
                    payments={patientPays}
                    onUpdate={handleUpdatePatient}
                    onDelete={handleDeletePatient}
                />
            )}
        </div>
    );
}
