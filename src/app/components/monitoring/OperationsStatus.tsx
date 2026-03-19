"use client";

import { useUSSOpsStatus } from "@/hooks/useUSSMonitoring";
import {
    Terminal,
    History,
    ShieldCheck,
    Trash2,
    Activity
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function OperationsStatus() {
    const { data: status } = useUSSOpsStatus();

    const ops = [
        { label: "Regression Testing", value: status?.regressionStatus ?? "Idle", icon: Activity, color: "text-blue-500" },
        { label: "Data Purge Status", value: status?.lastPurgeRun ? `Last run: ${format(new Date(status.lastPurgeRun), "dd MMM HH:mm", { locale: tr })}` : "Never run", icon: Trash2, color: "text-amber-500" },
        { label: "Retention Policy", value: status?.retentionStatus ?? "Standard (90d)", icon: ShieldCheck, color: "text-emerald-500" },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-slate-500" />
                    System Operations
                </h3>
            </div>
            <div className="p-4 space-y-4">
                {ops.map((op) => (
                    <div key={op.label} className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-lg bg-slate-50 ${op.color}`}>
                            <op.icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{op.label}</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{op.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/10 flex items-center justify-center">
                <span className="text-[10px] font-medium text-slate-400 italic">Self-healing active</span>
            </div>
        </div>
    );
}
