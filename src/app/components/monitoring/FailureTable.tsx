"use client";

import { USSFailure } from "@/hooks/useUSSMonitoring";
import {
    AlertOctagon,
    Search,
    ChevronRight,
    Clock,
    Building
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
    data: USSFailure[] | undefined;
    onSelectFailure: (id: string) => void;
}

export function FailureTable({ data, onSelectFailure }: Props) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-rose-500" />
                    Transmission Failures
                </h3>
                <div className="flex gap-2">
                    {/* Filter buttons could go here */}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clinic</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event & Error</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outbox ID</th>
                            <th className="px-6 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data?.map((fail) => (
                            <tr
                                key={fail.id}
                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => onSelectFailure(fail.outboxId)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        {format(new Date(fail.time), "dd MMM HH:mm", { locale: tr })}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                            <Building className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{fail.clinicName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-800">{fail.eventType}</span>
                                        <span className="text-[10px] font-medium text-rose-500 uppercase mt-0.5">{fail.errorType}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="max-w-[150px] truncate text-[10px] font-medium text-slate-500" title={fail.status}>
                                        {fail.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 italic">
                                        {fail.outboxId}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors inline-block" />
                                </td>
                            </tr>
                        ))}
                        {(!data || data.length === 0) && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                                    No failures recorded in the current window.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
