"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getCheckinUrl } from "@/lib/config";

interface ClinicQRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicName: string;
    clinicSlug: string;
}

export function PlatformClinicQRCodeModal({ isOpen, onClose, clinicName, clinicSlug }: ClinicQRCodeModalProps) {
    const [qrUrl, setQrUrl] = useState("");

    useEffect(() => {
        setQrUrl(getCheckinUrl(clinicSlug));
    }, [clinicSlug]);

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
            downloadLink.download = `${clinicSlug}-qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.onerror = () => {
            toast.error("QR kodu indirilirken hata oluştu.");
        };

        // Türkçe ve Unicode karakterleri güvenli şekilde encode et (btoa yerine)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        img.src = URL.createObjectURL(svgBlob);
    };

    const handleVerifyQrStructure = async () => {
        try {
            const res = await fetch(qrUrl, { method: "HEAD" });
            if (res.ok || res.status === 405) {
                toast.success("QR bağlantısı doğrulandı — sayfa erişilebilir durumda.");
            } else {
                toast.error(`QR hedefi yanıt verdi ama status: ${res.status}`);
            }
        } catch {
            toast.error("QR hedefine ulaşılamadı. İnternet bağlantınızı kontrol ediniz.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4" onClick={onClose}>
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-8 text-center relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📱</div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{clinicName}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hızlı Giriş QR Kodu</p>
                </div>

                <div className="p-10 flex flex-col items-center">
                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 mb-8 shadow-inner">
                        <QRCodeSVG
                            id="clinic-qr-svg"
                            value={qrUrl}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    <div className="w-full space-y-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 overflow-hidden">
                            <span className="text-[10px] sm:text-[11px] font-black text-slate-700 truncate flex-1 tracking-tight">{qrUrl}</span>
                            <button onClick={handleCopyLink} className="shrink-0 text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 tracking-widest">Kopyala</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleDownloadQR}
                                className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5" />
                                </svg>
                                İndir (PNG)
                            </button>
                            <button
                                onClick={() => window.open(qrUrl, "_blank")}
                                className="py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Test Et
                            </button>
                        </div>
                    </div>

                    {/* Gerçek bağlantı doğrulaması */}
                    <button
                        onClick={handleVerifyQrStructure}
                        className="mt-8 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        Bağlantıyı Doğrula
                    </button>
                </div>
            </div>
        </div>
    );
}
