"use client";

import React from "react";
import { DatePreset } from "@/hooks/useReports";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { Filter, Calendar, Users, Activity, RefreshCw, Download } from "lucide-react";
import { useClinic } from "@/app/context/ClinicContext";
import type { ReportData } from "./ReportSections";

interface GlobalFilterBarProps {
    preset: DatePreset;
    setPreset: (p: DatePreset) => void;
    customStart: string;
    setCustomStart: (s: string) => void;
    customEnd: string;
    setCustomEnd: (e: string) => void;
    doctorFilter: string;
    setDoctorFilter: (d: string) => void;
    treatmentFilter: string;
    setTreatmentFilter: (t: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    doctors: { id: string; full_name: string }[];
    treatmentTypes: { id: string; name: string }[];
    rangeLabel: string;
    loading?: boolean;
    onRefresh?: () => void;
    analytics?: ReportData | null;
}

function exportToCSV(analytics: ReportData, rangeLabel: string) {
    const rows: string[] = [];

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    // KPI Özeti
    rows.push(esc("KPI ÖZETİ — " + rangeLabel));
    rows.push([esc("Metrik"), esc("Değer")].join(","));
    rows.push([esc("Toplam Gelir (₺)"), analytics.kpis.totalRevenue].join(","));
    rows.push([esc("Bekleyen (₺)"), analytics.kpis.pendingPayments].join(","));
    rows.push([esc("Gecikmiş Ödeme (₺)"), analytics.overdueStats.totalAmount].join(","));
    rows.push([esc("Gecikmiş Ödeme Adedi"), analytics.overdueStats.count].join(","));
    rows.push([esc("Toplam Randevu"), analytics.kpis.totalAppointments].join(","));
    rows.push([esc("Yeni Hasta"), analytics.kpis.newPatients].join(","));
    rows.push([esc("Gelmeme Oranı (%)"), analytics.kpis.noShowRate.toFixed(1)].join(","));
    rows.push([esc("İptal Oranı (%)"), analytics.kpis.cancelledRate.toFixed(1)].join(","));
    rows.push([esc("Geri Dönüş Oranı (%)"), analytics.retention.totalDistinctWithAppts > 0
        ? Math.round((analytics.retention.returningCount / analytics.retention.totalDistinctWithAppts) * 100)
        : 0].join(","));
    rows.push([esc("Randevu Başı Ort. Gelir (₺)"), analytics.kpis.avgRevenuePerAppt.toFixed(0)].join(","));
    rows.push("");

    // Hekim Performansı
    rows.push(esc("HEKİM PERFORMANSI"));
    rows.push([esc("Hekim"), esc("Randevu"), esc("Net Gelir (₺)"), esc("Ort. Gelir/Randevu (₺)"), esc("Gelmeme (%)"), esc("İptal (%)")].join(","));
    for (const d of [...analytics.doctorPerformance].sort((a, b) => b.revenue - a.revenue)) {
        rows.push([esc(d.name), d.appointments, d.revenue, d.avgRevenuePerAppt, d.noShowRate.toFixed(1), d.cancelledRate.toFixed(1)].join(","));
    }
    rows.push("");

    // Tedavi Dağılımı
    rows.push(esc("TEDAVİ DAĞILIMI"));
    rows.push([esc("Tedavi"), esc("Adet"), esc("Gelir (₺)"), esc("Ort. Gelir (₺)")].join(","));
    for (const t of analytics.treatmentStats.filter(t => t.count > 0)) {
        const avg = t.count > 0 && t.revenue > 0 ? Math.round(t.revenue / t.count) : 0;
        rows.push([esc(t.name), t.count, t.revenue, avg].join(","));
    }
    rows.push("");

    // Ödeme Yöntemi
    rows.push(esc("ÖDEME YÖNTEMİ DAĞILIMI"));
    rows.push([esc("Yöntem"), esc("Tahsilat (₺)"), esc("İşlem Adedi")].join(","));
    for (const m of analytics.paymentMethodStats) {
        rows.push([esc(m.method), m.amount, m.count].join(","));
    }

    const bom = "\uFEFF";
    const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klinik-rapor-${rangeLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function GlobalFilterBar({
    preset, setPreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    doctorFilter, setDoctorFilter,
    treatmentFilter, setTreatmentFilter,
    statusFilter, setStatusFilter,
    doctors,
    treatmentTypes,
    rangeLabel,
    loading,
    onRefresh,
    analytics,
}: GlobalFilterBarProps) {
    const clinic = useClinic();
    const brandFrom = clinic.themeColorFrom || '#4f46e5';
    const brandTo = clinic.themeColorTo || '#10b981';

    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b shadow-sm -mx-4 px-4 py-3 mb-0">
            <div className="max-w-7xl mx-auto flex flex-col gap-4">
                {/* Header, presets, action buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="p-2 rounded-xl shadow-lg"
                            style={{ background: brandFrom, boxShadow: `0 10px 15px -3px ${brandFrom}33` }}
                        >
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Klinik Analitiği</h1>
                            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{rangeLabel}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Date preset pills */}
                        <div className="flex overflow-x-auto p-1 bg-slate-100 rounded-xl no-scrollbar">
                            {[
                                { id: "today", label: "Bugün" },
                                { id: "7d", label: "7 Gün" },
                                { id: "30d", label: "30 Gün" },
                                { id: "thisMonth", label: "Bu Ay" },
                                { id: "lastMonth", label: "Geçen Ay" },
                                { id: "thisYear", label: "Bu Yıl" },
                                { id: "custom", label: "Özel" },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPreset(p.id as DatePreset)}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                                        preset === p.id
                                            ? "bg-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    }`}
                                    style={preset === p.id ? { color: brandFrom } : {}}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Refresh */}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                title="Verileri yenile"
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        )}

                        {/* Export CSV */}
                        {analytics && (
                            <button
                                onClick={() => exportToCSV(analytics, rangeLabel)}
                                title="CSV olarak dışa aktar"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors text-xs font-bold"
                                style={{ background: `${brandFrom}10`, borderColor: `${brandFrom}20`, color: brandFrom }}
                            >
                                <Download className="w-3.5 h-3.5" />
                                Dışa Aktar
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-2">
                    {preset === "custom" && (
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                            <PremiumDatePicker value={customStart} onChange={setCustomStart} compact />
                            <span className="text-slate-300">-</span>
                            <PremiumDatePicker value={customEnd} onChange={setCustomEnd} compact />
                        </div>
                    )}

                    <div 
                        className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 transition-all"
                        style={{ outlineColor: `${brandFrom}20` }}
                    >
                        <Users className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Hekimler</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                    </div>

                    <div 
                        className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 transition-all"
                        style={{ outlineColor: `${brandFrom}20` }}
                    >
                        <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={treatmentFilter}
                            onChange={(e) => setTreatmentFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Tedavi Tipleri</option>
                            {treatmentTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>

                    <div 
                        className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 transition-all"
                        style={{ outlineColor: `${brandFrom}20` }}
                    >
                        <Activity className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none pr-4"
                        >
                            <option value="ALL">Tüm Durumlar</option>
                            <option value="confirmed">Onaylı</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="cancelled">İptal</option>
                            <option value="no_show">Gelmedi</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setDoctorFilter("ALL");
                            setTreatmentFilter("ALL");
                            setStatusFilter("ALL");
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-tight px-2 transition-colors"
                    >
                        Filtreleri Temizle
                    </button>
                </div>
            </div>
        </div>
    );
}
