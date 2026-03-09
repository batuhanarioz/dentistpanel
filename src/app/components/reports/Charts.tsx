"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
    AreaChart, Area
} from "recharts";

const CHART_COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0ea5e9"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-xs font-bold text-slate-700">{entry.name}:</span>
                            <span className="text-xs font-black text-slate-900">{prefix}{entry.value.toLocaleString('tr-TR')}{suffix}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RevenueTrendChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
                />
                <Tooltip content={<CustomTooltip suffix=" ₺" />} />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Gelir"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AppointmentVolumeChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip suffix=" Randevu" />} />
                <Bar
                    dataKey="count"
                    name="Randevu"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DoctorRevenueChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip suffix=" ₺" />} cursor={{ fill: 'transparent' }} />
                <Bar
                    dataKey="revenue"
                    name="Gelir"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    barSize={12}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TreatmentDistributionChart({ data }: { data: any[] }) {
    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip suffix=" Tedavi" />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full px-4">
                {data.slice(0, 6).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-[10px] font-bold text-slate-600 truncate">{entry.name}</span>
                        <span className="text-[10px] font-black text-slate-900 ml-auto">{entry.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Placeholder for missing components to prevent errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CapacityHeatmap({ data }: { data: any }) { return <div className="h-full w-full bg-slate-50 rounded-2xl" />; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PatientGrowthChart({ data }: { data: any }) { return null; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NoShowTrendChart({ data }: { data: any }) { return null; }
