"use client";

import { WorkerHeartbeat } from "@/hooks/useUSSMonitoring";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
    data: WorkerHeartbeat[] | undefined;
}

export function WorkerHeartbeatTable({ data }: Props) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "alive":
                return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Alive
                </span>;
            case "delayed":
                return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Delayed
                </span>;
            case "offline":
                return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Offline
                </span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                    Unknown
                </span>;
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Worker Health</h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{data?.length ?? 0} Active Workers</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Worker ID</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Heartbeat</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Batch</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Event</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data?.map((worker) => (
                            <tr key={worker.workerId} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{worker.workerId}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(worker.status)}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-600">
                                    {worker.lastHeartbeat ? formatDistanceToNow(new Date(worker.lastHeartbeat), { addSuffix: true, locale: tr }) : "-"}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-semibold text-slate-800">{worker.currentBatchSize} items</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[200px]">
                                    {worker.lastProcessedEvent ?? "N/A"}
                                </td>
                            </tr>
                        ))}
                        {(!data || data.length === 0) && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                                    No workers detected...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
