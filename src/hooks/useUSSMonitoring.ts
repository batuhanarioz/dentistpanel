import { useQuery } from "@tanstack/react-query";

const BASE_URL = ""; // Relative URL as it might be proxied or on the same host

export interface MonitoringSummary {
    pendingJobs: number;
    processingJobs: number;
    retryQueue: number;
    sentJobs24h: number;
    failedJobs: number;
    deadJobs: number;
    mappingErrors: number;
    lastSuccessfulTransmission: string | null;
    globalFailureRate: number;
}

export interface TelemetryData {
    latency: {
        p50: number[];
        p90: number[];
        p99: number[];
        timestamps: string[];
    };
    throughput: {
        eventsPerMinute: number[];
        sentPerMinute: number[];
        timestamps: string[];
    };
    failureRateTrend: {
        rate: number[];
        timestamps: string[];
    };
}

export interface WorkerHeartbeat {
    workerId: string;
    lastHeartbeat: string;
    status: 'alive' | 'delayed' | 'offline';
    currentBatchSize: number;
    lastProcessedEvent: string | null;
}

export interface Anomaly {
    id: string;
    type: 'failure_rate_spike' | 'mapping_error_spike' | 'stuck_outbox' | 'worker_timeout';
    severity: 'low' | 'medium' | 'high' | 'critical';
    detected_at: string;
    clinicId?: string;
    message: string;
}

export interface ClinicUSSStatus {
    clinicId: string;
    clinicName: string;
    connectorStatus: 'connected' | 'disconnected' | 'error';
    readinessStatus: 'ready' | 'not_ready' | 'pending';
    lastSync: string | null;
    pendingJobs: number;
    failures: number;
    mappingErrors: number;
}

export interface ClinicUSSDetail extends ClinicUSSStatus {
    connectorMode: string;
    environment: string;
    credentialStatus: string;
    lastTransmission: string | null;
    recentFailures: USSFailure[];
    recentMappingErrors: { field: string; error: string; [key: string]: unknown }[];
}

export interface USSFailure {
    id: string;
    time: string;
    clinicName: string;
    eventType: string;
    errorType: string;
    event_type: string;
    error_type: string;
    status: string;
    outboxId: string;
}

export interface OutboxDetail {
    id: string;
    payload: Record<string, unknown>;
    error: Record<string, unknown> | string | null;
    status: string;
    attempts: number;
    timestamps: {
        created_at: string;
        updated_at: string;
        processed_at?: string;
        failed_at?: string;
    };
}

export interface USSMappingError {
    id: string;
    clinicName: string;
    field: string;
    localValue: string;
    error: string;
    created_at: string;
}

export interface ReadinessConfig {
    connectorMode: string;
    transportMode: string;
    authMode: string;
    signingMode: string;
    endpointConfigured: boolean;
    credentialsStatus: string;
}

export interface ReadinessGaps {
    gaps: string[];
}

export interface ReadinessChecklist {
    items: { id: string; label: string; status: 'completed' | 'pending' | 'failed' }[];
}

export interface SystemOpsStatus {
    regressionStatus: string;
    lastPurgeRun: string | null;
    retentionStatus: string;
}

async function fetchUSS<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`USS API error: ${response.statusText}`);
    }
    return response.json();
}

export function useUSSSummary() {
    return useQuery({
        queryKey: ['uss', 'summary'],
        queryFn: () => fetchUSS<MonitoringSummary>('/v1/uss/monitor/summary'),
        refetchInterval: 20000,
    });
}

export function useUSSTelemetry() {
    return useQuery({
        queryKey: ['uss', 'telemetry'],
        queryFn: () => fetchUSS<TelemetryData>('/v1/uss/monitor/telemetry'),
        refetchInterval: 20000,
    });
}

export function useUSSHeartbeat() {
    return useQuery({
        queryKey: ['uss', 'heartbeat'],
        queryFn: () => fetchUSS<WorkerHeartbeat[]>('/v1/uss/monitor/heartbeat'),
        refetchInterval: 20000,
    });
}

export function useUSSAnomalies() {
    return useQuery({
        queryKey: ['uss', 'anomalies'],
        queryFn: () => fetchUSS<Anomaly[]>('/v1/uss/monitor/anomalies'),
        refetchInterval: 20000,
    });
}

export function useUSSClinics() {
    // Assuming there's a list endpoint or we use summary/telemetry to get them.
    // The user didn't specify a "list all clinics" endpoint for USS status specifically, 
    // but mentioned "CLINIC DRILLDOWN" list. I'll assume /v1/uss/monitor/summary or similar might contain it,
    // or maybe /v1/uss/monitor/clinics (not in list but logical).
    // I will use a placeholder or assume summary returns it if it's "Global Health".
    // Actually, CLINIC DRILLDOWN section mentions listing all clinics.
    // I'll assume an endpoint /v1/uss/monitor/clinics exists or I'll use a specific one if I find it.
    // Since it's not in the provided list, I'll use /v1/uss/monitor/summary and assume it might have clinic list,
    // or I'll create a hook that fetches clinic list from another source and then USS status.
    // Wait, let me check the list again.
    // Ah, "CLINIC DRILLDOWN" says "This section lists all clinics' USS status."
    // I'll assume there is an endpoint for it. I'll use '/v1/uss/monitor/clinics' for now.
    return useQuery({
        queryKey: ['uss', 'clinics'],
        queryFn: () => fetchUSS<ClinicUSSStatus[]>('/v1/uss/monitor/clinics'),
        refetchInterval: 20000,
    });
}

export function useUSSClinicDetail(clinicId: string | null) {
    return useQuery({
        queryKey: ['uss', 'clinic', clinicId],
        queryFn: () => fetchUSS<ClinicUSSDetail>(`/v1/uss/monitor/clinic/${clinicId}`),
        enabled: !!clinicId,
        refetchInterval: 20000,
    });
}

export function useUSSFailures() {
    return useQuery({
        queryKey: ['uss', 'failures'],
        queryFn: () => fetchUSS<USSFailure[]>('/v1/uss/monitor/failures'),
        refetchInterval: 20000,
    });
}

export function useUSSOutboxDetail(outboxId: string | null) {
    return useQuery({
        queryKey: ['uss', 'outbox', outboxId],
        queryFn: () => fetchUSS<OutboxDetail>(`/v1/uss/monitor/outbox/${outboxId}`),
        enabled: !!outboxId,
    });
}

export function useUSSMappingErrors() {
    return useQuery({
        queryKey: ['uss', 'mapping-errors'],
        queryFn: () => fetchUSS<USSMappingError[]>('/v1/uss/monitor/mapping-errors'),
        refetchInterval: 20000,
    });
}

export function useUSSReadinessConfig() {
    return useQuery({
        queryKey: ['uss', 'readiness', 'config'],
        queryFn: () => fetchUSS<ReadinessConfig>('/v1/uss/readiness/config'),
        refetchInterval: 60000,
    });
}

export function useUSSReadinessGaps() {
    return useQuery({
        queryKey: ['uss', 'readiness', 'gaps'],
        queryFn: () => fetchUSS<ReadinessGaps>('/v1/uss/readiness/gaps'),
        refetchInterval: 60000,
    });
}

export function useUSSReadinessChecklist() {
    return useQuery({
        queryKey: ['uss', 'readiness', 'checklist'],
        queryFn: () => fetchUSS<ReadinessChecklist>('/v1/uss/readiness/checklist'),
        refetchInterval: 60000,
    });
}

export function useUSSOpsStatus() {
    return useQuery({
        queryKey: ['uss', 'ops', 'status'],
        queryFn: () => fetchUSS<SystemOpsStatus>('/v1/uss/monitor/ops-status'), // Placeholder path
        refetchInterval: 60000,
    });
}
