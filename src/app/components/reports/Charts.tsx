"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, CartesianGrid,
    AreaChart, Area, LineChart, Line
} from "recharts";
import { useClinic } from "@/app/context/ClinicContext";

const CHART_COLORS = ["#6366f1", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0ea5e9"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            <span className="text-xs font-bold text-slate-700">{entry.name}:</span>
                            <span className="text-xs font-black text-slate-900">{prefix}{entry.value?.toLocaleString("tr-TR")}{suffix}</span>
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
    const { themeColorFrom: brandFrom = '#6366f1' } = useClinic();
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={brandFrom} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={brandFrom} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    interval="preserveStartEnd"
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
                />
                <Tooltip content={<CustomTooltip suffix=" ₺" />} />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Gelir"
                    stroke={brandFrom}
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
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    interval="preserveStartEnd"
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip suffix=" Randevu" />} />
                <Bar dataKey="count" name="Randevu" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
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
                    tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip suffix=" ₺" />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="revenue" name="Gelir" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={12} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function TreatmentDistributionChart({
    data,
    dataKey = "count",
}: {
    data: { name: string; count: number; revenue: number }[];
    dataKey?: "count" | "revenue";
}) {
    const filtered = data.filter(d => d[dataKey] > 0);
    const suffix = dataKey === "revenue" ? " ₺" : " Randevu";
    const formatter = (v: number) =>
        dataKey === "revenue" ? v.toLocaleString("tr-TR") : String(v);

    if (filtered.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-400 italic">
                Bu dönemde veri yok.
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={filtered}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey={dataKey}
                    >
                        {filtered.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip suffix={suffix} />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full px-2">
                {filtered.slice(0, 6).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-[10px] font-bold text-slate-600 truncate">{entry.name}</span>
                        <span className="text-[10px] font-black text-slate-900 ml-auto">{formatter(entry[dataKey])}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Appointments by hour heatmap (bar chart)
export function CapacityHeatmap({ data }: { data: { hour: number; count: number }[] }) {
    const formatted = data
        .filter(d => d.hour >= 7 && d.hour <= 20) // Only show clinic hours
        .map(d => ({
            ...d,
            label: `${String(d.hour).padStart(2, "0")}:00`
        }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatted} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip suffix=" Randevu" />} />
                <Bar
                    dataKey="count"
                    name="Randevu"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    fill="#10b981"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Daily new patients line chart
export function PatientGrowthChart({ data }: { data: { date: string; count: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    interval="preserveStartEnd"
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip suffix=" Hasta" />} />
                <Area
                    type="monotone"
                    dataKey="count"
                    name="Yeni Hasta"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPatients)"
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// No-show rate trend line chart
export function NoShowTrendChart({ data }: { data: { date: string; rate: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    interval="preserveStartEnd"
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => `%${v}`}
                    domain={[0, "auto"]}
                />
                <Tooltip content={<CustomTooltip suffix="%" />} />
                <Line
                    type="monotone"
                    dataKey="rate"
                    name="Gelmeme Oranı"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

// Payment method distribution — horizontal bar
export function PaymentMethodChart({ data }: { data: { method: string; amount: number; count: number }[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[160px] text-sm text-slate-400 italic">
                Bu dönemde tahsilat verisi yok.
            </div>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <YAxis
                    dataKey="method"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 700 }}
                    width={90}
                />
                <Tooltip content={<CustomTooltip suffix=" ₺" />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="amount" name="Tahsilat" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Day-of-week appointment distribution
export function DowDistributionChart({ data }: { data: { day: string; count: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip suffix=" Randevu" />} />
                <Bar dataKey="count" name="Randevu" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
        </ResponsiveContainer>
    );
}
