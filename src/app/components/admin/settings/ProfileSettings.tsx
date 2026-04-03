"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { TURKEY_CITIES, getDistricts } from "@/constants/turkeyGeo";

export function ProfileSettings() {
    const clinic = useClinic();
    const [profileName, setProfileName] = useState("");
    const [profilePhone, setProfilePhone] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileAddress, setProfileAddress] = useState("");
    const [profileCity, setProfileCity] = useState("");
    const [profileDistrict, setProfileDistrict] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalEmail, setOriginalEmail] = useState("");
    const [emailConfirm, setEmailConfirm] = useState("");
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (clinic.clinicId) loadProfileSettings();
    }, [clinic.clinicId]);

    const loadProfileSettings = async () => {
        if (!clinic.clinicId) return;
        setProfileLoading(true);
        try {
            const { data } = await supabase
                .from("clinics")
                .select("name, phone, email, address, city, district")
                .eq("id", clinic.clinicId)
                .single();
            if (data) {
                setProfileName(data.name ?? "");
                setProfilePhone(data.phone ?? "");
                setProfileEmail(data.email ?? "");
                setOriginalEmail(data.email ?? "");
                setEmailConfirm("");
                setProfileAddress(data.address ?? "");
                setProfileCity(data.city ?? "");
                setProfileDistrict(data.district ?? "");
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!clinic.clinicId) return;
        const emailChanged = profileEmail.trim() !== originalEmail;
        if (emailChanged && profileEmail.trim() !== emailConfirm.trim()) {
            setSaveMessage({ type: "error", text: "E-posta doğrulaması eşleşmiyor. Lütfen yeni e-postayı tekrar girin." });
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({
                    name: profileName.trim(),
                    phone: profilePhone.trim() || null,
                    email: profileEmail.trim() || null,
                    address: profileAddress.trim() || null,
                    city: profileCity.trim() || null,
                    district: profileDistrict.trim() || null
                })
                .eq("id", clinic.clinicId);
            if (error) throw error;
            setOriginalEmail(profileEmail.trim());
            setEmailConfirm("");
            setSaveMessage({ type: "success", text: "Klinik profili güncellendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: "error", text: "Profil kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Klinik Profil Bilgileri</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kliniğinizin temel bilgilerini yönetin.</p>
                </div>
                <div className="hidden lg:block">
                    <button
                        onClick={handleSaveProfile}
                        disabled={isLoading || profileLoading}
                        className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        Ayarları Kaydet
                    </button>
                </div>
            </div>

            {/* Mobile Fixed Save Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                <button
                    onClick={handleSaveProfile}
                    disabled={isLoading || profileLoading}
                    className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    DEĞİŞİKLİKLERİ KAYDET
                </button>
            </div>

            {saveMessage && (
                <div className={`mx-8 mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                    {saveMessage.text}
                </div>
            )}

            {profileLoading ? (
                <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
            ) : (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Klinik Adı <span className="text-rose-500">*</span></label>
                        <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="İzmir Diş Kliniği"
                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
                        <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+90 232 000 00 00"
                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-posta</label>
                        <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="info@klinik.com"
                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                    </div>

                    {profileEmail.trim() !== originalEmail && (
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">E-posta Doğrulama <span className="text-rose-500">*</span></label>
                            <input type="email" value={emailConfirm} onChange={e => setEmailConfirm(e.target.value)} placeholder="Yeni e-postayı tekrar girin"
                                className={`w-full h-[52px] bg-slate-50 border rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 transition-all ${emailConfirm && emailConfirm !== profileEmail ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white'}`} />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Şehir</label>
                        <select value={profileCity} onChange={e => { setProfileCity(e.target.value); setProfileDistrict(""); }}
                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                            <option value="">Şehir seçin...</option>
                            {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">İlçe</label>
                        {getDistricts(profileCity).length > 0 ? (
                            <select value={profileDistrict} onChange={e => setProfileDistrict(e.target.value)}
                                className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                <option value="">İlçe seçin...</option>
                                {getDistricts(profileCity).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={profileDistrict} onChange={e => setProfileDistrict(e.target.value)} placeholder={profileCity ? "İlçe girin..." : "Önce şehir seçin"}
                                disabled={!profileCity}
                                className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all disabled:opacity-50" />
                        )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adres</label>
                        <textarea value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="Klinik adresi..." rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all resize-none" />
                    </div>
                </div>
            )}
        </div>
    );
}
