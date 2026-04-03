"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ZoomActions } from "./Odontogram3DCanvas";
import dynamic from "next/dynamic";
import type { ToothStatus, TeethData, ToothData } from "@/types/database";
import { TOOTH_STATUS_CONFIG } from "./ToothStatusPanel";
import { useDentalChart, useDentalChartMutation } from "@/hooks/useDentalChart";

// Three.js canvas — sadece client'ta, SSR yok
const Odontogram3DCanvas = dynamic(() => import("./Odontogram3DCanvas"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4" />
                <p className="text-slate-400 text-sm font-bold">3D sahne yükleniyor...</p>
            </div>
        </div>
    ),
});

// ─── FDI → Türkçe isim map'i ─────────────────────────────────────────────────

const FDI_NAMES: Record<string, string> = {
    // Üst sağ
    "11": "Sağ Üst Santral Kesici", "12": "Sağ Üst Lateral Kesici",
    "13": "Sağ Üst Kanin",         "14": "Sağ Üst 1. Küçük Azı",
    "15": "Sağ Üst 2. Küçük Azı",  "16": "Sağ Üst 1. Büyük Azı",
    "17": "Sağ Üst 2. Büyük Azı",  "18": "Sağ Üst Yirmilik",
    // Üst sol
    "21": "Sol Üst Santral Kesici", "22": "Sol Üst Lateral Kesici",
    "23": "Sol Üst Kanin",          "24": "Sol Üst 1. Küçük Azı",
    "25": "Sol Üst 2. Küçük Azı",   "26": "Sol Üst 1. Büyük Azı",
    "27": "Sol Üst 2. Büyük Azı",   "28": "Sol Üst Yirmilik",
    // Alt sol
    "31": "Sol Alt Santral Kesici", "32": "Sol Alt Lateral Kesici",
    "33": "Sol Alt Kanin",          "34": "Sol Alt 1. Küçük Azı",
    "35": "Sol Alt 2. Küçük Azı",   "36": "Sol Alt 1. Büyük Azı",
    "37": "Sol Alt 2. Büyük Azı",   "38": "Sol Alt Yirmilik",
    // Alt sağ
    "41": "Sağ Alt Santral Kesici", "42": "Sağ Alt Lateral Kesici",
    "43": "Sağ Alt Kanin",          "44": "Sağ Alt 1. Küçük Azı",
    "45": "Sağ Alt 2. Küçük Azı",   "46": "Sağ Alt 1. Büyük Azı",
    "47": "Sağ Alt 2. Büyük Azı",   "48": "Sağ Alt Yirmilik",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

export default function Odontogram3DModal({ open, onClose, patientId, patientName }: Props) {
    const { data: dentalChart, isLoading } = useDentalChart(patientId);
    const { mutate: saveChart, isPending: saving } = useDentalChartMutation(patientId);

    const [draft, setDraft] = useState<TeethData>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [editStatus, setEditStatus] = useState<ToothStatus>("healthy");
    const [editNote, setEditNote] = useState("");
    const [dirty, setDirty] = useState(false);
    const zoomRef = useRef<ZoomActions | null>(null);

    // Veri yüklenince draft'ı başlat
    useEffect(() => {
        if (dentalChart?.teeth_data) {
            setDraft(dentalChart.teeth_data as TeethData);
        }
    }, [dentalChart]);

    // Diş seçilince sağ paneli güncelle
    const handleToothClick = useCallback((toothNo: string) => {
        setSelected(toothNo);
        const existing = draft[toothNo];
        setEditStatus(existing?.status ?? "healthy");
        setEditNote(existing?.note ?? "");
    }, [draft]);

    // Dişi güncelle (sadece draft'ta — henüz kaydedilmedi)
    const handleUpdateTooth = () => {
        if (!selected) return;
        const updated: TeethData = {
            ...draft,
            [selected]: { status: editStatus, note: editNote.trim() || undefined, updatedAt: new Date().toISOString() } as ToothData,
        };
        // Sağlıklı ise kayıttan kaldır
        if (editStatus === "healthy" && !editNote.trim()) {
            const { [selected]: _, ...rest } = updated;
            setDraft(rest);
        } else {
            setDraft(updated);
        }
        setDirty(true);
    };

    // Tümünü kaydet
    const handleSave = () => {
        saveChart(draft, {
            onSuccess: () => {
                setDirty(false);
            },
        });
    };

    // ESC ile kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    // Etkilenmiş dişler (non-healthy)
    const affectedTeeth = Object.entries(draft)
        .filter(([, d]) => d?.status !== "healthy")
        .sort(([a], [b]) => parseInt(a) - parseInt(b));

    const selectedData = selected ? draft[selected] : null;

    return (
        <div className="fixed inset-0 z-[400] flex flex-col sm:flex-row" style={{ background: "rgba(0,0,0,0.92)" }}>

            {/* ── Canvas alanı: mobilde üst (%58), desktop'ta sol (flex-1) ── */}
            <div className="relative flex flex-col flex-1 h-[58svh] sm:h-auto">

                {/* Üst bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4"
                    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>
                    <div className="min-w-0 mr-3">
                        <p className="text-white/50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">3D Odontogram</p>
                        <p className="text-white font-black text-base sm:text-lg leading-tight truncate">{patientName}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="text-white/30 text-[11px] font-semibold hidden sm:block">
                            Sürükle ile döndür · Kaydır ile zoom
                        </span>
                        {/* Zoom butonları */}
                        <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-1">
                            <button onClick={() => zoomRef.current?.zoomIn()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all text-lg font-black"
                                title="Yaklaştır">+</button>
                            <div className="w-px h-5 bg-white/20" />
                            <button onClick={() => zoomRef.current?.zoomOut()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all text-lg font-black"
                                title="Uzaklaştır">−</button>
                        </div>
                        {/* Kapat — sadece mobilde üstte göster */}
                        <button onClick={onClose}
                            className="sm:hidden w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                            <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400" />
                    </div>
                ) : (
                    <Odontogram3DCanvas
                        teethData={draft}
                        selectedTooth={selected}
                        onToothClick={handleToothClick}
                        onReady={(actions) => { zoomRef.current = actions; }}
                    />
                )}

                {/* Alt durum chip'leri — desktop'ta canvas'ın altında */}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 sm:px-6 py-3 hidden sm:block"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)" }}>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).filter(s => s !== "healthy").map(s => {
                            const cfg = TOOTH_STATUS_CONFIG[s];
                            const count = Object.values(draft).filter(d => d?.status === s).length;
                            if (!count) return null;
                            return (
                                <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
                                    style={{ background: cfg.color + "33", color: cfg.color, border: `1px solid ${cfg.color}55` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                                    {cfg.label}: {count}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Panel: mobilde alt (%42 scroll), desktop'ta sağ (w-80) ── */}
            <div className="flex flex-col flex-shrink-0 w-full sm:w-80 bg-slate-900
                            border-t border-white/10 sm:border-t-0 sm:border-l sm:border-white/5
                            h-[42svh] sm:h-auto">

                {/* Panel header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/5 shrink-0">
                    <div>
                        <p className="text-white font-black text-sm">Diş Detayı</p>
                        <p className="text-white/40 text-[10px] font-semibold">FDI Numaralandırma</p>
                    </div>
                    {/* Desktop'ta kapat butonu */}
                    <button onClick={onClose}
                        className="hidden sm:flex w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 transition-colors items-center justify-center">
                        <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable içerik */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-4">

                    {/* Mobil durum chip'leri */}
                    {Object.values(draft).some(d => d?.status && d.status !== "healthy") && (
                        <div className="flex flex-wrap gap-1.5 sm:hidden">
                            {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).filter(s => s !== "healthy").map(s => {
                                const cfg = TOOTH_STATUS_CONFIG[s];
                                const count = Object.values(draft).filter(d => d?.status === s).length;
                                if (!count) return null;
                                return (
                                    <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                                        style={{ background: cfg.color + "33", color: cfg.color, border: `1px solid ${cfg.color}55` }}>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                                        {cfg.label}: {count}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Seçili diş */}
                    {selected ? (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-4">
                            <div>
                                <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">Seçili Diş</p>
                                <p className="text-white font-black text-base mt-0.5">#{selected}</p>
                                <p className="text-white/50 text-[11px] font-semibold">{FDI_NAMES[selected] ?? "—"}</p>
                                {selectedData && selectedData.status !== "healthy" && (
                                    <span className="inline-flex mt-1.5 items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full"
                                        style={{
                                            background: TOOTH_STATUS_CONFIG[selectedData.status]?.color + "22",
                                            color: TOOTH_STATUS_CONFIG[selectedData.status]?.color,
                                        }}>
                                        {TOOTH_STATUS_CONFIG[selectedData.status]?.label}
                                    </span>
                                )}
                            </div>

                            {/* Durum seçim */}
                            <div>
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Durum</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map(s => {
                                        const cfg = TOOTH_STATUS_CONFIG[s];
                                        const active = editStatus === s;
                                        return (
                                            <button key={s} onClick={() => setEditStatus(s)}
                                                className="py-2 px-1 rounded-xl text-[9px] font-black text-center transition-all"
                                                style={{
                                                    background: active ? cfg.color + "33" : "rgba(255,255,255,0.04)",
                                                    color: active ? cfg.color : "rgba(255,255,255,0.5)",
                                                    border: active ? `1.5px solid ${cfg.color}88` : "1.5px solid rgba(255,255,255,0.06)",
                                                    transform: active ? "scale(1.05)" : "scale(1)",
                                                }}>
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Not */}
                            <div>
                                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Not</p>
                                <textarea rows={2} maxLength={200} placeholder="Diş notu..."
                                    value={editNote} onChange={e => setEditNote(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-teal-500/40 resize-none" />
                            </div>

                            <button onClick={handleUpdateTooth}
                                className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                style={{ background: "linear-gradient(135deg, #007f6e, #0ea5e9)", color: "white" }}>
                                Dişi Güncelle
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white/5 border border-dashed border-white/10 p-5 text-center">
                            <p className="text-2xl mb-1.5">🦷</p>
                            <p className="text-white/40 text-xs font-bold">3D modelden bir dişe tıklayın</p>
                        </div>
                    )}

                    {/* Etkilenmiş dişler listesi */}
                    {affectedTeeth.length > 0 && (
                        <div>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">
                                Etkilenmiş Dişler ({affectedTeeth.length})
                            </p>
                            <div className="space-y-1.5">
                                {affectedTeeth.map(([toothNo, data]) => {
                                    if (!data) return null;
                                    const cfg = TOOTH_STATUS_CONFIG[data.status];
                                    const isSelected = selected === toothNo;
                                    return (
                                        <button key={toothNo} onClick={() => handleToothClick(toothNo)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                                            style={{
                                                background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                                                border: `1px solid ${isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                                            }}>
                                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                                                style={{ background: cfg.color + "22", color: cfg.color }}>
                                                {toothNo}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white/80 text-[11px] font-bold truncate">
                                                    {FDI_NAMES[toothNo] ?? `Diş #${toothNo}`}
                                                </p>
                                                <p className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-white/5 px-4 sm:px-5 py-3 sm:py-4 flex gap-3 shrink-0">
                    <button onClick={onClose}
                        className="flex-1 h-10 rounded-xl text-xs font-black text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/8 transition-all">
                        İptal
                    </button>
                    <button onClick={handleSave} disabled={saving || !dirty}
                        className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all disabled:opacity-40"
                        style={{ background: dirty ? "linear-gradient(135deg, #007f6e, #059669)" : "rgba(255,255,255,0.08)" }}>
                        {saving ? "Kaydediliyor..." : dirty ? "Kaydet ●" : "Kaydedildi"}
                    </button>
                </div>
            </div>
        </div>
    );
}
