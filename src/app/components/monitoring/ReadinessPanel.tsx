"use client";

import { ReadinessConfig, ReadinessGaps, ReadinessChecklist } from "@/hooks/useUSSMonitoring";
import {
    ShieldCheck,
    ShieldAlert,
    Settings2,
    Lock,
    Send,
    CheckCircle2,
    Circle,
    AlertTriangle
} from "lucide-react";

interface Props {
    config: ReadinessConfig | undefined;
    gaps: ReadinessGaps | undefined;
    checklist: ReadinessChecklist | undefined;
}

export function ReadinessPanel({ config, gaps, checklist }: Props) {
    const configItems = [
        { label: "Connector Mode", value: config?.connectorMode, icon: Settings2 },
        { label: "Transport Mode", value: config?.transportMode, icon: Send },
        { label: "Auth Mode", value: config?.authMode, icon: Lock },
        { label: "Signing Mode", value: config?.signingMode, icon: ShieldCheck },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Certification Readiness
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${gaps?.gaps?.length === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {gaps?.gaps?.length === 0 ? "Ready" : `${gaps?.gaps?.length} Gaps`}
                </span>
            </div>

            <div className="p-6 space-y-6">
                {/* System Config */}
                <section className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Configuration</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {configItems.map((item) => (
                            <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                    <item.icon className="h-3 w-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 truncate uppercase">{item.value ?? "N/A"}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Readiness Checklist */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Readiness Checklist</h4>
                        <span className="text-[10px] font-medium text-emerald-600">
                            {checklist?.items.filter(i => i.status === 'completed').length ?? 0} / {checklist?.items.length ?? 0}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {checklist?.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    {item.status === 'completed' ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : item.status === 'failed' ? (
                                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                                    ) : (
                                        <Circle className="h-4 w-4 text-slate-200" />
                                    )}
                                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                    item.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Gaps List */}
                {gaps && gaps.gaps.length > 0 && (
                    <section className="p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                        <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" />
                            Required Actions
                        </h4>
                        <ul className="space-y-2">
                            {gaps.gaps.map((gap, i) => (
                                <li key={i} className="text-xs text-rose-800 font-medium flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                                    {gap}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/30">
                <button className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-sm active:scale-95">
                    Trigger System Audit
                </button>
            </div>
        </div>
    );
}
