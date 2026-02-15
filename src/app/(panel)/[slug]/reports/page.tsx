"use client";

import { useRouter, useParams } from "next/navigation";
import { useReports } from "@/hooks/useReports";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { KPICard } from "@/app/components/reports/KPICard";
import { ReportCard } from "@/app/components/reports/ReportCard";
import { StatusByDayChart, ChannelPerformanceChart, OccupancyChart, PatientBreakdownChart } from "@/app/components/reports/Charts";
import { KPIDetailList } from "@/app/components/reports/KPIDetailList";
import { DoctorStatsTable } from "@/app/components/reports/DoctorStatsTable";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

const fmtCurrency = (n: number) => n.toLocaleString("tr-TR") + " ₺";

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const clinic = useClinic();

  const {
    preset, setPreset, todayStr, customStart, setCustomStart, customEnd, setCustomEnd,
    doctorFilter, setDoctorFilter, kpiDetail, setKpiDetail, doctors, loading,
    rangeLabel, filtered, stats, patientNames, chartData, downloadReportCsv
  } = useReports();

  const canDownloadReport = clinic.userRole === UserRole.ADMIN || clinic.userRole === UserRole.SUPER_ADMIN;

  const kpiDetailTitle: Record<string, string> = {
    completed: "Tamamlanan Randevular",
    cancelled_noshow: "İptal Edilen / Gelmedi Randevular",
    unpaid: "Ödemesi Girilmemiş Randevular",
  };

  const kpiDetailList = (() => {
    if (!kpiDetail) return [];
    let list: typeof filtered = [];
    if (kpiDetail === "completed") list = filtered.filter(a => a.status === "completed");
    else if (kpiDetail === "cancelled_noshow") list = filtered.filter(a => a.status === "cancelled" || a.status === "no_show");
    else if (kpiDetail === "unpaid") {
      const idsSet = new Set(stats.unpaidCompletedIds);
      list = filtered.filter(a => idsSet.has(a.id));
    }
    return list.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  })();

  return (
    <div className="space-y-5 max-w-5xl mx-auto w-full italic-none">
      {/* GLOBAL KONTROLLER */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 shadow-sm border border-indigo-200">
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">Raporlar & Analitik</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{rangeLabel}</p>
            </div>
          </div>
          {canDownloadReport && (
            <button onClick={downloadReportCsv} disabled={loading} className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50">
              CSV İndir
            </button>
          )}
        </div>

        <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border-2 border-slate-100 bg-slate-50 p-1">
              {(['today', '7d', '30d', 'custom'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setPreset(k)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${preset === k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {k === 'today' ? 'Bugün' : k === '7d' ? '7 Gün' : k === '30d' ? '30 Gün' : 'Özel'}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <PremiumDatePicker value={customStart} onChange={setCustomStart} today={todayStr} compact />
                <span className="text-slate-300">-</span>
                <PremiumDatePicker value={customEnd} onChange={setCustomEnd} today={todayStr} compact />
              </div>
            )}
          </div>
          <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all">
            <option value="ALL">Tüm Doktorlar</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm font-bold text-slate-400 animate-pulse">
          Veriler yükleniyor...
        </div>
      )}

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard value={String(stats.total)} label="Toplam Randevu" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} iconBg="from-indigo-500 to-indigo-600" valueColor="text-slate-900" />
        <KPICard value={String(stats.completed)} label="Tamamlanan" active={kpiDetail === 'completed'} onClick={() => setKpiDetail(kpiDetail === 'completed' ? null : 'completed')} icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M5 13l4 4L19 7" /></svg>} iconBg="from-emerald-500 to-emerald-600" valueColor="text-emerald-700" />
        <KPICard value={String(stats.cancelledNoShow)} label="İptal/Gelmedi" active={kpiDetail === 'cancelled_noshow'} onClick={() => setKpiDetail(kpiDetail === 'cancelled_noshow' ? null : 'cancelled_noshow')} icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>} iconBg="from-rose-500 to-rose-600" valueColor="text-rose-700" />
        <KPICard value={`%${stats.occupancyPct}`} label="Doluluk Oranı" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} iconBg="from-amber-500 to-amber-600" valueColor="text-amber-700" />
        <KPICard value={fmtCurrency(stats.paidTotal)} label="Net Tahsilat" icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} iconBg="from-teal-500 to-teal-600" valueColor="text-teal-700" small />
        <KPICard value={String(stats.unpaidCompletedCount)} label="Ödeme Bekleyen" active={kpiDetail === 'unpaid'} onClick={() => setKpiDetail(kpiDetail === 'unpaid' ? null : 'unpaid')} icon={<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} iconBg="from-violet-500 to-violet-600" valueColor="text-violet-700" />
      </div>

      {kpiDetail && kpiDetailList.length > 0 && (
        <KPIDetailList
          data={kpiDetailList}
          patientNames={patientNames}
          doctors={doctors}
          title={kpiDetailTitle[kpiDetail]}
          onClose={() => setKpiDetail(null)}
          onItemClick={(date) => router.push(`/${slug}/appointment-management?date=${date}`)}
          isUnpaid={kpiDetail === 'unpaid'}
        />
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ReportCard title="Randevu Durum Analizi" icon={<svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} iconBg="bg-indigo-50">
            <StatusByDayChart data={chartData.statusByDay} />
          </ReportCard>

          <ReportCard title="Kanal Performansı" icon={<svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} iconBg="bg-emerald-50">
            <ChannelPerformanceChart data={chartData.channelData} />
          </ReportCard>

          <ReportCard title="Doluluk Trendi" icon={<svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>} iconBg="bg-violet-50">
            <OccupancyChart data={chartData.occupancyByDay} />
          </ReportCard>

          <ReportCard title="Hasta Portföyü" icon={<svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} iconBg="bg-teal-50">
            <PatientBreakdownChart data={chartData.patientBreakdown} total={chartData.patientBreakdown.reduce((sum, item) => sum + item.value, 0)} />
          </ReportCard>

          <div className="md:col-span-2">
            <ReportCard title="Doktor Bazlı Performans Özeti" icon={<svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} iconBg="bg-slate-100">
              <DoctorStatsTable data={chartData.doctorStats} />
            </ReportCard>
          </div>
        </div>
      )}
    </div>
  );
}
