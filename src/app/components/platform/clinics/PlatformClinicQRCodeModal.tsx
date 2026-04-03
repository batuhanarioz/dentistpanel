"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getCheckinUrl, getBookingUrl } from "@/lib/config";

interface ClinicQRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicName: string;
    clinicSlug: string;
}

type QRMode = "check-in" | "booking";

export function PlatformClinicQRCodeModal({ isOpen, onClose, clinicName, clinicSlug }: ClinicQRCodeModalProps) {
    const [mode, setMode] = useState<QRMode>("check-in");
    const [qrUrl, setQrUrl] = useState("");

    useEffect(() => {
        if (mode === "check-in") {
            setQrUrl(getCheckinUrl(clinicSlug, true)); // forceProduction=true
        } else {
            setQrUrl(getBookingUrl(clinicSlug, true)); // forceProduction=true
        }
    }, [clinicSlug, mode]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(qrUrl);
        toast.success("Link kopyalandı");
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById("clinic-qr-svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            toast.error("PNG dönüşümü için tarayıcı desteği bulunamadı.");
            return;
        }

        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `${clinicSlug}-${mode}-qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.onerror = () => {
            toast.error("QR kodu indirilirken hata oluştu.");
        };

        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        img.src = URL.createObjectURL(svgBlob);
    };

    const handleVerifyQrStructure = async () => {
        try {
            const res = await fetch(qrUrl, { method: "HEAD", mode: "no-cors" });
            toast.success("Bağlantı hedefine ulaşılabilir durumda.");
        } catch {
            toast.error("Bağlantı hedefine ulaşılamadı. İnternet bağlantınızı kontrol ediniz.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4" onClick={onClose}>
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#1e293b] p-8 text-center relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                        {mode === "check-in" ? "📱" : "📅"}
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{clinicName}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Platform QR Yönetimi</p>
                </div>

                {/* Mode Selector (Tabs) */}
                <div className="flex p-2 bg-slate-100/50 border-b border-slate-100">
                    <button 
                        onClick={() => setMode("check-in")}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${mode === "check-in" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Giriş (Check-in)
                    </button>
                    <button 
                        onClick={() => setMode("booking")}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${mode === "booking" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Randevu Portalı
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center">
                    {/* QR Code Container */}
                    <div className="p-7 bg-white rounded-[2.5rem] border-2 border-slate-100 mb-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                        <QRCodeSVG
                            id="clinic-qr-svg"
                            value={qrUrl}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    {/* URL Input Area */}
                    <div className="w-full space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 flex items-center justify-between gap-3 group">
                            <span className="text-[11px] font-black text-slate-500 truncate flex-1 tracking-tight">{qrUrl}</span>
                            <button onClick={handleCopyLink} className="shrink-0 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-indigo-600 uppercase hover:bg-indigo-50 transition-colors shadow-sm">Kopyala</button>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleDownloadQR}
                                className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-slate-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                                </svg>
                                PNG OLARAK İNDİR
                            </button>
                            <button
                                onClick={() => window.open(qrUrl, "_blank")}
                                className="py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2.5"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                TEST ET
                            </button>
                        </div>
                    </div>

                    {/* Verification & Status */}
                    <button
                        onClick={handleVerifyQrStructure}
                        className="mt-10 text-[9px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-[.25em] flex items-center gap-2.5 transition-all group"
                    >
                        <div className="w-5 h-5 rounded-lg border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                            </svg>
                        </div>
                        BAĞLANTIYI DOĞRULA
                    </button>
                </div>
            </div>
        </div>
    );
}
