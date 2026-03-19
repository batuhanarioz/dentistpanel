"use client";

import { Anomaly } from "@/hooks/useUSSMonitoring";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    AlertTriangle,
    AlertOctagon,
    Info,
    Zap,
    TrendingUp,
    Database,
    Timer
} from "lucide-react";

interface Props {
    data: Anomaly[] | undefined;
}

export function AnomalyList({ data }: Props) {
    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case "critical": return "border-rose-200 bg-rose-50 text-rose-700";
            case "high": return "border-orange-200 bg-orange-50 text-orange-700";
            case "medium": return "border-amber-200 bg-amber-50 text-amber-700";
            default: return "border-slate-200 bg-slate-50 text-slate-700";
        }
    };

    const getAnomalyIcon = (type: string) => {
        switch (type) {
            case "failure_rate_spike": return <TrendingUp className="h-4 w-4" />;
            case "mapping_error_spike": return <Database className="h-4 w-4" />;
            case "stuck_outbox": return <Zap className="h-4 w-4" />;
            case "worker_timeout": return <Timer className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-rose-500" />
                    Anomaly Detection
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${data && data.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {data && data.length > 0 ? `${data.length} Detected` : "Clear"}
                </span>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 max-h-[400px]">
                {data?.map((anomaly) => (
                    <div
                        key={anomaly.id}
                        className={`p-4 rounded-xl border-l-4 transition-all hover:scale-[1.01] ${getSeverityStyles(anomaly.severity)}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-lg bg-white/50 backdrop-blur-sm">
                                {getAnomalyIcon(anomaly.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{anomaly.type.replace(/_/g, ' ')}</span>
                                    <span className="text-[10px] opacity-60 font-medium whitespace-nowrap">
                                        {format(new Date(anomaly.detected_at), "HH:mm:ss", { locale: tr })}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold mt-1 leading-relaxed">{anomaly.message}</p>
                                {anomaly.clinicId && (
                                    <div className="mt-2 flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/40 uppercase">Clinic: {anomaly.clinicId}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {(!data || data.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                            <Info className="h-6 w-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">System Healthy</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">No anomalies detected in the last analysis cycle.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
