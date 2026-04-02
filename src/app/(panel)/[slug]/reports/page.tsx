"use client";

import React, { useState, useCallback } from "react";
import { useReports } from "@/hooks/useReports";
import { GlobalFilterBar } from "@/app/components/reports/GlobalFilterBar";
import {
  ExecutiveKPISection,
  RevenueAnalyticsSection,
  AppointmentCapacitySection,
  DoctorPerformanceSection,
  PatientAnalyticsSection,
  CancellationAnalyticsSection,
  TreatmentPerformanceSection,
  type ReportData,
} from "@/app/components/reports/ReportSections";
import { Loader2, AlertCircle, TrendingUp, CalendarDays, Award, Users, XCircle, Activity } from "lucide-react";
import { useClinic } from "@/app/context/ClinicContext";

const NAV_ITEMS = [
  { id: "revenue-section", label: "Gelir", icon: TrendingUp },
  { id: "capacity-section", label: "Kapasite", icon: CalendarDays },
  { id: "doctor-section", label: "Hekimler", icon: Award },
  { id: "patient-section", label: "Hastalar", icon: Users },
  { id: "cancellation-section", label: "İptal", icon: XCircle },
  { id: "treatment-section", label: "Tedaviler", icon: Activity },
];

function SectionNav() {
  const { themeColorFrom: brandFrom = '#4f46e5' } = useClinic();
  const [active, setActive] = useState<string | null>(null);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 152; // filter bar + section nav height
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  }, []);

  return (
    <div className="sticky top-[120px] z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 -mx-4 px-4 mb-6">
      <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar gap-1 py-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${active === id
              ? "text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            style={active === id ? { background: brandFrom } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const {
    preset, setPreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    doctorFilter, setDoctorFilter,
    treatmentFilter, setTreatmentFilter,
    statusFilter, setStatusFilter,
    doctors,
    treatmentTypes,
    loading,
    rangeLabel,
    analytics,
    refresh,
  } = useReports();

  const { isAdmin } = useClinic();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mx-4">
        <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mb-2">
          <AlertCircle className="h-6 w-6 text-rose-500" />
        </div>
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Yetkisiz Erişim</h2>
        <p className="text-sm text-slate-500 font-medium text-center max-w-xs">
          Raporlar sayfasını yalnızca yönetici yetkisine sahip kullanıcılar görüntüleyebilir.
        </p>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 
          className="w-10 h-10 animate-spin" 
          style={{ color: (useClinic().themeColorFrom || '#4f46e5') }} 
        />
        <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Veriler Derleniyor...</p>
        <p className="text-sm font-bold text-slate-400 animate-pulse tracking-widest">Bu işlem biraz zaman alabilir...</p>
        <p className="text-sm font-bold text-slate-400 animate-pulse tracking-widest">Lütfen bekleyiniz.</p>
      </div>
    );
  }

  const typedAnalytics = analytics as ReportData | null;

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Sticky filter bar */}
      <GlobalFilterBar
        preset={preset}
        setPreset={setPreset}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        doctorFilter={doctorFilter}
        setDoctorFilter={setDoctorFilter}
        treatmentFilter={treatmentFilter}
        setTreatmentFilter={setTreatmentFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        doctors={doctors}
        treatmentTypes={treatmentTypes}
        rangeLabel={rangeLabel}
        loading={loading}
        onRefresh={refresh}
        analytics={typedAnalytics}
      />

      {/* Section navigation */}
      <SectionNav />

      <div className="space-y-12 pb-24">
        {/* Executive KPIs */}
        <ExecutiveKPISection data={typedAnalytics} />

        {/* Revenue Analytics */}
        <RevenueAnalyticsSection data={typedAnalytics} />

        {/* Appointment & Capacity */}
        <AppointmentCapacitySection data={typedAnalytics} />

        {/* Doctor Performance (merged table) */}
        <DoctorPerformanceSection data={typedAnalytics} />

        {/* Patient Analytics */}
        {typedAnalytics && <PatientAnalyticsSection data={typedAnalytics} />}

        {/* Cancellation Analytics */}
        {typedAnalytics && <CancellationAnalyticsSection data={typedAnalytics} />}

        {/* Treatment Performance */}
        <TreatmentPerformanceSection data={typedAnalytics} />
      </div>
    </div>
  );
}
