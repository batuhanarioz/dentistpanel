"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeGeneratorProps {
    value: string;
    size?: number;
    title?: string;
    description?: string;
}

export function QRCodeGenerator({ value, size = 200, title, description }: QRCodeGeneratorProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    const downloadQRCode = () => {
        const svg = qrRef.current?.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = size;
            canvas.height = size;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            
            const downloadLink = document.createElement("a");
            downloadLink.download = `clinic-qr-${new Date().getTime()}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
            {description && <p className="text-xs text-slate-500 text-center max-w-[240px] leading-relaxed">{description}</p>}
            
            <div ref={qrRef} className="p-4 bg-white border-4 border-slate-50 rounded-2xl shadow-inner">
                <QRCodeSVG
                    value={value}
                    size={size}
                    level="H"
                    includeMargin={false}
                />
            </div>

            <div className="flex flex-col w-full gap-3">
                <div className="flex flex-col gap-1.5 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yönlendirme Linki</span>
                    <span className="text-[11px] font-bold text-slate-600 break-all select-all cursor-copy hover:text-indigo-600 transition-colors">
                        {value}
                    </span>
                </div>

                <button
                    onClick={downloadQRCode}
                    className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    QR KODU İNDİR (.PNG)
                </button>
            </div>
        </div>
    );
}
