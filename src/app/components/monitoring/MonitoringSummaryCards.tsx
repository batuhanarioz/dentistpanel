"use client";

import { MonitoringSummary } from "@/hooks/useUSSMonitoring";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    PauseCircle,
    PlayCircle,
    RefreshCcw,
    XCircle,
    Database
} from "lucide-react";

interface Props {
    data: MonitoringSummary | undefined;
}

export function MonitoringSummaryCards({ data }: Props) {
    const cards = [
        {
            label: "Pending Jobs",
            value: data?.pendingJobs ?? 0,
            description: "Jobs waiting in queue",
            icon: Clock,
            status: (data?.pendingJobs ?? 0) > 1000 ? "warning" : "healthy",
        },
        {
            label: "Processing Jobs",
            value: data?.processingJobs ?? 0,
            description: "Active workers processing",
            icon: PlayCircle,
            status: "healthy",
        },
        {
            label: "Retry Queue",
            value: data?.retryQueue ?? 0,
            description: "Jobs scheduled for retry",
            icon: RefreshCcw,
            status: (data?.retryQueue ?? 0) > 100 ? "warning" : "healthy",
        },
        {
            label: "Sent Jobs (24h)",
            value: data?.sentJobs24h ?? 0,
            description: "Successfully transmitted",
            icon: CheckCircle2,
            status: "healthy",
        },
        {
            label: "Failed Jobs",
            value: data?.failedJobs ?? 0,
            description: "Failed but retryable",
            icon: AlertCircle,
            status: (data?.failedJobs ?? 0) > 10 ? "critical" : (data?.failedJobs ?? 0) > 0 ? "warning" : "healthy",
        },
        {
            label: "Dead Jobs",
            value: data?.deadJobs ?? 0,
            description: "Failed permanently",
            icon: XCircle,
            status: (data?.deadJobs ?? 0) > 0 ? "critical" : "healthy",
        },
        {
            label: "Mapping Errors",
            value: data?.mappingErrors ?? 0,
            description: "Data validation issues",
            icon: Database,
            status: (data?.mappingErrors ?? 0) > 0 ? "warning" : "healthy",
        },
        {
            label: "Global Failure Rate",
            value: `${((data?.globalFailureRate ?? 0) * 100).toFixed(2)}%`,
            description: "System-wide failure rate",
            icon: Activity,
            status: (data?.globalFailureRate ?? 0) > 0.05 ? "critical" : (data?.globalFailureRate ?? 0) > 0.01 ? "warning" : "healthy",
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy": return "bg-emerald-500";
            case "warning": return "bg-amber-500";
            case "critical": return "bg-rose-500";
            default: return "bg-slate-500";
        }
    };

    const getStatusShadow = (status: string) => {
        switch (status) {
            case "healthy": return "shadow-emerald-100";
            case "warning": return "shadow-amber-100";
            case "critical": return "shadow-rose-100";
            default: return "shadow-slate-100";
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md ${getStatusShadow(card.status)}`}
                >
                    <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-xl bg-slate-50 text-slate-500`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(card.status)} animate-pulse`} />
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold text-slate-900 tracking-tight">
                            {card.value}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 mt-1">
                            {card.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {card.description}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
