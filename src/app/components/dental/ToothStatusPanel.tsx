"use client";

import React from "react";
import type { ToothStatus, ToothData } from "@/types/database";

export const TOOTH_STATUS_CONFIG: Record<
    ToothStatus,
    { label: string; color: string; bg: string; ring: string }
> = {
    healthy:           { label: "Sağlıklı",       color: "#22c55e", bg: "bg-green-50",   ring: "ring-green-400" },
    cavity:            { label: "Çürük",           color: "#ef4444", bg: "bg-red-50",     ring: "ring-red-400" },
    filling:           { label: "Dolgu",           color: "#3b82f6", bg: "bg-blue-50",    ring: "ring-blue-400" },
    crown:             { label: "Kron",            color: "#f59e0b", bg: "bg-amber-50",   ring: "ring-amber-400" },
    missing:           { label: "Eksik",           color: "#94a3b8", bg: "bg-slate-100",  ring: "ring-slate-400" },
    implant:           { label: "İmplant",         color: "#8b5cf6", bg: "bg-violet-50",  ring: "ring-violet-400" },
    root_canal:        { label: "Kanal",           color: "#f97316", bg: "bg-orange-50",  ring: "ring-orange-400" },
    bridge:            { label: "Köprü",           color: "#06b6d4", bg: "bg-cyan-50",    ring: "ring-cyan-400" },
    extraction_needed: { label: "Çekim",           color: "#dc2626", bg: "bg-rose-50",    ring: "ring-rose-500" },
};

interface ToothStatusPanelProps {
    toothNo: string;
    current: ToothData | null;
    onSave: (data: ToothData) => void;
    onClose: () => void;
}

export function ToothStatusPanel({ toothNo, current, onSave, onClose }: ToothStatusPanelProps) {
    const [status, setStatus] = React.useState<ToothStatus>(current?.status ?? "healthy");
    const [note, setNote] = React.useState(current?.note ?? "");

    const handleSave = () => {
        onSave({ status, note: note.trim() || undefined, updatedAt: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                    Diş #{toothNo}
                </span>
                <button
                    onClick={onClose}
                    className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map((s) => {
                    const cfg = TOOTH_STATUS_CONFIG[s];
                    return (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-1 py-2 rounded-xl text-[9px] font-black text-center transition-all ${cfg.bg} ${status === s ? `ring-2 ${cfg.ring} scale-105` : "opacity-70 hover:opacity-100"}`}
                            style={{ color: cfg.color }}
                        >
                            {cfg.label}
                        </button>
                    );
                })}
            </div>

            <textarea
                className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 outline-none focus:border-[#007f6e] resize-none"
                rows={2}
                placeholder="Diş notu (opsiyonel)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
            />

            <button
                onClick={handleSave}
                className="mt-2 w-full h-9 bg-[#007f6e] hover:bg-[#006d5e] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
            >
                Kaydet
            </button>
        </div>
    );
}
