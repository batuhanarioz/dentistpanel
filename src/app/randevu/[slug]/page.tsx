"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    Clinic,
    ClinicSettings,
    DayOfWeek,
    TreatmentDefinition,
    User,
} from "@/types/database";
import toast from "react-hot-toast";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

type Step = "SERVICE" | "DOCTOR" | "DATE_TIME" | "INFO" | "SUCCESS" | "ERROR";
// INFO sub-steps: "PHONE" → "CONFIRM_NAME" → "COMPLAINT"
type InfoSubStep = "PHONE" | "CONFIRM_NAME" | "COMPLAINT";

export default function PublicBookingPage() {
    const { slug } = useParams() as { slug: string };
    const router = useRouter();

    const [step, setStep] = useState<Step>("SERVICE");
    const [infoSubStep, setInfoSubStep] = useState<InfoSubStep>("PHONE");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Data State
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [services, setServices] = useState<TreatmentDefinition[]>([]);
    const [doctors, setDoctors] = useState<User[]>([]);
    const [existingAppointments, setExistingAppointments] = useState<{ starts_at: string; ends_at: string; doctor_id: string | null }[]>([]);

    // Selection State
    const [selectedService, setSelectedService] = useState<TreatmentDefinition | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
    // Yerel tarih stringi (YYYY-MM-DD) — toISOString() UTC döndürdüğü için kullanmıyoruz
    const localDateStr = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };
    const [selectedDate, setSelectedDate] = useState<string>(localDateStr(new Date()));
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Form State — phone-first flow
    const [phone, setPhone] = useState("");
    const [foundPatientName, setFoundPatientName] = useState<string | null>(null); // Kayıtlı hasta adı
    const [fullName, setFullName] = useState("");
    const [complaint, setComplaint] = useState("");
    const [isLookingUp, setIsLookingUp] = useState(false);

    // 1. Fetch Clinic & Settings & Doctors & Services
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Adım 1: Klinik — clinic_id diğer sorgular için gerekli
                const { data: clinicData, error: clinicErr } = await supabase
                    .from("clinics").select("*").eq("slug", slug).single();
                if (clinicErr || !clinicData) { setErrorMsg("Klinik bulunamadı."); setStep("ERROR"); return; }
                setClinic(clinicData);

                // Adım 2: settings + services + doctors paralel
                const [
                    { data: settingsData },
                    { data: servicesData },
                    { data: doctorsData },
                ] = await Promise.all([
                    supabase.from("clinic_settings").select("*").eq("clinic_id", clinicData.id).single(),
                    supabase.from("treatment_definitions").select("*").eq("clinic_id", clinicData.id).order("name"),
                    supabase
                        .from("public_booking_doctors")
                        .select("id, full_name, working_hours, role, is_clinical_provider, allowed_treatments")
                        .eq("clinic_id", clinicData.id),
                ]);

                if (settingsData) {
                    setSettings(settingsData);
                    if (!settingsData.is_online_booking_enabled) {
                        setErrorMsg("Bu klinik şu anda online randevu kabul etmiyor.");
                        setStep("ERROR"); return;
                    }
                }
                setServices(servicesData || []);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setDoctors((doctorsData as any) || []);

            } catch (err) {
                console.error(err);
                setErrorMsg("Veriler yüklenirken bir hata oluştu.");
                setStep("ERROR");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [slug]);

    // 2. Fetch existing appointments for selected date
    useEffect(() => {
        if (!clinic || !selectedDate) return;
        const fetchDailyAppointments = async () => {
            // Tarihi TR saatine göre başlangıç/bitiş ver (UTC&apos;ye çevirme)
            const { data } = await supabase
                .from("appointments")
                .select("starts_at, ends_at, doctor_id")
                .eq("clinic_id", clinic.id)
                .gte("starts_at", `${selectedDate}T00:00:00`)
                .lte("starts_at", `${selectedDate}T23:59:59`)
                .neq("status", "cancelled");
            setExistingAppointments(data || []);
        };
        fetchDailyAppointments();
    }, [clinic, selectedDate]);

    const getFilteredDoctors = useCallback(() => {
        if (!selectedService) return doctors;
        return doctors.filter((dr: any) => {
            if (!dr.allowed_treatments) return true;
            return dr.allowed_treatments.includes(selectedService.id);
        });
    }, [doctors, selectedService]);

    const brandColor = clinic?.theme_color_from || "#4f46e5";

    // 3. Slot generator — DÜZELTME: saat dilimi sorunu çözüldü, sabit slot modu eklendi
    const generateSlots = useCallback(() => {
        if (!clinic || !settings) return [];

        // Seçilen tarihin gün adını al (Türkiye saatiyle)
        const dateObj = new Date(`${selectedDate}T12:00:00`); // noon → weekday hatasını önler
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek;

        // Hekim seçili değilse (İlk Müsaitlik), tüm doktorları tara
        // Hekim seçiliyse yalnızca onun çalışma saatlerini kullan
        const getScheduleForDoctor = (dr: User) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (dr.working_hours as any)?.[dayName] || (clinic as any).working_hours?.[dayName];
        };

        // Hangi doktorları kontrol edeceğiz?
        const targetDoctors = selectedDoctor ? [selectedDoctor] : getFilteredDoctors();
        if (targetDoctors.length === 0) return [];

        // Randevu süresi: sabit slot modu aktifse use_service_duration false'tur
        const useServiceDuration = settings.online_booking_config?.use_service_duration ?? true;
        const duration = (useServiceDuration && selectedService?.default_duration)
            ? selectedService.default_duration
            : (settings.online_booking_config?.slot_duration || 30);

        const leadTimeHours = settings.online_booking_config?.min_lead_time_hours ?? 2;
        const now = new Date();
        const minAllowedTime = new Date(now.getTime() + leadTimeHours * 60 * 60 * 1000);

        // Klinik genel tatil/mesai kontrolü (overrides öncelikli)
        const overrides = clinic.working_hours_overrides || [];
        const override = overrides.find(o => o.date === selectedDate);
        if (override?.is_closed) return [];

        // Tüm doktorların slot setlerini birleştir
        const slotSet = new Set<string>();
        const displayInterval = settings.online_booking_config?.slot_display_interval || 15; // Dinamik gösterim aralığı (dk)
        const buffer = settings.online_booking_config?.buffer_time || 0; // Dinamik hazırlık payı (dk)

        // Klinik genel çalışma saatlerini baz alarak geniş bir aralık oluştur
        const clinicStartTime = "07:00";
        const clinicEndTime = "22:00";

        let loopTime = new Date(`${selectedDate}T${clinicStartTime}:00`);
        const loopEnd = new Date(`${selectedDate}T${clinicEndTime}:00`);

        while (loopTime < loopEnd) {
            const slotStart = new Date(loopTime);
            const slotEnd = new Date(loopTime.getTime() + (duration + buffer) * 60 * 1000);

            // Minimum önceden rezervasyon kontrolü
            if (slotStart > minAllowedTime) {
                // En az bir doktor bu aralıkta müsait mi?
                const isAnyDoctorAvailable = targetDoctors.some(dr => {
                    const schedule = getScheduleForDoctor(dr);
                    if (!schedule || !schedule.enabled) return false;

                    const drStartStr = schedule.start || schedule.open;
                    const drEndStr = schedule.end || schedule.close;
                    if (!drStartStr || !drEndStr) return false;

                    const drStart = new Date(`${selectedDate}T${drStartStr}:00`);
                    const drEnd = new Date(`${selectedDate}T${drEndStr}:00`);

                    // 1. Doktorun çalışma saatleri içinde mi?
                    if (slotStart < drStart || slotEnd > drEnd) return false;

                    // 1.1 Mola saatleri içinde mi?
                    if (schedule.lunch_start && schedule.lunch_end) {
                        const [lStartH, lStartM] = schedule.lunch_start.split(":").map(Number);
                        const [lEndH, lEndM] = schedule.lunch_end.split(":").map(Number);

                        const lunchStart = new Date(slotStart);
                        lunchStart.setHours(lStartH, lStartM, 0, 0);

                        const lunchEnd = new Date(slotStart);
                        lunchEnd.setHours(lEndH, lEndM, 0, 0);

                        // Kesişim kontrolü: [slotStart, slotEnd] ile [lunchStart, lunchEnd]
                        // Çıkış: (Randevu Başlangıcı < Mola Bitişi) VE (Randevu Bitişi > Mola Başlangıcı)
                        const sStart = slotStart.getTime();
                        const sEnd = slotStart.getTime() + duration * 60 * 1000; // Buffer'sız ham süre çakışması yeterli
                        const lStart = lunchStart.getTime();
                        const lEnd = lunchEnd.getTime();

                        if (sStart < lEnd && sEnd > lStart) return false;
                    }

                    // 2. Bu doktor için çakışma var mı? 
                    // Randevu çakışması kontrol ederken hem mevcut randevulara hem de bizim buffer'ımıza bakarız
                    const hasConflict = existingAppointments.some(a => {
                        if (a.doctor_id && a.doctor_id !== dr.id) return false;
                        const aStart = new Date(a.starts_at);
                        const aEnd = new Date(a.ends_at);

                        // Kesişim kontrolü: Yeni randevunun [slotStart, slotEnd] aralığı 
                        // mevcut randevunun [aStart, aEnd + buffer] aralığıyla çakışıyor mu?
                        // slotEnd zaten (duration + buffer) içeriyor, bu yüzden drEnd kontrolünde işe yarıyor.
                        // Çakışma kontrolünde ise:
                        // Sadece "Randevu bittikten sonra mola" mantığını işletiyoruz.

                        const effectiveAEnd = aEnd.getTime() + buffer * 60 * 1000;
                        const sStart = slotStart.getTime();
                        const sEnd = slotEnd.getTime(); // duration + buffer dahil olan sEnd
                        const aStartMs = aStart.getTime();

                        // Tam çakışma kontrolü:
                        // Yeni randevu bloğu [sStart, sEnd], mevcut [aStart, effectiveAEnd] ile kesişmemeli.
                        return sStart < effectiveAEnd && sEnd > aStartMs;
                    });

                    return !hasConflict;
                });

                if (isAnyDoctorAvailable) {
                    slotSet.add(slotStart.toTimeString().slice(0, 5));
                }
            }

            loopTime = new Date(loopTime.getTime() + displayInterval * 60 * 1000);
        }

        return Array.from(slotSet).sort();
    }, [clinic, settings, selectedDate, selectedDoctor, doctors, existingAppointments, selectedService]);

    const availableSlots = useMemo(() => generateSlots(), [generateSlots]);

    // 4. Telefon araması → hasta bul
    const handlePhoneLookup = async () => {
        if (!phone.trim() || !clinic) return;
        setIsLookingUp(true);
        try {
            const res = await fetch("/api/booking/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clinicId: clinic.id, phone: phone.trim() }),
            });
            const data = await res.json() as { found: boolean; fullName?: string };

            if (data.found && data.fullName) {
                setFoundPatientName(data.fullName);
                setFullName(data.fullName);
                setInfoSubStep("CONFIRM_NAME");
            } else {
                setFoundPatientName(null);
                setFullName("");
                setInfoSubStep("COMPLAINT");
            }
        } catch {
            setFoundPatientName(null);
            setInfoSubStep("COMPLAINT");
        } finally {
            setIsLookingUp(false);
        }
    };

    // 5. Randevu oluştur
    const handleBooking = async () => {
        if (!fullName || !phone || !complaint.trim() || !selectedTime || !clinic) {
            toast.error("Lütfen tüm zorunlu alanları doldurunuz.");
            return;
        }
        setIsSubmitting(true);
        try {
            const startsAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
            const useServiceDuration = settings?.online_booking_config?.use_service_duration ?? true;
            const duration = (useServiceDuration && selectedService?.default_duration)
                ? selectedService.default_duration
                : (settings?.online_booking_config?.slot_duration || 30);

            const res = await fetch("/api/booking/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clinicId: clinic.id,
                    fullName,
                    phone,
                    complaint: complaint.trim(),
                    requestedAt: startsAt,
                    durationMinutes: duration,
                    doctorId: selectedDoctor?.id ?? null,
                    treatmentId: selectedService?.id ?? null,
                    treatmentName: selectedService?.name ?? null,
                }),
            });

            const json = await res.json() as { error?: string };
            if (!res.ok) {
                toast.error(json.error ?? "Randevu oluşturulurken bir hata oluştu.");
                return;
            }
            setStep("SUCCESS");
            toast.success("Randevu talebiniz iletildi. Klinik sizi arayacaktır.");
        } catch {
            toast.error("Randevu oluşturulurken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── LOADING / ERROR ──────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4 relative overflow-hidden">
            {/* Background elements for NextGency Feel */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-50/50 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 border-[3px] border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] animate-pulse">Kliniğe Erişiliyor</p>
                <div className="w-8 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="w-full h-full bg-indigo-500 animate-[loading-bar_1.5s_ease-in-out_infinite]" />
                </div>
            </div>

            {/* NextGency OS Branding */}
            <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-30">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-900 rounded-lg flex items-center justify-center">
                        <span className="text-[8px] font-black text-white italic">NG</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">NextGency OS</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">AI Agency</p>
            </div>
        </div>
    );

    if (step === "ERROR") return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2.5rem] flex items-center justify-center text-4xl mb-6 shadow-xl shadow-rose-100/50">⚠️</div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Eyvah! Bir Sorun Var</h1>
            <p className="text-sm font-bold text-slate-500 max-w-sm mb-8 leading-relaxed">{errorMsg}</p>
            <button onClick={() => router.back()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Geri Dön</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans" style={{ borderTop: `4px solid ${brandColor}` }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight leading-tight px-2">{clinic?.name}</h1>
                    <div className="inline-block px-4 py-1.5 bg-indigo-50 rounded-full">
                        <p className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px]">Hızlı Online Randevu</p>
                    </div>
                </div>

                {/* ── STEP 1: SERVICE ── */}
                {step === "SERVICE" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="bg-white px-6 py-5 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl">🦷</div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800">Ne Tür Bir Tedavi?</h2>
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Lütfen İşlem Seçiniz</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {services.map(s => (
                                    <button key={s.id}
                                        onClick={() => { setSelectedService(s); setStep("DOCTOR"); }}
                                        className="w-full px-5 py-3.5 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl text-left transition-all group flex items-center justify-between hover:shadow-lg hover:shadow-indigo-50"
                                    >
                                        <span className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{s.name}</span>
                                        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </button>
                                ))}
                                <button
                                    onClick={() => { setSelectedService(null); setStep("DOCTOR"); }}
                                    className="w-full px-5 py-3.5 bg-indigo-50/40 hover:bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl text-left transition-all group flex items-center justify-between"
                                >
                                    <span className="text-sm font-black text-indigo-800">Diğer / Muayene</span>
                                    <svg className="w-4 h-4 text-indigo-300 group-hover:text-indigo-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: DOCTOR ── */}
                {step === "DOCTOR" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-700">
                        <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">👨‍⚕️</div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Hangi Hekimi Seçersiniz?</h2>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Hekim Seçimi Yapınız</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => { setSelectedDoctor(null); setStep("DATE_TIME"); }}
                                    className="w-full p-6 bg-indigo-600 text-white rounded-3xl text-left transition-all shadow-xl shadow-indigo-100 flex items-center justify-between active:scale-95"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-lg font-black italic">Fark Etmez / İlk Müsaitlik</span>
                                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">En hızlı randevu seçeneği</span>
                                    </div>
                                    <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">🚀</div>
                                </button>
                                {getFilteredDoctors().map(dr => (
                                    <button key={dr.id}
                                        onClick={() => { setSelectedDoctor(dr); setStep("DATE_TIME"); }}
                                        className="w-full p-6 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-3xl text-left transition-all group flex items-center justify-between hover:shadow-xl hover:shadow-indigo-100/40"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">Dr. {dr.full_name}</span>
                                            {dr.specialty_code && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{dr.specialty_code}</span>}
                                        </div>
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:rotate-6 transition-all border border-slate-100">👨‍⚕️</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setStep("SERVICE")} className="mt-8 mx-auto w-fit text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                                HİZMET SEÇİMİNE DÖN
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: DATE_TIME ── */}
                {step === "DATE_TIME" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-700">
                        <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">📅</div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Tarih ve Saat Seçiniz</h2>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">En Uygun Zamanı Belirleyin</p>
                                </div>
                            </div>
                            {/* Date strip — yerel tarih kullanır ve ayarlara göre sınırlanır */}
                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none snap-x">
                                {Array.from({ length: settings?.online_booking_config?.max_days_ahead || 14 }).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + i);
                                    const dStr = localDateStr(d);
                                    const isActive = selectedDate === dStr;

                                    // Günün müsaitlik kontrolü (Klinik kapalı mı?)
                                    const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek;
                                    const clinicSchedule = (clinic as any)?.working_hours?.[dayName];
                                    const overrides = clinic?.working_hours_overrides || [];
                                    const override = overrides.find(o => o.date === dStr);
                                    const isClinicClosed = override ? override.is_closed : !clinicSchedule?.enabled;

                                    if (isClinicClosed) return null;

                                    return (
                                        <button key={dStr} onClick={() => setSelectedDate(dStr)}
                                            className={`shrink-0 w-20 h-24 rounded-3xl flex flex-col items-center justify-center transition-all snap-center ${isActive ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${isActive ? "text-white/70" : "text-slate-400"}`}>
                                                {d.toLocaleDateString("tr-TR", { weekday: "short" })}
                                            </span>
                                            <span className="text-2xl font-black">{d.getDate()}</span>
                                            <span className={`text-[9px] font-bold uppercase ${isActive ? "text-white/50" : "text-slate-300"}`}>
                                                {d.toLocaleDateString("tr-TR", { month: "short" })}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Takvimden farklı tarih seçme */}
                            <div className="flex items-center gap-2 py-2 mb-2">
                                <div className="flex-1 h-px bg-slate-100" />
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">veya tarih seç</label>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className="mb-4">
                                {(() => {
                                    const maxDays = settings?.online_booking_config?.max_days_ahead || 30;
                                    const maxDate = new Date();
                                    maxDate.setDate(maxDate.getDate() + maxDays);
                                    const maxDateStr = localDateStr(maxDate);

                                    return (
                                        <PremiumDatePicker
                                            value={selectedDate}
                                            onChange={(date) => setSelectedDate(date)}
                                            today={localDateStr(new Date())}
                                            minDate={localDateStr(new Date())}
                                            maxDate={maxDateStr}
                                            placeholder="Farklı bir tarih seçin"
                                            isDateDisabled={(dStr) => {
                                                const d = new Date(`${dStr}T12:00:00`);
                                                const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek;

                                                // 1. Klinik Override Kontrolü (Tatil vb)
                                                const overrides = clinic?.working_hours_overrides || [];
                                                const override = overrides.find(o => o.date === dStr);
                                                if (override?.is_closed) return true;

                                                // 2. Klinik Genel Mesai Kontrolü
                                                const clinicSchedule = (clinic as any)?.working_hours?.[dayName];
                                                if (!clinicSchedule?.enabled && !override) return true;

                                                // 3. Hekim Müsaitlik Kontrolü
                                                // Seçili hekim varsa sadece ona bak, yoksa herhangi bir hekim var mı bak
                                                const targetDoctors = selectedDoctor ? [selectedDoctor] : doctors;
                                                const anyDoctorWorking = targetDoctors.some(dr => {
                                                    const drSchedule = (dr.working_hours as any)?.[dayName] || (clinic as any).working_hours?.[dayName];
                                                    return drSchedule?.enabled;
                                                });

                                                return !anyDoctorWorking;
                                            }}
                                        />
                                    );
                                })()}
                            </div>
                            {/* Time slots */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                                {availableSlots.length > 0 ? (
                                    availableSlots.map(time => (
                                        <button key={time}
                                            onClick={() => { setSelectedTime(time); setStep("INFO"); setInfoSubStep("PHONE"); }}
                                            className="h-14 bg-slate-50 hover:bg-emerald-500 hover:text-white border border-slate-100 rounded-2xl flex items-center justify-center text-lg font-black text-slate-700 transition-all hover:shadow-lg hover:shadow-emerald-100 active:scale-95"
                                        >{time}</button>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                        <p className="text-sm font-bold text-slate-400 italic">Bu tarih için müsait saat bulunamadı. 🔍</p>
                                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Lütfen başka bir gün deneyiniz.</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setStep("DOCTOR")} className="mt-8 mx-auto w-fit text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                                HEKİM SEÇİMİNE DÖN
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: INFO (Phone-first flow) ── */}
                {step === "INFO" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-700">
                        <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">👤</div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Bilgilerinizi Doğrulayın</h2>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Sizi Tanıyalım</p>
                                </div>
                            </div>

                            {/* Randevu özeti */}
                            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 mb-6 flex items-center justify-between">
                                <div className="text-xs font-black text-slate-600">
                                    {selectedService?.name || "Muayene"} · {selectedDoctor ? `Dr. ${selectedDoctor.full_name}` : "İlk Müsait"}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-indigo-600">{new Date(selectedDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</p>
                                    <p className="text-lg font-black text-indigo-600 leading-tight">{selectedTime}</p>
                                </div>
                            </div>

                            {/* Sub-step: PHONE */}
                            {infoSubStep === "PHONE" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon Numaranız</label>
                                        <input
                                            type="tel" placeholder="5xx xxx xx xx"
                                            value={phone} onChange={e => setPhone(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && phone.trim() && handlePhoneLookup()}
                                            className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-base font-black text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePhoneLookup}
                                        disabled={!phone.trim() || isLookingUp}
                                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                    >
                                        {isLookingUp ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Devam Et →"}
                                    </button>
                                </div>
                            )}

                            {/* Sub-step: CONFIRM_NAME — kayıtlı hasta bulundu */}
                            {infoSubStep === "CONFIRM_NAME" && foundPatientName && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-lg font-black shrink-0">
                                            {foundPatientName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-0.5">Sizi Tanıdık!</p>
                                            <p className="text-lg font-black text-slate-900">{foundPatientName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 text-center">Bu siz misiniz?</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setInfoSubStep("COMPLAINT")}
                                            className="flex-1 h-12 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all"
                                        >Evet, Benim ✓</button>
                                        <button
                                            onClick={() => {
                                                setFoundPatientName(null);
                                                setFullName("");
                                                setInfoSubStep("COMPLAINT");
                                            }}
                                            className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
                                        >Hayır, Değilim</button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed">
                                        &#34;Hayır&#34; seçeneğini seçerseniz adınızı tekrar girebilirsiniz.
                                    </p>
                                </div>
                            )}

                            {/* Sub-step: COMPLAINT — şikayet + ad (eğer bilinmiyorsa) */}
                            {infoSubStep === "COMPLAINT" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {/* Ad alanı sadece kayıtlı hasta bulunamadıysa veya "Hayır" dediyse */}
                                    {!foundPatientName && (
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adınız Soyadınız</label>
                                            <input
                                                type="text" placeholder="Ali Yılmaz"
                                                value={fullName} onChange={e => setFullName(e.target.value)}
                                                className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-base font-black text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                            />
                                        </div>
                                    )}
                                    {/* Kayıtlı hasta ise adını göster (salt okunur) */}
                                    {foundPatientName && (
                                        <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                                                {foundPatientName.charAt(0)}
                                            </div>
                                            <p className="text-sm font-black text-slate-800">{foundPatientName}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Şikayet / İşlem <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            placeholder="İşlem / şikayetinizi kısaca belirtin..."
                                            value={complaint} onChange={e => setComplaint(e.target.value)}
                                            className="w-full h-28 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleBooking}
                                        disabled={isSubmitting || !fullName || !phone || !complaint.trim()}
                                        className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-2"
                                    >
                                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>TALEBİ GÖNDER &amp; ONAYLA ✓</>}
                                    </button>
                                    <p className="text-[9px] font-bold text-slate-400 text-center leading-relaxed px-4">
                                        Talebiniz kliniğe iletilecek ve ekip en kısa sürede sizi arayarak onay bilgisi verecektir.
                                    </p>
                                </div>
                            )}

                            <button onClick={() => setStep("DATE_TIME")} className="mt-8 mx-auto w-fit text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                                TARİH SEÇİMİNE DÖN
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 5: SUCCESS ── */}
                {step === "SUCCESS" && (
                    <div className="text-center py-10 sm:py-16 animate-in zoom-in-95 duration-1000">
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-emerald-100 ring-8 ring-emerald-50">✓</div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 tracking-tight">Talebiniz Alındı!</h2>

                        <div className="max-w-xs mx-auto mb-10">
                            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 rounded-2xl px-5 py-4 leading-relaxed shadow-sm">
                                ⏳ Randevu talebiniz başarıyla iletildi. Talebiniz klinik tarafından onaylanana kadar kesinleşmez. Ekibimiz en kısa sürede sizi bilgilendirecektir.
                            </p>
                        </div>

                        {/* Özet kart */}
                        <div className="max-w-xs mx-auto p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] text-left space-y-3 mb-10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>
                            </div>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest text-center mb-4">RANDEVU ÖZETİ</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Hasta</span>
                                <span className="text-sm font-black text-slate-900">{fullName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Tedavi</span>
                                <span className="text-sm font-black text-slate-700">{selectedService?.name || "Muayene"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Hekim</span>
                                <span className="text-sm font-black text-slate-700">{selectedDoctor ? `Dr. ${selectedDoctor.full_name}` : "İlk Müsait Hekim"}</span>
                            </div>
                            <div className="pt-3 mt-1 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Tarih / Saat</span>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-700">{new Date(selectedDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</p>
                                    <p className="text-xl font-black text-indigo-600">{selectedTime}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push("/")}
                            className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-[0.98] transition-all inline-flex items-center gap-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            ANA SAYFAYA DÖN
                        </button>
                    </div>
                )}

                {/* Footer Section - Location Info */}
                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-3 opacity-60">
                    <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                        <span>{clinic?.name}</span>
                        {(clinic?.district || clinic?.city) && (
                            <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-slate-500">
                                    {[clinic?.district, clinic?.city].filter(Boolean).join(" / ")}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
                            © 2026 Tüm Hakları Saklıdır
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
