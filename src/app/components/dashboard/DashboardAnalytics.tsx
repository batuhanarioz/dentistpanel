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
    const [appointments, setAppointments] = useState<{ starts_at: string; status: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const start = new Date();
            start.setDate(start.getDate() - 7);

            const end = new Date();
            end.setDate(end.getDate() + 7);

            const { data } = await supabase
                .from("appointments")
                .select("starts_at, status")
                .gte("starts_at", start.toISOString())
                .lte("starts_at", end.toISOString());

            setAppointments(data || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        const todayStr = new Date().toISOString().split("T")[0];

        appointments.filter(a => a.starts_at <= todayStr + "T23:59:59").forEach(a => {
            counts[a.status] = (counts[a.status] || 0) + 1;
        });
        return [
            { name: "Tamamlandı", value: counts["completed"] || 0, color: "#4BB543" },
            { name: "Planlandı", value: counts["confirmed"] || 0, color: "#0d9488" },
            { name: "Bekliyor", value: counts["pending"] || 0, color: "#f59e0b" },
            { name: "İptal", value: counts["cancelled"] || 0, color: "#e11d48" },
        ].filter(d => d.value > 0);
    }, [appointments]);

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

    if (loading) return <div className="h-40 flex items-center justify-center text-xs text-slate-500">Analitikler yükleniyor...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <div className="bg-white rounded-3xl border p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Randevu Durumu (Son 1 Hafta)</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {statusData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-[10px] font-bold text-slate-600">{d.name}: {d.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-3xl border p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Haftalık Yoğunluk (Önümüzdeki 1 Hafta)</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyVolume}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#0d9488' }}
                                labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                            />
                            <Bar
                                dataKey="total"
                                fill="#0d9488"
                                radius={[6, 6, 0, 0]}
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
