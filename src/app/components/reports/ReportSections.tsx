"use client";

import React from "react";
import {
    TrendingUp, TrendingDown, Users, Calendar, Banknote,
    Clock, AlertCircle, CheckCircle2, Award, PieChart, BarChart3,
    CalendarDays, Activity
} from "lucide-react";
import {
    RevenueTrendChart,
    AppointmentVolumeChart,
    DoctorRevenueChart,
    TreatmentDistributionChart,
    CapacityHeatmap,
    PatientGrowthChart,
    NoShowTrendChart
} from "./Charts";

export interface ReportData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kpis: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trends: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treatmentStats: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doctorPerformance: any[];
}

export interface DoctorPerformanceItem {
    id: string;
    name: string;
    appointments: number;
    revenue: number;
    noShowRate: number;
}

// --- Helper Components ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SectionHeader = ({ title, subtitle, icon: Icon, colorClass }: { title: string, subtitle?: string, icon: any, colorClass: string }) => (
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

const SectionCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 ${className}`}>
        {children}
    </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MetricCard = ({ label, value, subtext, trend, icon: Icon, color }: { label: string, value: string | number, subtext?: string, trend?: { value: number, up: boolean }, icon: any, color: string }) => (
    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-2 rounded-xl ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    %{trend.value}
                </div>
            )}
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ExecutiveKPISection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { kpis } = data;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
                label="Toplam Gelir"
                value={kpis.totalRevenue.toLocaleString('tr-TR') + " ₺"}
                trend={{ value: 12, up: true }}
                icon={Banknote}
                color="bg-indigo-600 shadow-indigo-100 shadow-lg"
            />
            <MetricCard
                label="Randevu Sayısı"
                value={kpis.totalAppointments}
                trend={{ value: 5, up: true }}
                icon={Calendar}
                color="bg-emerald-500 shadow-emerald-100 shadow-lg"
            />
            <MetricCard
                label="Yeni Hastalar"
                value={kpis.newPatients}
                trend={{ value: 8, up: true }}
                icon={Users}
                color="bg-violet-500 shadow-violet-100 shadow-lg"
            />
            <MetricCard
                label="Gelmeme Oranı"
                value={`%${kpis.noShowRate.toFixed(1)}`}
                trend={{ value: 2, up: false }}
                icon={AlertCircle}
                color="bg-rose-500 shadow-rose-100 shadow-lg"
            />
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RevenueAnalyticsSection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { trends, kpis, treatmentStats, doctorPerformance } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="Gelir Analitiği"
                subtitle="Klinik gelir kalemleri ve performans trendleri"
                icon={TrendingUp}
                colorClass="bg-indigo-50 border-indigo-100 text-indigo-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="h-[350px] w-full">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500" /> Zaman Serisi Gelir Trendi
                        </h4>
                        <RevenueTrendChart data={trends.revenueTrend} />
                    </div>
                </div>
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-indigo-500" /> Tedavi Bazlı Dağılım
                    </h4>
                    <TreatmentDistributionChart data={treatmentStats} />

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alt Toplamlar</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Ödenen Toplam</span>
                                <span className="text-sm font-bold text-emerald-600">+{kpis.collectedPayments.toLocaleString('tr-TR')} ₺</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Bekleyen</span>
                                <span className="text-sm font-bold text-amber-500">{kpis.pendingPayments.toLocaleString('tr-TR')} ₺</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AppointmentCapacitySection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { trends } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="Randevu & Kapasite Analizi"
                subtitle="Yoğunluk haritası ve doluluk trendleri"
                icon={CalendarDays}
                colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-500" /> Yoğunluk Analizi
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Klinik içi en yoğun saatler ve günlerin analizi. Kapasite kullanımını optimize etmek için bu verileri kullanabilirsiniz.
                    </p>
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                        <div className="text-[10px] font-black text-emerald-700 uppercase mb-1 tracking-widest">Öneri</div>
                        <p className="text-xs text-emerald-600 font-medium">Salı günleri öğleden sonra %15 kapasite boşluğu gözlemleniyor.</p>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="h-[350px] w-full">
                        <AppointmentVolumeChart data={trends.appointmentTrend} />
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DoctorPerformanceSection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { doctorPerformance } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="Hekim Performansı"
                subtitle="Hekim bazlı gelir ve randevu dağılımı"
                icon={Award}
                colorClass="bg-violet-50 border-violet-100 text-violet-600"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" /> Hekim Bazlı Gelir
                    </h4>
                    <DoctorRevenueChart data={doctorPerformance} />
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Hekim Özeti</h4>
                    <div className="space-y-3">
                        {doctorPerformance.map((doc: DoctorPerformanceItem) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-600">
                                        {doc.name.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{doc.name}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{doc.appointments} Randevu</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900">{doc.revenue.toLocaleString('tr-TR')} ₺</div>
                                    <div className={`text-[10px] font-bold ${doc.noShowRate > 10 ? 'text-rose-500' : 'text-emerald-500'}`}>%${doc.noShowRate.toFixed(1)} Gelmeme</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

export const PatientAnalyticsSection = ({ data }: { data: ReportData }) => {
    if (!data) return null;
    const { kpis } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="Hasta Analitiği"
                subtitle="Yeni hasta kazanımı ve demografik veriler"
                icon={Users}
                colorClass="bg-blue-50 border-blue-100 text-blue-600"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
                <div className="p-6 rounded-3xl bg-blue-50/30 border border-blue-100/30 flex flex-col justify-center items-center">
                    <div className="text-4xl font-black text-blue-600 mb-1">{kpis.newPatients}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Bu Dönem Yeni Hasta</div>
                </div>
                <div className="md:col-span-2">
                    <div className="h-[200px] w-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <span className="text-sm text-slate-400 font-medium italic">Zaman içerisinde hasta bazlı detaylı analitik aktif edilecek.</span>
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

export const CancellationAnalyticsSection = ({ data }: { data: ReportData }) => {
    if (!data) return null;
    const { kpis, doctorPerformance } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="İptal & Gelmeme Analizi"
                subtitle="Kayıp randevuların nedenleri ve hoca bazlı dağılımı"
                icon={AlertCircle}
                colorClass="bg-rose-50 border-rose-100 text-rose-600"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 flex flex-col justify-center gap-4">
                    <div className="p-6 rounded-3xl bg-rose-50/50 border border-rose-100/50">
                        <div className="text-3xl font-black text-rose-600 mb-1">%{kpis.noShowRate.toFixed(1)}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gelmeme Oranı</div>
                    </div>
                </div>
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {doctorPerformance.filter((d: DoctorPerformanceItem) => d.noShowRate > 0).map((doc: DoctorPerformanceItem) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <span className="text-sm font-bold text-slate-700">{doc.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-rose-500"
                                            style={{ width: `${Math.min(100, doc.noShowRate * 2)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-rose-600">%{doc.noShowRate.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TreatmentPerformanceSection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { treatmentStats } = data;

    return (
        <SectionCard className="mb-8">
            <SectionHeader
                title="Tedavi Performansı"
                subtitle="En karlı ve en çok yapılan işlemlerin analizi"
                icon={Activity}
                colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {treatmentStats.slice(0, 6).map((item: any) => (
                    <div key={item.name} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all text-center">
                        <div className="text-lg font-black text-slate-900 mb-1">{item.count}</div>
                        <div className="text-[10px] font-bold text-slate-500 leading-tight truncate w-full px-1">{item.name}</div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DetailedTablesSection = ({ data }: { data: any }) => {
    if (!data) return null;
    const { doctorPerformance, treatmentStats } = data;

    return (
        <div className="space-y-8">
            <SectionCard>
                <SectionHeader
                    title="Hekim Sıralaması"
                    subtitle="Performans ve verimlilik sıralaması"
                    icon={Award}
                    colorClass="bg-indigo-50 border-indigo-100 text-indigo-600"
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hekim</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Randevu</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gelme Oranı</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Gelir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {doctorPerformance.map((doc: any) => (
                                <tr key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-bold text-slate-900">{doc.name}</td>
                                    <td className="py-4 text-right font-semibold text-slate-600">{doc.appointments}</td>
                                    <td className="py-4 text-right font-bold text-emerald-600">%{(100 - doc.noShowRate).toFixed(1)}</td>
                                    <td className="py-4 text-right font-black text-slate-900">{doc.revenue.toLocaleString('tr-TR')} ₺</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <SectionCard>
                <SectionHeader
                    title="Tedavi Dağılımı"
                    subtitle="En çok tercih edilen işlemler"
                    icon={Activity}
                    colorClass="bg-emerald-50 border-emerald-100 text-emerald-600"
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedavi</th>
                                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Adet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {treatmentStats.map((treat: any) => (
                                <tr key={treat.name} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 font-bold text-slate-900">{treat.name}</td>
                                    <td className="py-4 text-right font-black text-slate-900">{treat.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    )
}
