"use client";

import { ClinicUSSStatus } from "@/hooks/useUSSMonitoring";
import {
    Building2,
    ExternalLink,
    Search,
    Filter,
    ArrowUpDown,
    Circle
} from "lucide-react";
import { useState, useMemo } from "react";

interface Props {
    data: ClinicUSSStatus[] | undefined;
    onSelectClinic: (id: string) => void;
}

export function ClinicOverviewTable({ data, onSelectClinic }: Props) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(c =>
            c.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.clinicId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const getStatusIndicator = (status: string) => {
        switch (status) {
            case "connected": return <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />;
            case "error": return <Circle className="h-2 w-2 fill-rose-500 text-rose-500" />;
            default: return <Circle className="h-2 w-2 fill-slate-300 text-slate-300" />;
        }
    };

    const getReadinessBadge = (status: string) => {
        switch (status) {
            case "ready": return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600 uppercase">Ready</span>;
            case "not_ready": return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 uppercase">Gaps Found</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">Pending</span>;
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-teal-600" />
                        Clinic USS Drilldown
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                        {filteredData.length} CLINIKS
                    </span>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search clinics by name or ID..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/50 sticky top-0 z-10">
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clinic Name</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Connector</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jobs</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Failures</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Readiness</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Sync</th>
                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((clinic) => (
                            <tr
                                key={clinic.clinicId}
                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => onSelectClinic(clinic.clinicId)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-800">{clinic.clinicName}</span>
                                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{clinic.clinicId}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIndicator(clinic.connectorStatus)}
                                        <span className="text-xs font-semibold text-slate-700 capitalize">{clinic.connectorStatus}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold ${clinic.pendingJobs > 100 ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {clinic.pendingJobs}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">Pending</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${clinic.failures > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{clinic.failures}</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">Failures</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${clinic.mappingErrors > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{clinic.mappingErrors}</span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">Mapping</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getReadinessBadge(clinic.readinessStatus)}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {clinic.lastSync ? new Date(clinic.lastSync).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all transform group-hover:scale-110">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <Building2 className="h-10 w-10 text-slate-200 mb-3" />
                                        <p className="text-sm font-semibold text-slate-500">No clinics found matching your search</p>
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
