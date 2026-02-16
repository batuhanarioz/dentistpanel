import React from "react";
import { ControlItem } from "@/hooks/useDashboard";
import { CONTROL_TONE_STYLES } from "@/constants/dashboard";

interface ControlListSectionProps {
    isToday: boolean;
    controlItems: ControlItem[];
    onOffsetChange: () => void;
    onItemClick: (item: ControlItem) => void;
}

export function ControlListSection({
    isToday,
    controlItems,
    onOffsetChange,
    onItemClick
}: ControlListSectionProps) {
    return (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                        <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Kontrol Listesi</h2>
                        <p className="text-[11px] text-slate-400">
                            {isToday ? "Bugün için aksiyon bekleyen kayıtlar" : "Yarın için aksiyon planı"}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOffsetChange}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                >
                    {isToday ? "Yarın →" : "← Bugün"}
                </button>
            </div>

            <div className="px-5 pb-5 space-y-2.5 h-[320px] overflow-y-auto">
                {controlItems.length === 0 && (
                    <div className="py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-2">
                            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-500">Kontrol Listen Şimdilik Temiz!</p>
                    </div>
                )}
                {controlItems.map((item) => {
                    const style = CONTROL_TONE_STYLES[item.tone] || CONTROL_TONE_STYLES.low;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className={`w-full text-left rounded-xl border-l-4 p-4 transition-all shadow-sm ${style.container}`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>
                                    {item.toneLabel}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">{item.timeLabel}</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                                {item.patientName} · <span className="text-slate-500 font-medium">{item.treatmentLabel}</span>
                            </h4>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                {item.actionLabel}
                            </p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
