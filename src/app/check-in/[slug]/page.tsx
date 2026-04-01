"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCheckin, CheckinAppointment } from "@/hooks/useCheckin";
import { AnamnesisSection } from "@/app/components/patients/AnamnesisSection";
import { PatientAnamnesis, EMPTY_ANAMNESIS } from "@/types/database";
import toast from "react-hot-toast";

type Step = "CONSENT" | "IDENTIFY" | "SELECT_APPOINTMENT" | "FILL_FORM" | "SUCCESS" | "ERROR";

export default function PublicCheckinPage() {
    const { slug } = useParams() as { slug: string };
    const [step, setStep] = useState<Step>("CONSENT");
    const [clinic, setClinic] = useState<{ id: string; name: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [appointments, setAppointments] = useState<CheckinAppointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<CheckinAppointment | null>(null);
    const [anamnesisData, setAnamnesisData] = useState<PatientAnamnesis | null>(null);

    const { isLoadingVerify, isLoadingSearch, findAppointmentsByPhone, verifyCode } = useCheckin();

    // 1. Klinik Bilgisini Getir
    useEffect(() => {
        const fetchClinic = async () => {
            try {
                const { data, error } = await supabase
                    .from("clinics")
                    .select("id, name")
                    .eq("slug", slug)
                    .single();

                if (error || !data) {
                    setErrorMsg("Klinik bulunamadı veya bağlantı hatası oluştu.");
                    setStep("ERROR");
                    return;
                }
                setClinic(data);
            } catch {
                setErrorMsg("Sistem hatası oluştu. Lütfen daha sonra tekrar deneyiniz.");
                setStep("ERROR");
            }
        };
        fetchClinic();
    }, [slug]);

    const handleReset = () => {
        setStep("IDENTIFY");
        setPhone("");
        setCode("");
        setAppointments([]);
        setSelectedAppointment(null);
        setAnamnesisData(null);
    };

    // Telefon ile Sorgula
    const handlePhoneSearch = useCallback(async () => {
        const trimmed = phone.replace(/\D/g, "");
        if (trimmed.length < 10) return toast.error("Lütfen geçerli bir telefon numarası giriniz");
        const results = await findAppointmentsByPhone(phone, slug);
        if (results && results.length > 0) {
            setAppointments(results);
            setStep("SELECT_APPOINTMENT");
        } else {
            toast.error("Bugün için randevunuz bulunamadı");
        }
    }, [phone, slug, findAppointmentsByPhone]);

    // Kod ile Sorgula
    const handleCodeVerify = useCallback(async () => {
        if (code.replace(/\D/g, "").length !== 4) return toast.error("Lütfen 4 haneli kodu giriniz");

        const result = await verifyCode(code, slug);
        if (result) {
            setSelectedAppointment(result);
            await loadAnamnesis(result.patientId);
            setStep("FILL_FORM");
        }
    }, [code, slug, verifyCode]);

    // Anamnez Verisini Yükle
    const loadAnamnesis = async (patientId: string) => {
        if (!patientId) return;
        const { data } = await supabase
            .from("patient_anamnesis")
            .select("*")
            .eq("patient_id", patientId)
            .maybeSingle();
        setAnamnesisData(data ?? null);
    };

    const handleSelectAppointment = async (appt: CheckinAppointment) => {
        setSelectedAppointment(appt);
        await loadAnamnesis(appt.patientId);
        setStep("FILL_FORM");
    };

    const handleSaveAnamnesis = async (draft: PatientAnamnesis) => {
        if (!selectedAppointment || !clinic) return;
        try {
            const res = await fetch("/api/checkin/save-anamnesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: selectedAppointment.id,
                    slug,
                    anamnesisData: draft,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Kaydedilirken bir hata oluştu");

            setStep("SUCCESS");
            toast.success("Bilgileriniz başarıyla kaydedildi");
        } catch (error: unknown) {
            const err = error as { message?: string };
            toast.error(err?.message ?? "Kaydedilirken bir hata oluştu");
        }
    };

    const handleSkipAnamnesis = async () => {
        if (!selectedAppointment) return;
        // Sadece arrived status'una geç, mevcut anamnezi koruyarak
        try {
            await fetch("/api/checkin/save-anamnesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: selectedAppointment.id,
                    slug,
                    anamnesisData: anamnesisData ?? EMPTY_ANAMNESIS,
                }),
            });
        } catch {
            // skip hatası gösterme, akışı engelleme
        }
        setStep("SUCCESS");
    };

    // ── ERROR ────────────────────────────────────────────────────────────────
    if (step === "ERROR") {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-xl shadow-rose-100/50">⚠️</div>
                <h1 className="text-2xl font-black text-slate-800 mb-2">Eyvah! Bir sorun oluştu.</h1>
                <p className="text-sm font-bold text-slate-500 max-w-sm mb-8 leading-relaxed">{errorMsg}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                    Sayfayı Yenile 🔄
                </button>
            </div>
        );
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    if (!clinic) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Klinik Verileri Yükleniyor...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900 border-t-4 border-indigo-600">
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight leading-tight px-2">
                        {clinic.name}
                    </h1>
                    <div className="inline-block px-3 py-1 bg-indigo-50 rounded-full">
                        <p className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px]">
                            Hızlı Giriş & Anamnez Paneli
                        </p>
                    </div>
                </div>

                {/* ── KVKK Onay ───────────────────────────────────────────── */}
                {step === "CONSENT" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">🔒</div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Gizlilik Bildirimi</h2>
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">KVKK Aydınlatma Metni</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-5 text-xs text-slate-600 leading-relaxed space-y-3 font-medium max-h-56 overflow-y-auto">
                                <p>
                                    Bu form aracılığıyla paylaşacağınız kişisel sağlık verileriniz (tıbbi geçmişiniz, ilaç kullanımınız, alerji bilgileriniz vb.), <strong>{clinic.name}</strong> tarafından 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlenmektedir.
                                </p>
                                <p><strong>Veri Sorumlusu:</strong> {clinic.name}</p>
                                <p><strong>İşleme Amacı:</strong> Sağlık hizmetlerinin yürütülmesi, tedavi sürecinin planlanması ve hasta güvenliğinin sağlanması.</p>
                                <p><strong>Paylaşım:</strong> Verileriniz yalnızca kliniğinizdeki sağlık profesyonelleri tarafından erişilebilir; üçüncü taraflarla paylaşılmaz.</p>
                                <p><strong>Haklarınız:</strong> Verilerinize erişim, düzeltme, silme ve işleme itiraz haklarınız bulunmaktadır. Bu hakları kullanmak için kliniğimizle iletişime geçebilirsiniz.</p>
                                <p>Formu doldurmak zorunlu değildir; sağlık bilgilerinizi klinikteki personelinize sözlü olarak da iletebilirsiniz.</p>
                            </div>
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => setStep("IDENTIFY")}
                                    className="w-full py-4 sm:py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                                >
                                    Okudum, Anladım — Devam Et ✓
                                </button>
                                <p className="text-center text-[10px] font-bold text-slate-400 leading-relaxed">
                                    Bu butona tıklayarak verilerinizin yukarıda belirtilen amaçlar doğrultusunda işlenmesine açık rıza vermiş olursunuz.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── IDENTIFY ────────────────────────────────────────────── */}
                {step === "IDENTIFY" && (
                    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {/* Telefon */}
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
                            <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-1 flex items-center gap-3 relative">
                                <span className="flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-xl text-xl">📱</span>
                                Telefon ile Giriş
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-5 relative">Kayıtlı telefon numaranızla randevunuzu bulun</p>
                            <div className="space-y-4 relative">
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="5xx xxx xx xx"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handlePhoneSearch(); }}
                                    className="w-full h-14 sm:h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-lg sm:text-xl font-black text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                />
                                <button
                                    onClick={handlePhoneSearch}
                                    disabled={isLoadingSearch}
                                    className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isLoadingSearch ? "Aranıyor..." : "Randevularımı Bul 🔍"}
                                </button>
                            </div>
                        </div>

                        <div className="relative flex items-center py-2 sm:py-4">
                            <div className="flex-grow border-t border-slate-200/60"></div>
                            <span className="flex-shrink mx-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#F8FAFC] px-2">Veya</span>
                            <div className="flex-grow border-t border-slate-200/60"></div>
                        </div>

                        {/* Kod */}
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
                            <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-1 flex items-center gap-3 relative">
                                <span className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-xl text-xl">🔑</span>
                                Personel Kodu ile Giriş
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-5 relative">Sekreterimizden aldığınız 4 haneli kodu giriniz</p>
                            <div className="flex flex-col sm:flex-row gap-3 relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="----"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleCodeVerify(); }}
                                    className="flex-grow h-14 sm:h-16 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-xl sm:text-2xl font-black text-center tracking-[0.5em] text-amber-600 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                                />
                                <button
                                    onClick={handleCodeVerify}
                                    disabled={isLoadingVerify}
                                    className="px-8 h-14 sm:h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isLoadingVerify ? "Doğrulanıyor..." : "Giriş"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SELECT_APPOINTMENT ───────────────────────────────────── */}
                {step === "SELECT_APPOINTMENT" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-700">
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="mb-8">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Randevu Seçiniz</h2>
                                <p className="text-[10px] sm:text-[11px] font-bold text-indigo-600 uppercase tracking-[0.15em]">
                                    SİZE AİT {appointments.length} RANDEVU BULUNDU
                                </p>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                {appointments.map(appt => (
                                    <button
                                        key={appt.id}
                                        onClick={() => handleSelectAppointment(appt)}
                                        className="w-full p-5 sm:p-6 bg-slate-50 hover:bg-indigo-600 rounded-[2rem] text-left transition-all group flex items-center justify-between hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-100"
                                    >
                                        <div>
                                            <span className="text-[9px] font-black group-hover:text-white/80 text-indigo-600 uppercase tracking-widest block mb-1">
                                                {appt.patientName}
                                            </span>
                                            <span className="text-xl sm:text-2xl font-black group-hover:text-white text-slate-800 transition-colors tracking-tight">
                                                {appt.appointmentTime}
                                            </span>
                                            <span className="block text-[10px] font-bold group-hover:text-white/60 text-slate-400 mt-1 uppercase">
                                                {appt.treatmentType || "Genel Muayene"}
                                            </span>
                                            {appt.doctorName && (
                                                <span className="block text-[10px] font-bold group-hover:text-white/50 text-slate-300 mt-0.5">
                                                    Dr. {appt.doctorName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white shadow-sm rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep("IDENTIFY")}
                                className="mt-8 mx-auto w-fit text-[10px] sm:text-[11px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                </svg>
                                Geri Dön
                            </button>
                        </div>
                    </div>
                )}

                {/* ── FILL_FORM ────────────────────────────────────────────── */}
                {step === "FILL_FORM" && selectedAppointment && (
                    <div className="animate-in fade-in slide-in-from-right-6 duration-700">
                        <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 mb-6">
                            <div className="flex items-center justify-between gap-5">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner">📝</div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                            {selectedAppointment.patientName}
                                        </h2>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 tracking-[0.1em] uppercase bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                            {selectedAppointment.appointmentTime}
                                            {selectedAppointment.doctorName && ` · Dr. ${selectedAppointment.doctorName}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSkipAnamnesis}
                                    className="shrink-0 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-tight border border-slate-200 rounded-xl px-3 py-2 transition-colors"
                                    title="Formu doldurmadan devam et"
                                >
                                    Atla
                                </button>
                            </div>
                            <p className="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed">
                                Tıbbi bilgilerinizi güncelleyebilir veya sağ üstteki &quot;Atla&quot; butonuna basarak formsuz devam edebilirsiniz.
                            </p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                            <AnamnesisSection
                                patientId={selectedAppointment.patientId}
                                data={anamnesisData}
                                isLoading={false}
                                onSave={handleSaveAnamnesis}
                                editMode={true}
                                hideEditButton={true}
                                onCancel={() => setStep("IDENTIFY")}
                                cancelLabel="Çıkış"
                            />
                        </div>
                    </div>
                )}

                {/* ── SUCCESS ──────────────────────────────────────────────── */}
                {step === "SUCCESS" && selectedAppointment && (
                    <div className="text-center py-12 sm:py-16 animate-in zoom-in-95 duration-700">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500 text-white rounded-[3rem] sm:rounded-[4rem] flex items-center justify-center text-5xl sm:text-7xl mx-auto mb-10 shadow-2xl shadow-emerald-200">
                            ✓
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">Kayıt Başarılı!</h2>

                        {/* Hangi randevu için check-in yapıldı */}
                        <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 mb-8">
                            <span className="text-emerald-600 text-lg">🦷</span>
                            <div className="text-left">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Randevunuz</p>
                                <p className="text-sm font-black text-slate-800">
                                    {selectedAppointment.appointmentTime}
                                    {selectedAppointment.treatmentType && ` — ${selectedAppointment.treatmentType}`}
                                </p>
                                {selectedAppointment.doctorName && (
                                    <p className="text-[10px] font-bold text-slate-500">Dr. {selectedAppointment.doctorName}</p>
                                )}
                            </div>
                        </div>

                        <div className="max-w-sm mx-auto mb-12">
                            <p className="text-base sm:text-lg text-slate-500 font-bold leading-relaxed px-4">
                                Tıbbi bilgileriniz kliniğimize başarıyla iletildi. Lütfen bekleme salonunda istirahat ediniz, isminiz okunduğunda asistanımız size yardımcı olacaktır.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleReset}
                                className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center gap-3 mx-auto"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Bilgilerimi Güncelle
                            </button>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                Tıbbi bilgilerinizi güncellemek için yukarıdaki butonu kullanabilirsiniz
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
