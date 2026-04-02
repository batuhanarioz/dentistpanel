"use client";

import { useUSSClinicDetail } from "@/hooks/useUSSMonitoring";
import {
    X,
    Building2,
    ShieldCheck,
    Globe,
    Settings2,
    AlertCircle,
    Database,
    History,
    Activity
} from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
    clinicId: string | null;
    onClose: () => void;
}

export function ClinicDetailPanel({ clinicId, onClose }: Props) {
    const { data: clinic, isLoading } = useUSSClinicDetail(clinicId);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (clinicId) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "auto";
        };
    }, [clinicId, onClose]);

    if (!clinicId) return null;

    return (
        <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${clinicId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl transition-opacity" onClick={onClose} />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${clinicId ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{isLoading ? "Loading..." : clinic?.clinicName}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono font-bold text-slate-400">{clinicId}</span>
                                <span className={`h-1.5 w-1.5 rounded-full ${clinic?.connectorStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="h-10 w-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
                            <p className="text-sm font-bold text-slate-400">Fetching clinic telemetry...</p>
                        </div>
                    ) : (
                        <>
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environment</span>
                                        <p className="text-sm font-bold text-slate-800 mt-1 uppercase">{clinic?.environment || "PRODUCTION"}</p>
                                    </div>
                                    <Globe className="absolute -right-2 -bottom-2 h-12 w-12 text-slate-200/50 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auth Status</span>
                                        <p className="text-sm font-bold text-emerald-600 mt-1 uppercase">{clinic?.credentialStatus || "VALID"}</p>
                                    </div>
                                    <ShieldCheck className="absolute -right-2 -bottom-2 h-12 w-12 text-emerald-100/50 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>

                            {/* Technical Details */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Connector Configuration
                                </h3>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-xs font-medium text-slate-500">Connector Mode</span>
                                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded uppercase">{clinic?.connectorMode || "DIRECT"}</span>
                                    </div>
                                    <div className="h-px bg-slate-50" />
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-xs font-medium text-slate-500">Last Transmission</span>
                                        <span className="text-xs font-bold text-slate-800">{clinic?.lastTransmission ? new Date(clinic.lastTransmission).toLocaleString('tr-TR') : "Never"}</span>
                                    </div>
                                    <div className="h-px bg-slate-50" />
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-xs font-medium text-slate-500">Pending Local Jobs</span>
                                        <span className={`text-xs font-bold ${clinic?.pendingJobs ?? 0 > 50 ? 'text-rose-600' : 'text-slate-800'}`}>{clinic?.pendingJobs ?? 0}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Mapping Errors Section */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Database className="h-3.5 w-3.5" />
                                    Recent Mapping Errors
                                </h3>
                                {clinic?.recentMappingErrors && clinic.recentMappingErrors.length > 0 ? (
                                    <div className="space-y-3">
                                        {clinic.recentMappingErrors.map((err, idx) => (
                                            <div key={idx} className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 flex items-start gap-3">
                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-amber-900">{err.field}</p>
                                                    <p className="text-[10px] text-amber-700 mt-0.5">{err.error}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                        <p className="text-xs font-medium text-slate-400">No mapping errors found</p>
                                    </div>
                                )}
                            </section>

                            {/* Recent Failures Timeline */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="h-3.5 w-3.5" />
                                    Recent Failures
                                </h3>
                                {clinic?.recentFailures && clinic.recentFailures.length > 0 ? (
                                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                                        {clinic.recentFailures.map((fail, idx) => (
                                            <div key={idx} className="relative pl-8">
                                                <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow-sm" />
                                                <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{fail.error_type}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">{new Date(fail.time).toLocaleString('tr-TR')}</span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-800">{fail.event_type}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{fail.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                        <p className="text-xs font-medium text-slate-400">No recent failures</p>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                    <button
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                        onClick={() => { }}
                    >
                        Force Sync
                    </button>
                    <button
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all active:scale-95"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
