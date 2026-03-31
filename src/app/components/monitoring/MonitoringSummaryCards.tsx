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
            label: "Bekleyen İşler",
            value: data?.pendingJobs ?? 0,
            description: "Kuyrukta bekleyen görevler",
            icon: Clock,
            status: (data?.pendingJobs ?? 0) > 1000 ? "warning" : "healthy",
        },
        {
            label: "İşlenen İşler",
            value: data?.processingJobs ?? 0,
            description: "Şu an aktif işlenen görevler",
            icon: PlayCircle,
            status: "healthy",
        },
        {
            label: "Yeniden Deneme",
            value: data?.retryQueue ?? 0,
            description: "Tekrar denenecek görevler",
            icon: RefreshCcw,
            status: (data?.retryQueue ?? 0) > 100 ? "warning" : "healthy",
        },
        {
            label: "Gönderilen (24s)",
            value: data?.sentJobs24h ?? 0,
            description: "Son 24 saatte gönderilen",
            icon: CheckCircle2,
            status: "healthy",
        },
        {
            label: "Başarısız İşler",
            value: data?.failedJobs ?? 0,
            description: "Başarısız, yeniden denenecek",
            icon: AlertCircle,
            status: (data?.failedJobs ?? 0) > 10 ? "critical" : (data?.failedJobs ?? 0) > 0 ? "warning" : "healthy",
        },
        {
            label: "Çöpe Giden İşler",
            value: data?.deadJobs ?? 0,
            description: "Kalıcı olarak başarısız",
            icon: XCircle,
            status: (data?.deadJobs ?? 0) > 0 ? "critical" : "healthy",
        },
        {
            label: "Eşleşme Hataları",
            value: data?.mappingErrors ?? 0,
            description: "Veri doğrulama sorunları",
            icon: Database,
            status: (data?.mappingErrors ?? 0) > 0 ? "warning" : "healthy",
        },
        {
            label: "Genel Hata Oranı",
            value: `${((data?.globalFailureRate ?? 0) * 100).toFixed(2)}%`,
            description: "Sistem geneli başarısızlık oranı",
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
