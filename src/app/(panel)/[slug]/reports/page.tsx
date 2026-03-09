"use client";

import React from "react";
import { useParams } from "next/navigation";
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
  DetailedTablesSection,
  type ReportData
} from "@/app/components/reports/ReportSections";
import { Loader2, AlertCircle } from "lucide-react";
import { useClinic } from "@/app/context/ClinicContext";

export default function ReportsPage() {
  const params = useParams();
  const slug = params.slug as string;

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
    analytics
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
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Veriler Derleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* 1. Global Filter Bar (Sticky) */}
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
      />

      <div className="space-y-12 pb-24">
        {/* 2. Executive KPI Overview */}
        <ExecutiveKPISection data={analytics} />

        {/* 3. Revenue Analytics */}
        <div id="revenue-section">
          <RevenueAnalyticsSection data={analytics} />
        </div>

        {/* 4. Appointment & Capacity Analytics */}
        <div id="capacity-section">
          <AppointmentCapacitySection data={analytics} />
        </div>

        {/* 5. Doctor Performance */}
        <div id="doctor-section">
          <DoctorPerformanceSection data={analytics} />
        </div>

        {/* 6. Patient Analytics */}
        <div id="patient-section">
          {analytics && <PatientAnalyticsSection data={analytics as ReportData} />}
        </div>

        {/* 7. Cancellation Analytics */}
        <div id="cancellation-section">
          {analytics && <CancellationAnalyticsSection data={analytics as ReportData} />}
        </div>

        {/* 8. Treatment Analytics */}
        <div id="treatment-section">
          <TreatmentPerformanceSection data={analytics} />
        </div>

        {/* 9. Detailed Tables */}
        <div id="tables-section" className="pt-8 border-t border-slate-100">
          <DetailedTablesSection data={analytics} />
        </div>
      </div>
    </div>
  );
}
