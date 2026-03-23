"use client";

import React from "react";
import {
    TrendingUp, TrendingDown, Users, Calendar, Banknote,
    AlertCircle, Award, PieChart,
    CalendarDays, Activity, Clock, Minus, CreditCard,
    BarChart3,
} from "lucide-react";
import {
    RevenueTrendChart,
    AppointmentVolumeChart,
    DoctorRevenueChart,
    TreatmentDistributionChart,
    CapacityHeatmap,
    PatientGrowthChart,
    NoShowTrendChart,
    DowDistributionChart,
    PaymentMethodChart,
} from "./Charts";

export interface ReportData {
    kpis: {
        totalRevenue: number;
        collectedPayments: number;
        pendingPayments: number;
        totalAppointments: number;
        newPatients: number;
        noShowRate: number;
        noShowCount: number;
        cancelledCount: number;
        cancelledRate: number;
        avgRevenuePerAppt: number;
        kpiTrends: {
            revenue: number | null;
            appointments: number | null;
            newPatients: number | null;
            noShowRate: number | null;
        };
    };
    trends: {
        revenueTrend: { date: string; revenue: number }[];
        appointmentTrend: { date: string; count: number }[];
        newPatientTrend: { date: string; count: number }[];
        noShowTrend: { date: string; rate: number }[];
    };
    capacity: {
        apptsByHour: { hour: number; count: number }[];
        apptsByDow: { day: string; count: number }[];
        workingDaysCount: number;
        peakHour: number | null;
        peakDow: string | null;
        avgDailyAppts: number;
    };
    doctorPerformance: {
        id: string;
        name: string;
        appointments: number;
        revenue: number;
        avgRevenuePerAppt: number;
        noShowRate: number;
        cancelledRate: number;
    }[];
    treatmentStats: { name: string; count: number; revenue: number }[];
    patientDemographics: {
        total: number;
        genderMap: Record<string, number>;
        ageGroups: Record<string, number>;
    };
    retention: {
        returningCount: number;
        firstTimeCount: number;
        totalDistinctWithAppts: number;
    };
    paymentMethodStats: { method: string; amount: number; count: number }[];
    overdueStats: { count: number; totalAmount: number };
}

// --- Helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SectionHeader = ({ title, subtitle, icon: Icon, colorClass }: { title: string; subtitle?: string; icon: any; colorClass: string }) => (
    <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl shadow-sm border ${colorClass}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 font-medium">{subtitle}</p>}
        </div>
    </div>
);

const SectionCard = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
    <div id={id} className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 ${className}`}>
        {children}
    </div>
);

function TrendBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
    if (value === null) {
        return (
            <div className="flex items-center gap-1 text-xs font-bold text-slate-300" title="Karşılaştırılacak önceki dönem verisi yok">
                <Minus className="w-3 h-3" />
                <span>—</span>
            </div>
        );
    }
    const isPositive = inverse ? value <= 0 : value >= 0;
    return (
        <div
            className={`flex items-center gap-1 text-xs font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
            title="Önceki dönemle karşılaştırma"
        >
            {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {value >= 0 ? "+" : ""}{value}%
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MetricCard = ({ label, value, subtext, trendValue, trendInverse, icon: Icon, color }: {
    label: string;
    value: string | number;
    subtext?: string;
    trendValue?: number | null;
    trendInverse?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    color: string;
}) => (
    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-2 rounded-xl ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <TrendBadge value={trendValue ?? null} inverse={trendInverse} />
        </div>
        <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
                {subtext && <span className="text-xs text-slate-400 font-medium">{subtext}</span>}
            </div>
        </div>
    </div>
);

// --- Sections ---

export const ExecutiveKPISection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    const { kpis } = data;
    const { kpiTrends } = kpis;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
                label="Toplam Gelir"
                value={kpis.totalRevenue.toLocaleString("tr-TR") + " ₺"}
                trendValue={kpiTrends.revenue}
                icon={Banknote}
                color="bg-indigo-600 shadow-indigo-100 shadow-lg"
            />
            <MetricCard
                label="Randevu Sayısı"
                value={kpis.totalAppointments}
                trendValue={kpiTrends.appointments}
                icon={Calendar}
                color="bg-emerald-500 shadow-emerald-100 shadow-lg"
            />
            <MetricCard
                label="Yeni Hastalar"
                value={kpis.newPatients}
                trendValue={kpiTrends.newPatients}
                icon={Users}
                color="bg-violet-500 shadow-violet-100 shadow-lg"
            />
            <MetricCard
                label="Gelmeme Oranı"
                value={`%${kpis.noShowRate.toFixed(1)}`}
                trendValue={kpiTrends.noShowRate}
                trendInverse
                subtext={`${kpis.noShowCount} randevu`}
                icon={AlertCircle}
                color="bg-rose-500 shadow-rose-100 shadow-lg"
            />
        </div>
    );
};

export const RevenueAnalyticsSection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    const { trends, kpis, treatmentStats, paymentMethodStats, overdueStats } = data;

    const hasRevenue = kpis.totalRevenue > 0 || kpis.pendingPayments > 0;
    const treatmentHasRevenue = treatmentStats.some(t => t.revenue > 0);

    return (
        <SectionCard id="revenue-section" className="mb-8">
            <SectionHeader
                title="Gelir Analitiği"
                subtitle="Klinik gelir kalemleri ve performans trendleri"
                icon={TrendingUp}
                colorClass="bg-indigo-50 border-indigo-100 text-indigo-600"
            />

            {/* Top row: trend + treatment pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" /> Zaman Serisi Gelir Trendi
                    </h4>
                    <div className="h-[280px]">
                        <RevenueTrendChart data={trends.revenueTrend} />
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-indigo-500" />
                        {treatmentHasRevenue ? "Tedavi Bazlı Gelir" : "Tedavi Bazlı Randevu"}
                    </h4>
                    <TreatmentDistributionChart
                        data={treatmentStats}
                        dataKey={treatmentHasRevenue ? "revenue" : "count"}
                    />
                </div>
            </div>

            {/* Bottom row: payment methods + subtotals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                {/* Payment method distribution */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-500" /> Tahsilat Yöntemi Dağılımı
                    </h4>
                    <PaymentMethodChart data={paymentMethodStats} />
                </div>

                {/* Financial summary */}
                <div className="flex flex-col justify-center gap-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                        <span className="text-sm font-medium text-slate-600">Tahsil Edilen</span>
                        <span className="text-sm font-black text-emerald-600">+{kpis.collectedPayments.toLocaleString("tr-TR")} ₺</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                        <span className="text-sm font-medium text-slate-600">Bekleyen</span>
                        <span className="text-sm font-black text-amber-600">{kpis.pendingPayments.toLocaleString("tr-TR")} ₺</span>
                    </div>
                    {overdueStats.count > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
                            <div>
                                <span className="text-sm font-medium text-slate-600">Gecikmiş</span>
                                <span className="text-[10px] text-rose-500 font-bold ml-2">{overdueStats.count} ödeme</span>
                            </div>
                            <span className="text-sm font-black text-rose-600">{overdueStats.totalAmount.toLocaleString("tr-TR")} ₺</span>
                        </div>
                    )}
                    {hasRevenue && (
                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Randevu Başı Ort.</span>
                            <span className="text-sm font-bold text-slate-700">
                                {kpis.avgRevenuePerAppt.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </SectionCard>
    );
};

export const AppointmentCapacitySection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    const { trends, capacity } = data;

    const peakHourLabel = capacity.peakHour !== null
        ? `${String(capacity.peakHour).padStart(2, "0")}:00–${String(capacity.peakHour + 1).padStart(2, "0")}:00`
        : "—";

    return (
        <SectionCard id="capacity-section" className="mb-8">
            <SectionHeader
                title="Randevu & Kapasite Analizi"
                subtitle="Yoğunluk haritası ve doluluk trendleri"
                icon={CalendarDays}
                colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" /> Haftalık Dağılım
                    </h4>
                    <div className="h-[160px]">
                        <DowDistributionChart data={capacity.apptsByDow} />
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-600">En Yoğun Saat</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">{peakHourLabel}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-bold text-slate-600">En Yoğun Gün</span>
                            </div>
                            <span className="text-xs font-black text-slate-700">{capacity.peakDow ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-bold text-slate-600">Günlük Ort. Randevu</span>
                            </div>
                            <span className="text-xs font-black text-slate-700">{capacity.avgDailyAppts}</span>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Günlük Randevu Trendi</h4>
                        <div className="h-[170px]">
                            <AppointmentVolumeChart data={trends.appointmentTrend} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500" /> Saatlik Yoğunluk
                        </h4>
                        <div className="h-[140px]">
                            <CapacityHeatmap data={capacity.apptsByHour} />
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// Merged doctor section: bar chart + full table
export const DoctorPerformanceSection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    const { doctorPerformance } = data;

    if (doctorPerformance.length === 0) {
        return (
            <SectionCard id="doctor-section" className="mb-8">
                <SectionHeader
                    title="Hekim Performansı"
                    subtitle="Hekim bazlı gelir, randevu ve verimlilik sıralaması"
                    icon={Award}
                    colorClass="bg-violet-50 border-violet-100 text-violet-600"
                />
                <p className="text-sm text-slate-400 italic text-center py-8">Bu dönemde hekim verisi yok.</p>
            </SectionCard>
        );
    }

    const sorted = [...doctorPerformance].sort((a, b) => b.revenue - a.revenue);
    const topRevenue = sorted[0]?.revenue ?? 1;

    return (
        <SectionCard id="doctor-section" className="mb-8">
            <SectionHeader
                title="Hekim Performansı"
                subtitle="Hekim bazlı gelir, randevu ve verimlilik sıralaması"
                icon={Award}
                colorClass="bg-violet-50 border-violet-100 text-violet-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Bar chart */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" /> Gelir Dağılımı
                    </h4>
                    <DoctorRevenueChart data={sorted} />
                </div>
                {/* Summary cards */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Hızlı Özet</h4>
                    {sorted.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-black text-violet-600 shrink-0">
                                {doc.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{doc.name}</div>
                                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-400 rounded-full transition-all"
                                        style={{ width: `${topRevenue > 0 ? (doc.revenue / topRevenue) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-sm font-black text-slate-900">{doc.revenue.toLocaleString("tr-TR")} ₺</div>
                                <div className="text-[10px] text-slate-400">{doc.appointments} randevu</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full merged table */}
            <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Detaylı Sıralama</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hekim</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Randevu</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gelme Oranı</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gelmeme</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İptal</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Gelir</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ort./Randevu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sorted.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 font-bold text-slate-900">{doc.name}</td>
                                    <td className="py-3 text-right font-semibold text-slate-600">{doc.appointments}</td>
                                    <td className="py-3 text-right font-bold text-emerald-600">%{Math.max(0, 100 - doc.noShowRate - doc.cancelledRate).toFixed(1)}</td>
                                    <td className="py-3 text-right text-sm">
                                        <span className={doc.noShowRate > 10 ? "font-bold text-rose-600" : "font-medium text-slate-500"}>
                                            %{doc.noShowRate.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right text-sm">
                                        <span className={doc.cancelledRate > 15 ? "font-bold text-amber-600" : "font-medium text-slate-500"}>
                                            %{doc.cancelledRate.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right font-black text-slate-900">{doc.revenue.toLocaleString("tr-TR")} ₺</td>
                                    <td className="py-3 text-right font-semibold text-slate-500">
                                        {doc.avgRevenuePerAppt > 0 ? `${doc.avgRevenuePerAppt.toLocaleString("tr-TR")} ₺` : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </SectionCard>
    );
};

export const PatientAnalyticsSection = ({ data }: { data: ReportData }) => {
    if (!data) return null;
    const { kpis, trends, patientDemographics, retention } = data;

    const genderLabels: Record<string, string> = {
        male: "Erkek", female: "Kadın", other: "Diğer",
        erkek: "Erkek", kadın: "Kadın", Erkek: "Erkek", Kadın: "Kadın",
    };
    const genderColors: Record<string, string> = {
        male: "bg-blue-500", female: "bg-pink-500", other: "bg-slate-400",
        erkek: "bg-blue-500", kadın: "bg-pink-500", Erkek: "bg-blue-500", Kadın: "bg-pink-500",
    };
    const genderEntries = Object.entries(patientDemographics.genderMap)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

    const ageEntries = Object.entries(patientDemographics.ageGroups).filter(([, v]) => v > 0);
    const maxAge = Math.max(...Object.values(patientDemographics.ageGroups), 1);

    const retentionRate = retention.totalDistinctWithAppts > 0
        ? Math.round((retention.returningCount / retention.totalDistinctWithAppts) * 100)
        : 0;

    return (
        <SectionCard id="patient-section" className="mb-8">
            <SectionHeader
                title="Hasta Analitiği"
                subtitle="Yeni hasta kazanımı, geri dönüş oranı ve demografik veriler"
                icon={Users}
                colorClass="bg-blue-50 border-blue-100 text-blue-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: KPIs + retention + gender + age */}
                <div className="space-y-4">
                    {/* New patients + retention */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/40 text-center">
                            <div className="text-3xl font-black text-blue-600 mb-0.5">{kpis.newPatients}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Yeni Hasta<br />(Kayıt)</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-violet-50/40 border border-violet-100/40 text-center">
                            <div className="text-3xl font-black text-violet-600 mb-0.5">%{retentionRate}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-tight">Geri Dönüş<br />Oranı</div>
                        </div>
                    </div>

                    {retention.totalDistinctWithAppts > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-violet-50/50 border border-violet-100/50">
                                <span className="text-xs font-bold text-slate-600">Tekrar Gelen Hasta</span>
                                <span className="text-xs font-black text-violet-700">{retention.returningCount}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xs font-bold text-slate-600">İlk Kez Gelenler</span>
                                <span className="text-xs font-black text-slate-700">{retention.firstTimeCount}</span>
                            </div>
                        </div>
                    )}

                    {genderEntries.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cinsiyet Dağılımı</p>
                            {genderEntries.map(([gender, count]) => (
                                <div key={gender} className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${genderColors[gender] ?? "bg-slate-400"}`} />
                                    <span className="text-sm font-medium text-slate-600 flex-1">{genderLabels[gender] ?? gender}</span>
                                    <span className="text-sm font-black text-slate-900">{count}</span>
                                    <span className="text-[10px] text-slate-400 w-8 text-right">
                                        %{patientDemographics.total > 0 ? Math.round((count / patientDemographics.total) * 100) : 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {ageEntries.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yaş Grupları</p>
                            {ageEntries.map(([group, count]) => (
                                <div key={group} className="space-y-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600">{group}</span>
                                        <span className="text-xs font-black text-slate-900">{count}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / maxAge) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: daily trend chart */}
                <div className="lg:col-span-2">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Günlük Yeni Hasta Trendi</h4>
                    <div className="h-[280px]">
                        <PatientGrowthChart data={trends.newPatientTrend} />
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

export const CancellationAnalyticsSection = ({ data }: { data: ReportData }) => {
    if (!data) return null;
    const { kpis, doctorPerformance, trends } = data;

    return (
        <SectionCard id="cancellation-section" className="mb-8">
            <SectionHeader
                title="İptal & Gelmeme Analizi"
                subtitle="Kayıp randevuların nedenleri ve hekim bazlı dağılımı"
                icon={AlertCircle}
                colorClass="bg-rose-50 border-rose-100 text-rose-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                    <div className="p-5 rounded-3xl bg-rose-50/60 border border-rose-100/60">
                        <div className="text-3xl font-black text-rose-600 mb-0.5">%{kpis.noShowRate.toFixed(1)}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gelmeme Oranı</div>
                        <div className="text-xs text-slate-400 mt-1">{kpis.noShowCount} randevu</div>
                    </div>
                    <div className="p-5 rounded-3xl bg-amber-50/60 border border-amber-100/60">
                        <div className="text-3xl font-black text-amber-600 mb-0.5">%{kpis.cancelledRate.toFixed(1)}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">İptal Oranı</div>
                        <div className="text-xs text-slate-400 mt-1">{kpis.cancelledCount} randevu</div>
                    </div>
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                        <div className="text-3xl font-black text-slate-700 mb-0.5">
                            %{(kpis.noShowRate + kpis.cancelledRate).toFixed(1)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toplam Kayıp</div>
                        <div className="text-xs text-slate-400 mt-1">{kpis.noShowCount + kpis.cancelledCount} randevu</div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Gelmeme Oranı Trendi</h4>
                        <div className="h-[140px]">
                            <NoShowTrendChart data={trends.noShowTrend} />
                        </div>
                    </div>
                    {doctorPerformance.filter(d => d.appointments > 0).length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3">Hekim Bazlı Kayıp</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {doctorPerformance.filter(d => d.appointments > 0).map((doc) => (
                                    <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                                            <span className="text-[10px] text-slate-400">{doc.appointments} randevu</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, doc.noShowRate * 3)}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-rose-600">%{doc.noShowRate.toFixed(1)} gelmeme</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, doc.cancelledRate * 3)}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-amber-600">%{doc.cancelledRate.toFixed(1)} iptal</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SectionCard>
    );
};

export const TreatmentPerformanceSection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    const { treatmentStats } = data;

    const hasData = treatmentStats.some(t => t.count > 0);
    const maxRevenue = Math.max(...treatmentStats.map(t => t.revenue), 1);
    const maxCount = Math.max(...treatmentStats.map(t => t.count), 1);

    return (
        <SectionCard id="treatment-section" className="mb-8">
            <SectionHeader
                title="Tedavi Performansı"
                subtitle="En karlı ve en çok yapılan işlemlerin analizi"
                icon={Activity}
                colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
            />
            {!hasData ? (
                <p className="text-sm text-slate-400 italic text-center py-8">Bu dönemde tedavi verisi yok.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedavi</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Adet</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gelir</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ort. Gelir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {treatmentStats.filter(t => t.count > 0).map((item) => (
                                <tr key={item.name} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 font-bold text-slate-900">
                                        <span>{item.name}</span>
                                        <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-32">
                                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                                        </div>
                                    </td>
                                    <td className="py-3 text-center font-black text-slate-900">{item.count}</td>
                                    <td className="py-3 text-right font-bold text-slate-700">
                                        {item.revenue > 0 ? (
                                            <div>
                                                <span>{item.revenue.toLocaleString("tr-TR")} ₺</span>
                                                <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-20 ml-auto">
                                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
                                                </div>
                                            </div>
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="py-3 text-right font-medium text-slate-500 text-sm">
                                        {item.count > 0 && item.revenue > 0
                                            ? `${Math.round(item.revenue / item.count).toLocaleString("tr-TR")} ₺`
                                            : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    );
};

// Kept for backwards compatibility but now empty — doctor tables are merged into DoctorPerformanceSection
export const DetailedTablesSection = ({ data }: { data: ReportData | null }) => {
    if (!data) return null;
    return null;
};
