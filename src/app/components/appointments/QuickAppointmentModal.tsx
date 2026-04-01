"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getDoctors, getTreatmentDefinitions } from "@/lib/api";
import { useClinic } from "@/app/context/ClinicContext";
import { PremiumDatePicker } from "../PremiumDatePicker";
import toast from "react-hot-toast";

interface QuickAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
    initialTreatment?: string;
    onSuccess: (appointmentId: string) => void;
}

export function QuickAppointmentModal({
    isOpen,
    onClose,
    patientId,
    patientName,
    initialTreatment,
    onSuccess
}: QuickAppointmentModalProps) {
    const { clinicId } = useClinic();
    const [doctors, setDoctors] = useState<{ id: string; full_name: string }[]>([]);
    const [treatments, setTreatments] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [time, setTime] = useState("09:00");
    const [doctorId, setDoctorId] = useState("");
    const [treatment, setTreatment] = useState(initialTreatment || "");
    const [duration, setDuration] = useState(30);

    useEffect(() => {
        if (isOpen && clinicId) {
            getDoctors(clinicId).then(setDoctors);
            getTreatmentDefinitions(clinicId).then(setTreatments);
        }
    }, [isOpen, clinicId]);

    useEffect(() => {
        if (initialTreatment) setTreatment(initialTreatment);
    }, [initialTreatment]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!doctorId) return toast.error("Lütfen bir hekim seçin");
        
        setLoading(true);
        try {
            const startsAt = `${date}T${time}:00+03:00`;
            
            // Bitiş zamanını güvenli hesapla (startsAt ile aynı formatta)
            const [year, month, day] = date.split("-").map(Number);
            const [hour, min] = time.split(":").map(Number);
            const endsAtDate = new Date(year, month - 1, day, hour, min + duration);
            
            const format = (n: number) => String(n).padStart(2, '0');
            const endsAt = `${endsAtDate.getFullYear()}-${format(endsAtDate.getMonth() + 1)}-${format(endsAtDate.getDate())}T${format(endsAtDate.getHours())}:${format(endsAtDate.getMinutes())}:00+03:00`;

            const { data, error } = await supabase
                .from("appointments")
                .insert({
                    clinic_id: clinicId,
                    patient_id: patientId,
                    doctor_id: doctorId,
                    starts_at: startsAt,
                    ends_at: endsAt,
                    treatment_type: treatment,
                    status: "confirmed",
                    channel: "phone"
                })
                .select("id")
                .single();

            if (error) throw error;

            toast.success("Randevu başarıyla oluşturuldu");
            onSuccess(data.id);
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error("Randevu oluşturulurken bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl border w-full max-w-md animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Hızlı Randevu</h3>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{patientName}</p>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Tarih</label>
                            <PremiumDatePicker
                                value={date}
                                onChange={setDate}
                                compact
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Saat</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Hekim</label>
                        <select
                            required
                            value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                            <option value="">Hekim Seçin...</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Tedavi / Not</label>
                        <input
                            type="text"
                            placeholder="Örn: Kontrol, İmplant..."
                            value={treatment}
                            onChange={(e) => setTreatment(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Süre (Dakika)</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                            <option value={15}>15 Dakika</option>
                            <option value={30}>30 Dakika</option>
                            <option value={45}>45 Dakika</option>
                            <option value={60}>60 Dakika</option>
                            <option value={90}>90 Dakika</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl text-sm shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? "Kaydediliyor..." : "Randevuyu Onayla"}
                    </button>
                </form>
            </div>
        </div>
    );
}
