import React, { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";
import { EmptyState } from "./ReportCard";

const CHART_COLORS = ["#0d9488", "#4BB543", "#d97706", "#e11d48", "#6366f1", "#8b5cf6", "#0ea5e9"];

export function StatusByDayChart({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState />;
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("tr-TR")} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Tamamlandı" stackId="a" fill="#4BB543" />
                <Bar dataKey="confirmed" name="Onaylı" stackId="a" fill="#0d9488" />
                <Bar dataKey="pending" name="Bekliyor" stackId="a" fill="#f59e0b" />
                <Bar dataKey="cancelled" name="İptal" stackId="a" fill="#e11d48" />
                <Bar dataKey="no_show" name="Gelmedi" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function ChannelPerformanceChart({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState />;
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-auto space-y-1.5 min-w-[120px]">
                {data.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-[11px] font-medium text-slate-600">{item.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-900">%{item.pct}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function OccupancyChart({ data }: { data: any[] }) {
    if (data.length === 0) return <EmptyState />;
    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="doluluk" name="Doluluk" stroke="#6366f1" strokeWidth={3} dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function PatientBreakdownChart({ data, total }: { data: any[], total: number }) {
    if (total === 0) return <EmptyState />;
    const COLORS = ["#0d9488", "#6366f1"];
    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="w-full sm:w-auto space-y-2.5 min-w-[120px]">
                {data.map((item, i) => (
                    <div key={item.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-slate-900">{item.value}</span>
                            <span className="text-[10px] text-slate-500 font-medium">hasta (%{total > 0 ? Math.round((item.value / total) * 100) : 0})</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
