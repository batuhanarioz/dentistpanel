"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
} from "recharts";



export function DashboardAnalytics() {
    const [appointments, setAppointments] = useState<{ starts_at: string; status: string; treatment_type?: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const start = new Date();
            start.setDate(start.getDate() - 7);

            const end = new Date();
            end.setDate(end.getDate() + 7);

            const { data } = await supabase
                .from("appointments")
                .select("starts_at, status, treatment_type")
                .gte("starts_at", start.toISOString())
                .lte("starts_at", end.toISOString());

            setAppointments(data || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};

        // Filter only completed appointments and group by treatment type
        appointments
            .filter(a => a.status === "completed")
            .forEach(a => {
                const type = a.treatment_type || "Diğer";
                counts[type] = (counts[type] || 0) + 1;
            });

        const palette = [
            { color: "#10b981", grad: ["#10b981", "#059669"] },
            { color: "#6366f1", grad: ["#6366f1", "#4f46e5"] },
            { color: "#f59e0b", grad: ["#f59e0b", "#d97706"] },
            { color: "#f43f5e", grad: ["#f43f5e", "#e11d48"] },
            { color: "#8b5cf6", grad: ["#8b5cf6", "#7c3aed"] },
            { color: "#ec4899", grad: ["#ec4899", "#db2777"] },
            { color: "#06b6d4", grad: ["#06b6d4", "#0891b2"] },
        ];

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], index) => {
                const p = palette[index % palette.length];
                return {
                    name,
                    value,
                    color: p.color,
                    grad: p.grad,
                    gradientId: `grad-treatment-${index}`
                };
            });
    }, [appointments]);

    const totalAppointmentsCount = statusData.reduce((acc, curr) => acc + curr.value, 0);

    const weeklyVolume = useMemo(() => {
        const next7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d.toISOString().split("T")[0];
        });

        const volume = next7Days.map(day => {
            const count = appointments.filter(a => a.starts_at.startsWith(day)).length;
            return {
                day: new Date(day).toLocaleDateString("tr-TR", { weekday: "short" }),
                fullDate: new Date(day).toLocaleDateString("tr-TR"),
                total: count
            };
        });
        return volume;
    }, [appointments]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {payload[0].name || payload[0].payload.day}
                    </p>
                    <p className="text-xl font-black text-white leading-none">
                        {payload[0].value} <span className="text-[10px] font-medium text-slate-500 uppercase">Kişi</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="h-40 flex items-center justify-center text-xs text-slate-500 animate-pulse">Veriler analiz ediliyor...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Donut Chart Card */}
            <div className="group/card bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-indigo-100 transition-colors" />

                <div className="flex items-start justify-between mb-6 relative z-10">
                    <div>
                        <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Randevu Durumu</h3>
                        <p className="text-xs font-bold text-slate-900">Tamamlanan Tedaviler</p>
                    </div>
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                    </div>
                </div>

                <div className="h-[220px] relative flex items-center justify-center">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                        <span className="text-3xl font-black text-slate-900 leading-none">{totalAppointmentsCount}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">TAMAMLANAN</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {statusData.map((d, i) => (
                                    <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={d.grad[0]} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={d.grad[1]} stopOpacity={1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={statusData}
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                animationDuration={1500}
                                cornerRadius={10}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 max-h-[120px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                        {statusData.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-lg transition-all cursor-default">
                                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}40` }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight truncate">{d.name}</p>
                                    <p className="text-xs font-black text-slate-900 leading-none">{d.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bar Chart Card */}
            <div className="group/card bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden flex flex-col">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-50 rounded-full blur-3xl opacity-50 group-hover/card:bg-teal-100 transition-colors" />

                <div className="flex items-start justify-between mb-6 relative z-10">
                    <div>
                        <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Haftalık Yoğunluk</h3>
                        <p className="text-xs font-bold text-slate-900">Önümüzdeki 7 Günlük Projeksiyon</p>
                    </div>
                    <div className="h-8 w-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 h-[200px] mt-2 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyVolume} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0d9488" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: '900', fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: '#f8fafc', radius: 12 }}
                                content={<CustomTooltip />}
                            />
                            <Bar
                                dataKey="total"
                                fill="url(#barGradient)"
                                radius={[12, 12, 12, 12]}
                                barSize={28}
                                animationDuration={2000}
                                minPointSize={5}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                    <div className="h-full w-full bg-indigo-500/10 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Planlanmış +{weeklyVolume.reduce((acc, curr) => acc + curr.total, 0)} Hasta</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
