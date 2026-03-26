"use client";

import { useState } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";
import {
    useUSSSummary,
    useUSSTelemetry,
    useUSSHeartbeat,
    useUSSAnomalies,
    useUSSClinics,
    useUSSFailures,
    useUSSMappingErrors,
    useUSSReadinessConfig,
    useUSSReadinessGaps,
    useUSSReadinessChecklist
} from "@/hooks/useUSSMonitoring";

import { MonitoringSummaryCards } from "@/app/components/monitoring/MonitoringSummaryCards";
import dynamic from "next/dynamic";
const TelemetryCharts = dynamic(
    () => import("@/app/components/monitoring/TelemetryCharts").then(m => m.TelemetryCharts),
    { ssr: false, loading: () => <div className="h-40 flex items-center justify-center text-xs text-slate-500 animate-pulse">Grafikler yükleniyor...</div> }
);
import { WorkerHeartbeatTable } from "@/app/components/monitoring/WorkerHeartbeatTable";
import { AnomalyList } from "@/app/components/monitoring/AnomalyList";
import { ClinicOverviewTable } from "@/app/components/monitoring/ClinicOverviewTable";
import { ClinicDetailPanel } from "@/app/components/monitoring/ClinicDetailPanel";
import { FailureTable } from "@/app/components/monitoring/FailureTable";
import { MappingErrorTable } from "@/app/components/monitoring/MappingErrorTable";
import { ReadinessPanel } from "@/app/components/monitoring/ReadinessPanel";
import { OperationsStatus } from "@/app/components/monitoring/OperationsStatus";
import { OutboxDetailDrawer } from "@/app/components/monitoring/OutboxDetailDrawer";

import {
    Activity,
    LayoutDashboard,
    AlertOctagon,
    Server,
    ShieldCheck,
    History,
    RefreshCw
} from "lucide-react";

export default function MonitoringPage() {
    usePageHeader("USS Monitoring");
    const clinic = useClinic();

    const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
    const [selectedOutboxId, setSelectedOutboxId] = useState<string | null>(null);

    // Data fetching
    const { data: summary, refetch: refetchSummary, isFetching: isFetchingSummary } = useUSSSummary();
    const { data: telemetry } = useUSSTelemetry();
    const { data: heartbeats } = useUSSHeartbeat();
    const { data: anomalies } = useUSSAnomalies();
    const { data: clinics } = useUSSClinics();
    const { data: failures } = useUSSFailures();
    const { data: mappingErrors } = useUSSMappingErrors();
    const { data: readinessConfig } = useUSSReadinessConfig();
    const { data: readinessGaps } = useUSSReadinessGaps();
    const { data: readinessChecklist } = useUSSReadinessChecklist();

    if (!clinic.isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-6">
                    <AlertOctagon className="h-10 w-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 uppercase">Access Denied</h1>
                <p className="text-slate-500 mt-2 font-medium">Bu sayfaya yalnızca Super Admin üyeler erişebilir.</p>
            </div>
        );
    }

    const handleRefreshAll = () => {
        refetchSummary();
        // Other refetches will be triggered by React Query if needed, or we can manually trigger them.
        // For polling, they already auto-refresh every 20s.
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-teal-400 shadow-lg">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Global Health</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 block">Live System Status</span>
                    </div>
                </div>
                <button
                    onClick={handleRefreshAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSummary ? 'animate-spin' : ''}`} />
                    Force Refresh
                </button>
            </div>

            {/* 1. GLOBAL HEALTH OVERVIEW */}
            <MonitoringSummaryCards data={summary} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Left Column (Main Analysis) */}
                <div className="xl:col-span-2 space-y-8">
                    <TelemetryCharts data={telemetry} />

                    {/* 5. CLINIC DRILLDOWN */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Multi-Clinic Operations</h3>
                        </div>
                        <ClinicOverviewTable
                            data={clinics}
                            onSelectClinic={setSelectedClinicId}
                        />
                    </section>

                    {/* 6. FAILURE TABLE & 7. MAPPING ERRORS - Moved inside the main col flow to avoid sidebar interference */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Failure Logs</h3>
                            </div>
                            <FailureTable
                                data={failures}
                                onSelectFailure={setSelectedOutboxId}
                            />
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <AlertOctagon className="h-4 w-4 text-slate-400" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Integrity Issues</h3>
                            </div>
                            <MappingErrorTable data={mappingErrors} />
                        </section>
                    </div>
                </div>

                {/* Right Column (Sidebar/Health) */}
                <div className="space-y-8 sticky top-24">
                    {/* 3. WORKER HEALTH */}
                    <WorkerHeartbeatTable data={heartbeats} />

                    {/* 4. ANOMALY DETECTION */}
                    <AnomalyList data={anomalies} />

                    {/* 8. READINESS PANEL */}
                    <ReadinessPanel
                        config={readinessConfig}
                        gaps={readinessGaps}
                        checklist={readinessChecklist}
                    />

                    {/* 9. SYSTEM OPERATIONS STATUS */}
                    <OperationsStatus />
                </div>
            </div>

            {/* Drawers / Modals */}
            <ClinicDetailPanel
                clinicId={selectedClinicId}
                onClose={() => setSelectedClinicId(null)}
            />

            <OutboxDetailDrawer
                outboxId={selectedOutboxId}
                onClose={() => setSelectedOutboxId(null)}
            />
        </div>
    );
}
