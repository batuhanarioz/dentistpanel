"use client";

import { USSMappingError } from "@/hooks/useUSSMonitoring";
import {
    Database,
    AlertCircle,
    Hash
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
    data: USSMappingError[] | undefined;
}

export function MappingErrorTable({ data }: Props) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Database className="h-4 w-4 text-amber-500" />
                    Mapping Errors
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data?.length ?? 0} Active Errors</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clinic</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Field</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local Value</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Error Message</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Occurred At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data?.map((err) => (
                            <tr key={err.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold text-slate-700">{err.clinicName}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Hash className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{err.field}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-slate-800 italic">&quot;{err.localValue}&quot;</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-start gap-2 max-w-[250px]">
                                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-xs text-slate-600 leading-relaxed italic">{err.error}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-slate-500 font-medium">
                                    {format(new Date(err.created_at), "dd.MM.yyyy HH:mm", { locale: tr })}
                                </td>
                            </tr>
                        ))}
                        {(!data || data.length === 0) && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                                    No mapping errors detected.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
