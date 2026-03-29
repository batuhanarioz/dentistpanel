"use client";

import React, { useState, useRef, useEffect } from "react";
import type { TeethData, ToothData, ToothStatus } from "@/types/database";
import { ToothStatusPanel, TOOTH_STATUS_CONFIG } from "./ToothStatusPanel";

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Tooth width (px) by FDI last digit: 1=central incisor … 8=wisdom */
const TOOTH_W: Record<number, number> = { 1: 28, 2: 24, 3: 26, 4: 28, 5: 26, 6: 36, 7: 34, 8: 30 };
const GAP      = 3;   // gap between adjacent teeth
const MID_GAP  = 10;  // gap at midline between quadrants
const MARGIN   = 14;  // left/right viewBox margin
const ROOT_H   = 18;  // height of root taper
const CROWN_H  = 32;  // height of crown rect
const CORNER_R = 4;   // crown corner radius
const TIP_FRAC = 0.42; // root tip width as fraction of crown width

const UPPER_ROOT_Y  = 18;
const UPPER_CROWN_Y = UPPER_ROOT_Y + ROOT_H;        // 36
const UPPER_CROWN_B = UPPER_CROWN_Y + CROWN_H;      // 68
const UPPER_NUM_Y   = 12;

const OCSEP_Y      = UPPER_CROWN_B + 6;             // 74  — occlusal separator top
const OCSEP_H      = 30;                             // daha geniş → okunaklı
const OCSEP_TEXT_Y = OCSEP_Y + OCSEP_H / 2 + 3;    // ≈ 90

const LOWER_CROWN_Y = OCSEP_Y + OCSEP_H + 6;        // 110
const LOWER_CROWN_B = LOWER_CROWN_Y + CROWN_H;      // 138
const LOWER_ROOT_B  = LOWER_CROWN_B + ROOT_H;       // 156
const LOWER_NUM_Y   = LOWER_ROOT_B + 12;             // 168

const VIEW_H = LOWER_NUM_Y + 8; // 176

// ─── Tooth positions ──────────────────────────────────────────────────────────

type ToothPos = { toothNo: number; x: number; w: number };

function calcPositions(teeth: number[]): ToothPos[] {
    const result: ToothPos[] = [];
    let x = MARGIN;
    teeth.forEach((toothNo, i) => {
        if (i === 8) x += MID_GAP;
        const w = TOOTH_W[toothNo % 10] ?? 28;
        result.push({ toothNo, x, w });
        x += w + GAP;
    });
    return result;
}

const UPPER_POS = calcPositions([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]);
const LOWER_POS = calcPositions([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]);

const lastTooth = UPPER_POS[15];
const VIEW_W = lastTooth.x + lastTooth.w + MARGIN;
const MIDLINE_X = (UPPER_POS[7].x + UPPER_POS[7].w + UPPER_POS[8].x) / 2;

// ─── SVG tooth paths ──────────────────────────────────────────────────────────

function upperPath(x: number, w: number): string {
    const tipW = w * TIP_FRAC;
    const tipX = x + (w - tipW) / 2;
    const r = Math.min(CORNER_R, w / 5);
    return [
        `M ${tipX} ${UPPER_ROOT_Y}`,
        `L ${tipX + tipW} ${UPPER_ROOT_Y}`,
        `L ${x + w} ${UPPER_CROWN_Y}`,
        `L ${x + w} ${UPPER_CROWN_B - r}`,
        `Q ${x + w} ${UPPER_CROWN_B} ${x + w - r} ${UPPER_CROWN_B}`,
        `L ${x + r} ${UPPER_CROWN_B}`,
        `Q ${x} ${UPPER_CROWN_B} ${x} ${UPPER_CROWN_B - r}`,
        `L ${x} ${UPPER_CROWN_Y}`,
        `Z`,
    ].join(" ");
}

function lowerPath(x: number, w: number): string {
    const tipW = w * TIP_FRAC;
    const tipX = x + (w - tipW) / 2;
    const r = Math.min(CORNER_R, w / 5);
    return [
        `M ${x + r} ${LOWER_CROWN_Y}`,
        `L ${x + w - r} ${LOWER_CROWN_Y}`,
        `Q ${x + w} ${LOWER_CROWN_Y} ${x + w} ${LOWER_CROWN_Y + r}`,
        `L ${x + w} ${LOWER_CROWN_B}`,
        `L ${tipX + tipW} ${LOWER_CROWN_B}`,
        `L ${x + w / 2} ${LOWER_ROOT_B}`,
        `L ${tipX} ${LOWER_CROWN_B}`,
        `L ${x} ${LOWER_CROWN_B}`,
        `L ${x} ${LOWER_CROWN_Y + r}`,
        `Q ${x} ${LOWER_CROWN_Y} ${x + r} ${LOWER_CROWN_Y}`,
        `Z`,
    ].join(" ");
}

// ─── Individual tooth cell ────────────────────────────────────────────────────

interface ToothCellProps {
    pos: ToothPos;
    isUpper: boolean;
    data: ToothData | null;
    isSelected: boolean;
    editMode: boolean;
    onClick: () => void;
}

function ToothCell({ pos, isUpper, data, isSelected, editMode, onClick }: ToothCellProps) {
    const { toothNo, x, w } = pos;
    const status: ToothStatus = data?.status ?? "healthy";
    const cfg = TOOTH_STATUS_CONFIG[status];
    const isMissing = status === "missing";
    const isHealthy = status === "healthy";

    const fill   = isHealthy ? "#f0f9ff" : isMissing ? "#f1f5f9" : cfg.color + "25";
    const stroke = isSelected ? "#007f6e" : isHealthy ? "#dde5ef" : cfg.color;
    const sw     = isSelected ? 2.5 : isHealthy ? 1 : 1.8;
    const pathD  = isUpper ? upperPath(x, w) : lowerPath(x, w);
    const numY   = isUpper ? UPPER_NUM_Y : LOWER_NUM_Y;
    const cx     = x + w / 2;

    const hoverY = isUpper ? UPPER_ROOT_Y - 6 : LOWER_CROWN_Y - 6;
    const hoverH = ROOT_H + CROWN_H + 12;

    return (
        <g onClick={editMode ? onClick : undefined} style={{ cursor: editMode ? "pointer" : "default" }}>
            {editMode && (
                <rect x={x - 2} y={hoverY} width={w + 4} height={hoverH} rx={6}
                    fill="transparent" className="hover:fill-emerald-50"
                />
            )}
            <path d={pathD} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />

            {isMissing && (
                <>
                    <line x1={x + 6} y1={isUpper ? UPPER_CROWN_Y + 7 : LOWER_CROWN_Y + 7}
                          x2={x + w - 6} y2={isUpper ? UPPER_CROWN_B - 7 : LOWER_CROWN_B - 7}
                          stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" />
                    <line x1={x + w - 6} y1={isUpper ? UPPER_CROWN_Y + 7 : LOWER_CROWN_Y + 7}
                          x2={x + 6} y2={isUpper ? UPPER_CROWN_B - 7 : LOWER_CROWN_B - 7}
                          stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" />
                </>
            )}

            <text x={cx} y={numY} textAnchor="middle" fontSize="9" fontWeight="600"
                  fill={isSelected ? "#007f6e" : "#9aa5b4"} fontFamily="system-ui, sans-serif">
                {toothNo}
            </text>
        </g>
    );
}

// ─── Main chart ───────────────────────────────────────────────────────────────

interface ToothChartProps {
    teethData: TeethData;
    editMode?: boolean;
    onChange?: (toothNo: string, data: ToothData | null) => void;
    /** Patient name shown in full-screen presentation header */
    patientName?: string;
    /** Hides legend and action buttons — for tight spaces */
    compact?: boolean;
    /** Controlled prop: forces presentation overlay open from outside */
    presentationOpen?: boolean;
    /** Called when presentation overlay is closed */
    onPresentationClose?: () => void;
    /** 3D Görünüm butonuna tıklandığında çağrılır */
    on3DOpen?: () => void;
}

export function ToothChart({
    teethData,
    editMode = false,
    onChange,
    patientName,
    compact = false,
    presentationOpen,
    onPresentationClose,
    on3DOpen,
}: ToothChartProps) {
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
    const [presentationMode, setPresentationMode] = useState(false);

    // Sync external controlled prop
    useEffect(() => {
        if (presentationOpen) setPresentationMode(true);
    }, [presentationOpen]);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const closePresentation = () => {
        setPresentationMode(false);
        onPresentationClose?.();
    };

    // Close on ESC
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSelectedTooth(null); closePresentation(); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToothClick = (pos: ToothPos, isUpper: boolean) => {
        if (!editMode) return;
        setSelectedTooth(pos.toothNo);
        const svgEl = svgRef.current;
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const scale = rect.width / VIEW_W;
        const cx = rect.left + (pos.x + pos.w / 2) * scale;
        const anchorY = isUpper
            ? rect.top + UPPER_CROWN_B * scale
            : rect.top + LOWER_CROWN_Y * scale;
        const panelW = 256, panelH = 240;
        const left = Math.min(Math.max(cx - panelW / 2, 8), window.innerWidth - panelW - 8);
        const top = isUpper
            ? Math.min(anchorY + 6, window.innerHeight - panelH - 8)
            : Math.max(anchorY - panelH - 6, 8);
        setPanelPos({ top, left });
    };

    const handleSave = (data: ToothData) => {
        if (selectedTooth === null || !onChange) return;
        onChange(String(selectedTooth), data.status === "healthy" ? null : data);
        setSelectedTooth(null);
    };

    const statusCounts = Object.values(teethData).reduce((acc, d) => {
        if (d) acc[d.status] = (acc[d.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const affectedCount = Object.keys(teethData).length;

    // Shared SVG content (reused in presentation overlay)
    const svgBody = (
        <>
            {/* Oklüzal separator — belirgin arka plan + okunaklı etiket */}
            <rect x={0} y={OCSEP_Y} width={VIEW_W} height={OCSEP_H} fill="#eef2f7" />
            <line x1={0} y1={OCSEP_Y} x2={VIEW_W} y2={OCSEP_Y} stroke="#cbd5e1" strokeWidth={1.5} />
            <line x1={0} y1={OCSEP_Y + OCSEP_H} x2={VIEW_W} y2={OCSEP_Y + OCSEP_H} stroke="#cbd5e1" strokeWidth={1.5} />

            {/* Sol yatay çizgi */}
            <line x1={MARGIN + 28} y1={OCSEP_TEXT_Y - 4} x2={VIEW_W / 2 - 52} y2={OCSEP_TEXT_Y - 4}
                  stroke="#94a3b8" strokeWidth={1} />
            {/* "OKLÜZAL DÜZLEM" merkez etiketi */}
            <text x={VIEW_W / 2} y={OCSEP_TEXT_Y} textAnchor="middle" fontSize="8.5" fontWeight="800"
                  fill="#64748b" letterSpacing="2.5" fontFamily="system-ui">OKLÜZAL DÜZLEM</text>
            {/* Sağ yatay çizgi */}
            <line x1={VIEW_W / 2 + 52} y1={OCSEP_TEXT_Y - 4} x2={VIEW_W - MARGIN - 28} y2={OCSEP_TEXT_Y - 4}
                  stroke="#94a3b8" strokeWidth={1} />

            {/* Orta dikey çizgi */}
            <line x1={MIDLINE_X} y1={6} x2={MIDLINE_X} y2={VIEW_H - 6}
                  stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />

            {/* Kadran etiketleri */}
            <text x={MARGIN + 3} y={OCSEP_Y + OCSEP_H / 2 + 3} fontSize="9" fontWeight="800" fill="#94a3b8" fontFamily="system-ui">Q1</text>
            <text x={MIDLINE_X + 5} y={OCSEP_Y + OCSEP_H / 2 + 3} fontSize="9" fontWeight="800" fill="#94a3b8" fontFamily="system-ui">Q2</text>
            <text x={MARGIN + 3} y={LOWER_CROWN_Y + CROWN_H / 2 + 3} fontSize="9" fontWeight="800" fill="#94a3b8" fontFamily="system-ui">Q4</text>
            <text x={MIDLINE_X + 5} y={LOWER_CROWN_Y + CROWN_H / 2 + 3} fontSize="9" fontWeight="800" fill="#94a3b8" fontFamily="system-ui">Q3</text>

            {UPPER_POS.map(pos => (
                <ToothCell key={pos.toothNo} pos={pos} isUpper={true}
                    data={teethData[String(pos.toothNo)] ?? null}
                    isSelected={selectedTooth === pos.toothNo}
                    editMode={editMode}
                    onClick={() => handleToothClick(pos, true)} />
            ))}
            {LOWER_POS.map(pos => (
                <ToothCell key={pos.toothNo} pos={pos} isUpper={false}
                    data={teethData[String(pos.toothNo)] ?? null}
                    isSelected={selectedTooth === pos.toothNo}
                    editMode={editMode}
                    onClick={() => handleToothClick(pos, false)} />
            ))}
        </>
    );

    return (
        <div ref={containerRef} className="relative w-full select-none">
            {/* Jaw labels */}
            <div className="flex justify-between px-0.5 mb-0.5">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">Sağ</span>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">ÜST ÇENE</span>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">Sol</span>
            </div>

            <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" aria-label="Diş Şeması">
                {svgBody}
            </svg>

            <div className="flex justify-between px-0.5 mt-0.5 mb-2">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">Sağ</span>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">ALT ÇENE</span>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">Sol</span>
            </div>

            {/* Legend + presentation button */}
            {!compact && (
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {(Object.entries(TOOTH_STATUS_CONFIG) as [ToothStatus, { label: string; color: string }][]).map(([s, cfg]) => (
                            <div key={s} className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                                <span className="text-[9px] font-bold text-slate-400">
                                    {cfg.label}{statusCounts[s] ? ` (${statusCounts[s]})` : ""}
                                </span>
                            </div>
                        ))}
                    </div>

                    {!editMode && on3DOpen && (
                        <button
                            onClick={on3DOpen}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007f6e] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#006d5e] transition-colors shadow-sm"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                            3D Görünüm
                        </button>
                    )}
                </div>
            )}

            {affectedCount > 0 && !compact && (
                <p className="mt-1 text-[9px] font-bold text-slate-400">{affectedCount} diş işaretli</p>
            )}

            {/* Status picker panel */}
            {selectedTooth !== null && editMode && panelPos && (
                <div className="fixed z-[300]" style={{ top: panelPos.top, left: panelPos.left }}>
                    <ToothStatusPanel
                        toothNo={String(selectedTooth)}
                        current={teethData[String(selectedTooth)] ?? null}
                        onSave={handleSave}
                        onClose={() => setSelectedTooth(null)}
                    />
                </div>
            )}

            {/* ── Presentation overlay ───────────────────────────────────────── */}
            {presentationMode && (
                <div
                    className="fixed inset-0 z-[500] bg-slate-900/96 backdrop-blur flex items-center justify-center p-4 sm:p-8"
                    onClick={closePresentation}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-6 sm:p-10 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diş Şeması</p>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                                    {patientName ?? "Hasta"}
                                </h2>
                                {affectedCount > 0 && (
                                    <p className="text-sm font-bold text-slate-400 mt-1">{affectedCount} diş işaretli</p>
                                )}
                            </div>
                            <button
                                onClick={closePresentation}
                                className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Chart */}
                        <div className="flex justify-between px-1 mb-1">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Sağ</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ÜST ÇENE</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Sol</span>
                        </div>
                        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto">
                            {svgBody}
                        </svg>
                        <div className="flex justify-between px-1 mt-1 mb-6">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Sağ</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ALT ÇENE</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Sol</span>
                        </div>

                        {/* Large legend for patient presentation */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-5 border-t border-slate-100">
                            {(Object.entries(TOOTH_STATUS_CONFIG) as [ToothStatus, { label: string; color: string }][]).map(([s, cfg]) => (
                                <div key={s} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="h-3.5 w-3.5 rounded flex-shrink-0 shadow-sm" style={{ backgroundColor: cfg.color }} />
                                    <span className="text-xs font-bold text-slate-600">{cfg.label}</span>
                                    {statusCounts[s] !== undefined && (
                                        <span className="ml-auto text-sm font-black" style={{ color: cfg.color }}>
                                            {statusCounts[s]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <p className="text-center text-xs text-slate-300 mt-5 font-medium">Kapatmak için tıklayın · ESC</p>
                    </div>
                </div>
            )}
        </div>
    );
}
