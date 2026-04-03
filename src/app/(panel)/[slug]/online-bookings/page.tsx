"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

type RequestStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

interface BookingRequest {
    id: string;
    full_name: string;
    phone: string;
    complaint: string;
    requested_at: string;
    duration_minutes: number;
    doctor_id: string | null;
    treatment_name: string | null;
    patient_id: string | null;
    appointment_id: string | null;
    status: RequestStatus;
    expires_at: string;
    created_at: string;
    updated_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    review_note: string | null;
    // joined
    doctor?: { full_name: string } | null;
    appointment?: { starts_at: string; status: string } | null;
    is_new?: boolean;
}

const STATUS_META: Record<RequestStatus, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "Bekliyor", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    approved: { label: "Onaylandı", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    rejected: { label: "Reddedildi", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
    expired: { label: "Süresi Doldu", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
    cancelled: { label: "İptal", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
};

function formatCountdown(expiresAt: string, requestedAt: string): { label: string; urgent: boolean; expired: boolean } {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const slot = new Date(requestedAt);

    if (slot < now) return { label: "Slot geçti", urgent: true, expired: true };
    if (expiry < now) return { label: "Süresi doldu", urgent: true, expired: true };

    const diffMs = expiry.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    const urgent = diffH < 2;

    return { label: `${diffH}s ${diffM}d kaldı`, urgent, expired: false };
}

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) return "90" + digits.slice(1);
    if (digits.startsWith("90")) return digits;
    if (digits.length === 10) return "90" + digits;
    return digits;
}

const DEFAULT_WA_TEMPLATES = {
    ONLINE_APPROVE: "Merhaba {patient_name}, {clinic_name} bünyesindeki randevu talebiniz onaylanmıştır. {appointment_date} günü saat {appointment_time}'da sizinle görüşmek üzere. Sağlıklı günler dileriz.",
    ONLINE_REJECT: "Merhaba {patient_name}, {appointment_date} tarihli randevu talebiniz kliniğimizdeki yoğunluk nedeniyle onaylanamamıştır. Size daha uygun bir saat planlamak için lütfen bizi arayınız.",
    ONLINE_LOCATION: "Merhaba {patient_name}, {clinic_name} konumumuz şöyledir: https://maps.google.com/?q={clinic_name}. Gidiş hattını bu link üzerinden takip edebilirsiniz. Bekliyoruz."
};

function buildWhatsAppMsg(template: string, req: BookingRequest, clinicName: string): string {
    const d = new Date(req.requested_at);
    const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    return encodeURIComponent(
        template
            .replace(/{patient_name}/g, req.full_name)
            .replace(/{patient_surname}/g, "")
            .replace(/{appointment_time}/g, time)
            .replace(/{appointment_date}/g, date)
            .replace(/{clinic_name}/g, clinicName)
            .replace(/{doctor_name}/g, req.doctor?.full_name || "Hekimimiz")
    );
}

function buildWhatsAppApproved(req: BookingRequest, clinicName: string, customTemplate?: string): string {
    return buildWhatsAppMsg(customTemplate || DEFAULT_WA_TEMPLATES.ONLINE_APPROVE, req, clinicName);
}

function buildWhatsAppRejected(req: BookingRequest, clinicName: string, customTemplate?: string): string {
    return buildWhatsAppMsg(customTemplate || DEFAULT_WA_TEMPLATES.ONLINE_REJECT, req, clinicName);
}

function buildWhatsAppLocation(req: BookingRequest, clinicName: string, customTemplate?: string): string {
    return buildWhatsAppMsg(customTemplate || DEFAULT_WA_TEMPLATES.ONLINE_LOCATION, req, clinicName);
}

function DetailDrawer({ req, clinicName, onClose, onApprove, onReject }: {
    req: BookingRequest;
    clinicName: string;
    onClose: () => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string, note?: string) => Promise<void>;
}) {
    const clinic = useClinic();
    const [rejectNote, setRejectNote] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [loading, setLoading] = useState(false);

    const templates = (clinic.clinicSettings?.message_templates as Record<string, string>) || {};
    const waApproved = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppApproved(req, clinicName, templates.ONLINE_APPROVE)}`;
    const waRejected = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppRejected(req, clinicName, templates.ONLINE_REJECT)}`;
    const waLocation = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppLocation(req, clinicName, templates.ONLINE_LOCATION)}`;
    const phoneUrl = `tel:${normalizePhone(req.phone)}`;
    const meta = STATUS_META[req.status];
    const countdown = formatCountdown(req.expires_at, req.requested_at);

    const requestedDate = new Date(req.requested_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const requestedTime = new Date(req.requested_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const createdDate = new Date(req.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    const createdTime = new Date(req.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
                className="relative w-full sm:max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">{req.full_name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${meta.bg} ${meta.color} ${meta.border}`}>
                            {req.status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                            {meta.label}
                        </span>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {req.status !== "pending" && (
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İnceleme Bilgileri</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-1">Durum</p>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${STATUS_META[req.status].bg} ${STATUS_META[req.status].color} ${STATUS_META[req.status].border}`}>
                                        {STATUS_META[req.status].label}
                                    </span>
                                </div>
                                {req.reviewed_at && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold mb-1">İşlem Zamanı</p>
                                        <p className="text-xs font-black text-slate-700">{new Date(req.reviewed_at).toLocaleString("tr-TR")}</p>
                                    </div>
                                )}
                            </div>
                            {req.review_note && (
                                <div className="mt-2 pt-3 border-t border-slate-200">
                                    <p className="text-[10px] text-slate-400 font-bold mb-1">İnceleme Notu</p>
                                    <p className="text-xs font-medium text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">"{req.review_note}"</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                            <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Hekim</p>
                            <p className="text-sm font-black text-slate-900">{req.doctor?.full_name || "Belirtilmedi"}</p>
                        </div>
                        <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100/50">
                            <p className="text-[10px] text-teal-400 font-bold uppercase mb-1">Tedavi</p>
                            <p className="text-sm font-black text-slate-900">{req.treatment_name || "Genel Muayene"}</p>
                        </div>
                    </div>

                    {/* İletişim */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefon</p>
                            <p className="text-sm font-black text-slate-900">{req.phone}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">İşlem / Tedavi</p>
                            <p className="text-sm font-black text-slate-900">{req.treatment_name || "Belirtilmedi"}</p>
                        </div>
                    </div>

                    {/* Şikayet */}
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Şikayet / Not</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{req.complaint}</p>
                    </div>

                    {/* Randevu Detayı */}
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Randevu Bilgileri</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">İstenen Tarih</span>
                            <span className="text-xs font-black text-slate-900">{requestedDate}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">İstenen Saat</span>
                            <span className="text-sm font-black text-indigo-600">{requestedTime}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Hekim</span>
                            <span className="text-xs font-black text-slate-900">{req.doctor?.full_name || "Belirtilmedi"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Süre</span>
                            <span className="text-xs font-black text-slate-900">{req.duration_minutes} dk</span>
                        </div>
                    </div>

                    {/* Audit */}
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zaman Takibi</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Talep zamanı</span>
                            <span className="text-xs font-black text-slate-700">{createdDate} {createdTime}</span>
                        </div>
                        {req.reviewed_at && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">İşlem zamanı</span>
                                <span className="text-xs font-black text-slate-700">
                                    {new Date(req.reviewed_at).toLocaleDateString("tr-TR")} {new Date(req.reviewed_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        )}
                        {req.status === "pending" && (
                            <div className={`flex items-center justify-between pt-1 border-t border-slate-200 ${countdown.urgent ? "text-rose-600" : "text-slate-600"}`}>
                                <span className="text-xs font-bold">Onay penceresi</span>
                                <span className={`text-xs font-black ${countdown.urgent ? "animate-pulse" : ""}`}>{countdown.label}</span>
                            </div>
                        )}
                        {req.review_note && (
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ret Notu</p>
                                <p className="text-xs font-bold text-slate-600">{req.review_note}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">İletişim & Aksiyonlar</h4>

                    {/* Hızlı WhatsApp Aksiyonları */}
                    <div className="space-y-2.5">
                        {/* 1. Onay Taslağı (Ana Aksiyon) */}
                        <a
                            href={waApproved}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 bg-[#25D366] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-200/50 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            WhatsApp Onay Mesajı Gönder
                        </a>

                        <div className="grid grid-cols-2 gap-2.5">
                            {/* 2. Red Taslağı */}
                            <a
                                href={waRejected}
                                target="_blank" rel="noopener noreferrer"
                                className="h-11 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase hover:bg-rose-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                Red Mesajı
                            </a>
                            {/* 3. Düz WhatsApp */}
                            <a
                                href={`https://wa.me/${normalizePhone(req.phone)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="h-11 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase hover:bg-slate-200 transition-all"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771z" /></svg>
                                Sade Sohbet
                            </a>
                        </div>
                    </div>

                    {/* Klinik İletişim Aksiyonları */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <a
                            href={phoneUrl}
                            className="h-11 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase hover:bg-blue-100 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            Hastayı Ara
                        </a>
                        <a
                            href={waLocation}
                            target="_blank" rel="noopener noreferrer"
                            className="h-11 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase hover:bg-amber-100 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Konum Gönder
                        </a>
                    </div>

                    {/* Sistem İşlemleri (Onayla/Reddet) */}
                    {req.status === "pending" && !countdown.expired && (
                        <div className="space-y-3 pt-3 border-t border-slate-200">
                            <div className="flex gap-2.5">
                                <button
                                    onClick={async () => { setLoading(true); await onApprove(req.id); setLoading(false); onClose(); }}
                                    disabled={loading}
                                    className="flex-[2] h-12 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                                >
                                    ✓ Sistemde Onayla
                                </button>
                                <button
                                    onClick={() => setShowRejectInput(v => !v)}
                                    className="flex-1 h-12 bg-white text-rose-600 border border-rose-200 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-rose-50 active:scale-95 transition-all"
                                >
                                    Reddet
                                </button>
                            </div>

                            {showRejectInput && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <textarea
                                        value={rejectNote}
                                        onChange={e => setRejectNote(e.target.value)}
                                        placeholder="Red sebebi (opsiyonel)..."
                                        rows={2}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                                    />
                                    <button
                                        onClick={async () => { setLoading(true); await onReject(req.id, rejectNote); setLoading(false); onClose(); }}
                                        disabled={loading}
                                        className="w-full h-11 bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        Reddi Onayla
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OnlineBookingManagementPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const clinic = useClinic();
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<RequestStatus | "all">("pending");
    const [selectedReq, setSelectedReq] = useState<BookingRequest | null>(null);
    const [filterDoctor, setFilterDoctor] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [linkCopied, setLinkCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://clinic.nextgency360.com/randevu/${slug}`);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const fetchRequests = useCallback(async () => {
        if (!clinic.clinicId) return;

        // Önce süresi dolmuş kayıtları güncelle
        try { await supabase.rpc("expire_online_booking_requests"); } catch { /* ignore */ }

        // Mevcut tüm hastaların telefonlarını çekelim (Yeni/Eski tespiti için)
        const { data: allPatients } = await supabase
            .from("patients")
            .select("phone")
            .eq("clinic_id", clinic.clinicId);

        const patientPhoneSet = new Set(allPatients?.map(p => p.phone) || []);

        const { data, error } = await supabase
            .from("online_booking_requests")
            .select("*, doctor:users!doctor_id(full_name), appointment:appointments(starts_at, status)")
            .eq("clinic_id", clinic.clinicId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            const enriched = (data as any[]).map(req => ({
                ...req,
                is_new: !patientPhoneSet.has(req.phone)
            }));
            setRequests(enriched as BookingRequest[]);
        }
        setLoading(false);
    }, [clinic.clinicId]);

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 60000); // Her dakika yenile
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const handleApprove = async (id: string) => {
        const req = requests.find(r => r.id === id);
        if (!req || !clinic.clinicId) return;

        // 1. Hasta bul veya oluştur
        const { data: existingPatient } = await supabase
            .from("patients").select("id").eq("phone", req.phone).eq("clinic_id", clinic.clinicId).maybeSingle();

        let patientId = existingPatient?.id;
        if (!patientId) {
            const { data: newP } = await supabase
                .from("patients").insert({ clinic_id: clinic.clinicId, full_name: req.full_name, phone: req.phone }).select("id").single();
            patientId = newP?.id;
        }

        // 2. Randevu oluştur
        const endsAt = new Date(new Date(req.requested_at).getTime() + req.duration_minutes * 60000).toISOString();
        const { data: appt } = await supabase
            .from("appointments").insert({
                clinic_id: clinic.clinicId,
                patient_id: patientId,
                doctor_id: req.doctor_id,
                starts_at: req.requested_at,
                ends_at: endsAt,
                status: "confirmed",
                treatment_type: req.treatment_name || "Online Randevu",
                patient_note: req.complaint,
                channel: "QR",
            }).select("id").single();

        // 3. İsteği güncelle
        await supabase.from("online_booking_requests").update({
            status: "approved",
            patient_id: patientId,
            appointment_id: appt?.id,
            reviewed_at: new Date().toISOString(),
        }).eq("id", id);

        fetchRequests();
    };

    const handleReject = async (id: string, note?: string) => {
        await supabase.from("online_booking_requests").update({
            status: "rejected",
            review_note: note || null,
            reviewed_at: new Date().toISOString(),
        }).eq("id", id);
        fetchRequests();
    };

    // KPI'lar
    const kpi = {
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved" && new Date(r.reviewed_at || 0) > new Date(Date.now() - 86400000)).length,
        expired: requests.filter(r => r.status === "expired" || r.status === "cancelled").length,
        week: requests.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length,
    };

    // Filtrele
    const filtered = requests.filter(r => {
        if (activeTab !== "all" && r.status !== activeTab) return false;
        if (filterDoctor && !r.doctor?.full_name?.toLowerCase().includes(filterDoctor.toLowerCase())) return false;
        if (dateFrom && new Date(r.requested_at) < new Date(dateFrom)) return false;
        if (dateTo && new Date(r.requested_at) > new Date(dateTo + "T23:59:59")) return false;
        return true;
    });

    const TABS: { key: RequestStatus | "all"; label: string }[] = [
        { key: "all", label: "Tümü" },
        { key: "pending", label: "Bekleyen" },
        { key: "approved", label: "Onaylanan" },
        { key: "rejected", label: "Reddedilen" },
        { key: "expired", label: "Süresi Dolan" },
        { key: "cancelled", label: "İptal" },
    ];

    const isBookingEnabled = clinic.clinicSettings?.is_online_booking_enabled ?? false;

    // ── KİLİT EKRANI ──────────────────────────────────────────────────────────
    if (!isBookingEnabled) {
        return (
            <div className="relative min-h-[70vh] flex flex-col">
                {/* Blurlu arka plan içerik */}
                <div className="pointer-events-none select-none blur-sm opacity-40 space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {["Bekleyen", "Bugün Onaylanan", "İptal", "Son 7 Gün"].map(l => (
                            <div key={l} className="h-28 bg-gradient-to-br from-slate-200 to-slate-300 rounded-[2rem]" />
                        ))}
                    </div>
                    <div className="h-64 bg-white rounded-[2rem] border border-slate-200" />
                </div>
                {/* Kilit overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/80 p-10 max-w-sm w-full mx-4 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Online Randevu Sistemi Kapalı</h2>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
                            Bu sayfayı kullanabilmek için önce <strong>Ekip ve Yetkiler → Klinik Ayarları → Online Randevu</strong> bölümünden sistemi aktif hale getirmeniz gerekiyor.
                        </p>
                        <div className="space-y-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-left space-y-1.5">
                                {["Tedavi türlerinizi ve sürelerini tanımlayın", "Hekim çalışma saatlerini güncelleyin", "Yapılandırmayı kaydedin", "Sistemi yönetin."].map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] font-black text-indigo-700">
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] shrink-0">{i + 1}</span>
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Paylaşım ve Link Paneli - Premium Kompakt Yapı */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-3 md:py-3.5 md:px-6 rounded-[1.75rem] text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/10 rounded-[0.8rem] flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                        <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101" /></svg>
                    </div>
                    <div>
                        <h2 className="text-[13px] font-black tracking-tight leading-tight">Randevu Portalı Linki</h2>
                        <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 opacity-60">Instagram veya WhatsApp'ta Paylaşın</p>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 w-full md:w-auto md:flex-1 md:justify-end">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-mono text-indigo-200/90 whitespace-nowrap overflow-hidden">
                        {`clinic.nextgency360.com/randevu/${slug}`}
                    </div>
                    <button
                        onClick={handleCopyLink}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all shadow-lg active:scale-90 shrink-0 ${linkCopied ? "bg-emerald-500 text-white" : "bg-white text-indigo-950"
                            }`}
                        title="Linki Kopyala"
                    >
                        {linkCopied ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        )}
                    </button>
                    <a
                        href={`/randevu/${slug}`}
                        target="_blank"
                        className="h-8 px-3 bg-indigo-500/20 text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-indigo-500/30 active:scale-95 transition-all shrink-0"
                    >
                        GÖZ AT
                    </a>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Bekleyen",
                        value: kpi.pending,
                        isBrand: true,
                        icon: (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        ),
                        color: "from-brand-from to-brand-to",
                        shadow: "shadow-black/10",
                        sub: "taze talep"
                    },
                    {
                        label: "Bugün Onaylanan",
                        value: kpi.approved,
                        icon: (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        ),
                        color: "from-emerald-400 via-emerald-500 to-teal-600",
                        shadow: "shadow-emerald-200/60",
                        sub: "onaylandı"
                    },
                    {
                        label: "İptal / Süresi Dolan",
                        value: kpi.expired,
                        icon: (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        ),
                        color: "from-rose-400 via-rose-500 to-pink-600",
                        shadow: "shadow-rose-200/60",
                        sub: "işlem yapılamadı"
                    },
                    {
                        label: "Son 7 Gün Toplam",
                        value: kpi.week,
                        icon: (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                            </svg>
                        ),
                        color: "from-indigo-500 to-violet-600",
                        shadow: "shadow-indigo-200/60",
                        sub: "toplam trafik"
                    },
                ].map(({ label, value, icon, color, shadow, isBrand, sub }) => (
                    <div
                        key={label}
                        className={`relative rounded-[2rem] overflow-hidden px-5 py-4 shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default flex flex-col ${shadow} ${!isBrand ? `bg-gradient-to-br ${color}` : ""}`}
                        style={isBrand ? { background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` } : {}}
                    >
                        {/* Circle Element */}
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />

                        {/* Icon */}
                        <div className="absolute right-3 bottom-3 opacity-[0.14]">
                            {icon}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/70 mb-1">{label}</p>
                        <p className="text-4xl font-black text-white leading-none">{value}</p>
                        <p className="text-[10px] text-white/70 font-semibold mt-auto pt-2">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 p-5 shadow-sm overflow-visible">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Başlangıç Tarihi</label>
                        <PremiumDatePicker
                            value={dateFrom}
                            onChange={setDateFrom}
                            placeholder="Seçiniz..."
                            compact
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bitiş Tarihi</label>
                        <PremiumDatePicker
                            value={dateTo}
                            onChange={setDateTo}
                            placeholder="Seçiniz..."
                            compact
                            align="right"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hekim Ara</label>
                        <div className="relative group">
                            <input type="text" placeholder="Hekim adı..." value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                                className="w-full h-10 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none hover:border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ana Tablo */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
                {/* Tab Bar */}
                <div className="flex items-center gap-1 p-3 border-b border-slate-100 overflow-x-auto scrollbar-none">
                    {TABS.map(t => {
                        const cnt = t.key === "all" ? requests.length : requests.filter(r => r.status === t.key).length;
                        return (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeTab === t.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                {t.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === t.key ? "bg-white/20" : "bg-slate-100"}`}>{cnt}</span>
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-sm font-bold text-slate-400">Bu sekmede kayıt yok.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {["Talep Zamanı", "Hasta", "Randevu", "Telefon", "Şikayet", "Hekim", "Durum", "Kalan / Geçen", "Aksiyonlar"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(req => {
                                        const meta = STATUS_META[req.status];
                                        const countdown = req.status === "pending" ? formatCountdown(req.expires_at, req.requested_at) : null;
                                        const waApproved = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppApproved(req, clinic.clinicName || "")}`;
                                        const waRejected = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppRejected(req, clinic.clinicName || "")}`;
                                        const phoneUrl = `tel:${normalizePhone(req.phone)}`;
                                        return (
                                            <tr key={req.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${countdown?.urgent ? "bg-rose-50/30" : ""}`}>
                                                {/* 1. Talep Zamanı */}
                                                <td className="px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                    {new Date(req.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}{" "}
                                                    {new Date(req.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                </td>
                                                {/* 2. Hasta */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 h-4 mb-0.5">
                                                        <p className="text-xs font-black text-slate-900">{req.full_name}</p>
                                                        {req.is_new && (
                                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[8px] font-black uppercase tracking-tighter shrink-0">Yeni</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* 3. Randevu */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <p className="text-[10px] font-black text-slate-400 opacity-60 mb-1">{new Date(req.requested_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className={`text-[13px] font-black ${(req.appointment?.starts_at && req.appointment.starts_at !== req.requested_at) ? "text-indigo-600" : "text-slate-900"}`}>
                                                            {new Date(req.appointment?.starts_at || req.requested_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        {req.appointment?.starts_at && req.appointment.starts_at !== req.requested_at && (
                                                            <span className="text-[9px] font-medium text-slate-400 line-through opacity-60">
                                                                {new Date(req.requested_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* 4. Telefon */}
                                                <td className="px-4 py-3 text-xs font-bold text-slate-600 whitespace-nowrap">
                                                    {req.phone}
                                                </td>
                                                {/* 5. Şikayet */}
                                                <td className="px-4 py-3 max-w-[160px]">
                                                    <p className="text-xs font-bold text-slate-600 truncate">{req.complaint}</p>
                                                </td>
                                                {/* 6. Hekim */}
                                                <td className="px-4 py-3 text-xs font-bold text-slate-600">
                                                    {req.doctor?.full_name || "—"}
                                                </td>
                                                {/* 7. Durum */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                        {req.status === "pending" && <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />}
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                {/* 8. Kalan / Geçen */}
                                                <td className="px-4 py-3">
                                                    {countdown && (
                                                        <span className={`text-[10px] font-black ${countdown.urgent ? "text-rose-600 animate-pulse" : "text-slate-500"}`}>
                                                            {countdown.label}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* 9. Aksiyonlar */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => setSelectedReq(req)}
                                                            className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black hover:bg-slate-200 transition-all border border-slate-200/50"
                                                        >DETAY</button>
                                                        {req.status === "pending" && !countdown?.expired && (
                                                            <>
                                                                <button onClick={() => handleApprove(req.id)}
                                                                    className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black hover:bg-emerald-700 transition-all shadow-sm"
                                                                >ONAYLA</button>
                                                                <button onClick={() => handleReject(req.id)}
                                                                    className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-[9px] font-black hover:bg-rose-100 transition-all"
                                                                >REDDET</button>
                                                            </>
                                                        )}
                                                        {req.status === "approved" && (
                                                            <a href={waApproved} target="_blank" rel="noopener noreferrer"
                                                                className="w-8 h-8 bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/20 rounded-lg flex items-center justify-center hover:bg-[#25D366]/20 transition-all shadow-sm"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {filtered.map(req => {
                                const meta = STATUS_META[req.status];
                                const countdown = req.status === "pending" ? formatCountdown(req.expires_at, req.requested_at) : null;
                                const waApproved = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppApproved(req, clinic.clinicName || "")}`;
                                const waRejected = `https://wa.me/${normalizePhone(req.phone)}?text=${buildWhatsAppRejected(req, clinic.clinicName || "")}`;
                                const phoneUrl = `tel:${normalizePhone(req.phone)}`;
                                return (
                                    <div key={req.id} className={`p-5 ${countdown?.urgent ? "bg-rose-50/30" : ""}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-black text-slate-900">{req.full_name}</p>
                                                    {req.is_new && (
                                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[8px] font-black uppercase tracking-tighter">Yeni</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-500">{req.phone}</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                {req.status === "pending" && <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />}
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Randevu</p>
                                                <div className="flex items-baseline gap-2 mt-0.5">
                                                    <p className="text-base font-black text-indigo-600 leading-none">
                                                        {new Date(req.appointment?.starts_at || req.requested_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                    {req.appointment?.starts_at && req.appointment.starts_at !== req.requested_at && (
                                                        <span className="text-[10px] font-bold text-slate-400 line-through opacity-60">
                                                            {new Date(req.requested_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">
                                                    {new Date(req.requested_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                                                </p>
                                            </div>
                                            {countdown && (
                                                <span className={`text-[10px] font-black ${countdown.urgent ? "text-rose-600 animate-pulse" : "text-slate-400"}`}>
                                                    {countdown.label}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-bold mb-3 line-clamp-1">{req.complaint}</p>
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <button onClick={() => setSelectedReq(req)}
                                                className="flex-1 h-10 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black border border-slate-200"
                                            >DETAY</button>
                                            <a href={phoneUrl} className="h-10 w-10 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl flex items-center justify-center">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </a>
                                            {req.status === "pending" && !countdown?.expired && (
                                                <>
                                                    <button onClick={() => handleApprove(req.id)}
                                                        className="flex-1 h-10 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-100"
                                                    >ONAYLA</button>
                                                    <button onClick={() => handleReject(req.id)}
                                                        className="h-10 px-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-[10px] font-black"
                                                    >RED</button>
                                                </>
                                            )}
                                            {req.status === "approved" && (
                                                <a href={waApproved} target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 h-10 bg-[#25D366] text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                    GÖNDER
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Detail Drawer */}
            {selectedReq && (
                <DetailDrawer
                    req={selectedReq}
                    clinicName={clinic.clinicName || ""}
                    onClose={() => setSelectedReq(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
}
