"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePaymentManagement } from "@/hooks/usePaymentManagement";
import { PaymentStats } from "@/app/components/payments/PaymentStats";
import { PaymentList } from "@/app/components/payments/PaymentList";
import { NewPaymentModal, PaymentDetailModal } from "@/app/components/payments/PaymentModals";
import { DayCloseModal } from "@/app/components/payments/DayCloseModal";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";
import { PaymentProjection } from "@/app/components/payments/PaymentProjection";
import { PaymentAgingReport } from "@/app/components/payments/PaymentAgingReport";
import { PAYMENT_METHODS, PAYMENT_STATUS_LABELS, normalizePaymentStatus, PaymentStatus } from "@/constants/payments";
import { PaymentRow, AppointmentOption, UpdatePaymentExtras } from "@/hooks/usePaymentManagement";
import { useClinic } from "@/app/context/ClinicContext";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium animate-pulse italic">Yükleniyor...</div>}>
      <PaymentsInner />
    </Suspense>
  );
}

function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // Tırnak içine al: içinde virgül, tırnak veya satırsonu varsa zorunlu, diğerleri için de güvenli
  return `"${str.replace(/"/g, '""')}"`;
}

function exportToCSV(payments: PaymentRow[]) {
  const headers = ["Fiş No", "Hasta", "Telefon", "Tutar (₺)", "Yöntem", "Durum", "Vade", "İskonto", "Sigorta", "Not"];
  const rows = payments.map(p => [
    p.receipt_number ?? "",
    p.patient?.full_name ?? "",
    p.patient?.phone ?? "",
    p.amount,
    p.method ?? "",
    PAYMENT_STATUS_LABELS[normalizePaymentStatus(p.status)],
    p.due_date ?? "",
    p.discount_amount ?? "",
    p.insurance_company ?? "",
    p.note ?? "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `odemeler-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ClosingRecord {
  id: string;
  closing_date: string;
  closed_at: string;
  payment_count: number;
  calc_total: number;
  actual_nakit: number;
  actual_kart: number;
  actual_havale: number;
  actual_diger: number;
  diff_total: number;
  notes: string | null;
  users?: { full_name: string | null } | null;
}

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PaymentsInner() {
  const clinic = useClinic();
  const searchParams = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");
  const [dayCloseOpen, setDayCloseOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [closings, setClosings] = useState<ClosingRecord[]>([]);
  const [closingsLoading, setClosingsLoading] = useState(false);

  async function loadHistory() {
    setClosingsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/daily-closing/history?limit=30", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setClosings(json.closings ?? []);
      }
    } finally {
      setClosingsLoading(false);
    }
  }

  function handleToggleHistory() {
    if (!historyOpen && closings.length === 0) loadHistory();
    setHistoryOpen(v => !v);
  }

  const {
    today, listSearch, setListSearch, statusFilter, setStatusFilter, methodFilter, setMethodFilter,
    modalPatientSearch, setModalPatientSearch,
    modalAppointments, modalAppointmentsLoading, selectedAppointmentId, setSelectedAppointmentId,
    selectedDate, setSelectedDate, startDate, setStartDate, endDate, setEndDate,
    loading, bulkLoading, error, setError: setHookError, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
    viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
    detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
    filteredPayments, stats, handleUpdateStatus, handleQuickCollect, handleDelete, openDetail, refresh,
    selectedIds, toggleSelectId, selectAll, deselectIds, clearSelection, handleBulkCollect
  } = usePaymentManagement(appointmentIdParam);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage, setCurrentPage]);
  const currentPagePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allCurrentSelected = currentPagePayments.length > 0 && currentPagePayments.every(p => selectedIds.has(p.id));

  const statusOptions = [
    { value: "all", label: "Tüm Durumlar" },
    { value: "pending", label: "Beklemede" },
    { value: "paid", label: "Ödendi" },
    { value: "partial", label: "Kısmi" },
    { value: "cancelled", label: "İptal" },
  ];

  const handleSelectAll = () => {
    const currentIds = currentPagePayments.map(p => p.id);
    if (allCurrentSelected) {
      // Sadece bu sayfadakileri seçimden çıkar, diğer sayfalardakiler kalır
      deselectIds(currentIds);
    } else {
      selectAll(currentIds);
    }
  };

  const handleBulkExport = () => {
    const toExport = selectedIds.size > 0
      ? filteredPayments.filter(p => selectedIds.has(p.id))
      : filteredPayments;
    exportToCSV(toExport);
  };

  return (
    <div className="space-y-6 pb-20 italic-none">

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm font-semibold text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      <PaymentStats stats={stats} />
      <PaymentProjection payments={filteredPayments} today={today} />
      <PaymentAgingReport payments={filteredPayments} today={today} />

      {/* Tools */}
      <div className="bg-white p-4 rounded-3xl border shadow-sm space-y-4 lg:space-y-0 relative z-20">
        <div className="flex flex-col 2xl:flex-row gap-4 2xl:items-center justify-between">

          {/* Left: View Mode Tabs & Date Pickers */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">

            {/* View Mode Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 list-none shrink-0 overflow-x-auto no-scrollbar max-w-full">
              {(["day", "week", "month", "range"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setViewMode(m); setCurrentPage(1); }}
                  style={{ 
                    backgroundColor: viewMode === m ? 'white' : 'transparent',
                    color: viewMode === m ? 'var(--brand-from)' : '#64748b'
                  }}
                  className={`w-max whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${viewMode === m ? 'shadow-sm ring-1 ring-black/5' : 'hover:text-slate-800 hover:bg-slate-200/50'}`}
                >
                  {m === 'day' ? 'Gün' : m === 'week' ? 'Hafta' : m === 'month' ? 'Ay' : 'Özel'}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto pb-1 xl:pb-0 z-40">
              {viewMode === 'range' ? (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-max shrink-0">
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">Başlangıç</span>
                    <PremiumDatePicker compact value={startDate} onChange={(d) => { setStartDate(d); setCurrentPage(1); }} today={today} />
                  </div>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <div className="flex items-center gap-2 pr-1">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase">Bitiş</span>
                    <PremiumDatePicker compact value={endDate} onChange={(d) => { setEndDate(d); setCurrentPage(1); }} today={today} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 shrink-0">
                  <PremiumDatePicker value={selectedDate} onChange={(d) => { setSelectedDate(d); setCurrentPage(1); }} today={today} />
                  <button
                    onClick={() => { setSelectedDate(today); setCurrentPage(1); }}
                    style={{ '--brand-from-15': 'var(--brand-from)26' } as React.CSSProperties}
                    className="h-[42px] px-6 rounded-xl border-2 border-slate-100 bg-white text-[10px] font-black text-slate-600 hover:bg-[var(--brand-from-15)] hover:text-[var(--brand-from)] hover:border-[var(--brand-from-15)] active:scale-95 transition-all uppercase tracking-widest"
                  >
                    Bugün
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right: Filters, Search & Add Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full 2xl:w-auto mt-2 2xl:mt-0">
 
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ '--focus-border-color': 'var(--brand-from)' } as React.CSSProperties}
              className="h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-[11px] font-bold text-slate-600 focus:bg-white focus:border-[var(--focus-border-color)] outline-none transition-all shrink-0"
            >
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
 
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              style={{ '--focus-border-color': 'var(--brand-from)' } as React.CSSProperties}
              className="h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-[11px] font-bold text-slate-600 focus:bg-white focus:border-[var(--focus-border-color)] outline-none transition-all shrink-0"
            >
              <option value="all">Tüm Yöntemler</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
 
            {/* Search */}
            <div className="relative flex-1 sm:w-60 group max-w-full">
              <svg 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--focus-color)] transition-colors" 
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                style={{ '--focus-color': 'var(--brand-from)' } as React.CSSProperties}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={listSearch}
                onChange={(e) => { setListSearch(e.target.value); setCurrentPage(1); }}
                style={{ '--focus-border-color': 'var(--brand-from)' } as React.CSSProperties}
                className="w-full h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 pl-11 pr-4 text-[11px] font-bold focus:bg-white focus:border-[var(--focus-border-color)] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                placeholder="İsim, telefon veya fiş no..."
              />
            </div>

            {/* CSV Export */}
            <button
              onClick={handleBulkExport}
              title="CSV olarak dışa aktar"
              className="h-[42px] w-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>

            <button
              onClick={() => setDayCloseOpen(true)}
              title="Gün Sonu Kasa Kapatma"
              style={{ '--brand-from-15': 'var(--brand-from)26' } as React.CSSProperties}
              className="h-[42px] px-4 rounded-xl border-2 border-slate-200 bg-white text-[10px] font-black text-slate-700 hover:bg-[var(--brand-from-15)] hover:text-[var(--brand-from)] hover:border-[var(--brand-from-15)] active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 uppercase tracking-widest"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <span className="hidden sm:inline">Gün Sonu</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{ 
                background: `linear-gradient(to right, var(--brand-from), var(--brand-to))`,
                boxShadow: `0 10px 15px -3px var(--brand-from)33`
              }}
              className="w-full sm:w-auto h-[42px] rounded-xl px-6 text-[10px] font-black text-white hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 uppercase tracking-widest"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Yeni Ödeme Kaydı</span>
            </button>
          </div>

        </div>
      </div>

      {/* Active filter chips */}
      {(statusFilter !== "all" || methodFilter !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtreler:</span>
          {statusFilter !== "all" && (
            <button 
              onClick={() => setStatusFilter("all")} 
              style={{ '--brand-from-10': 'var(--brand-from)1a' } as React.CSSProperties}
              className="flex items-center gap-1 px-2.5 py-1 bg-[var(--brand-from-10)] border border-[var(--brand-from-10)] text-[var(--brand-from)] rounded-lg text-[10px] font-bold hover:brightness-95 transition-colors"
            >
              {statusOptions.find(o => o.value === statusFilter)?.label}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          {methodFilter !== "all" && (
            <button 
              onClick={() => setMethodFilter("all")} 
              style={{ '--brand-from-10': 'var(--brand-from)1a' } as React.CSSProperties}
              className="flex items-center gap-1 px-2.5 py-1 bg-[var(--brand-from-10)] border border-[var(--brand-from-10)] text-[var(--brand-from)] rounded-lg text-[10px] font-bold hover:brightness-95 transition-colors"
            >
              {methodFilter}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}

      {/* Main List */}
      <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_6rem_5.5rem_6rem] gap-4 items-center px-5 py-3 bg-slate-50/50 border-b text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          <div
            onClick={handleSelectAll}
            style={{ 
                backgroundColor: allCurrentSelected ? 'var(--brand-from)' : 'transparent',
                borderColor: allCurrentSelected ? 'var(--brand-from)' : '#cbd5e1'
            }}
            className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${!allCurrentSelected ? "hover:border-slate-400" : ""}`}
          >
            {allCurrentSelected && (
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
          <span>Hasta Bilgisi</span>
          <span>Tutar & Tahsilat</span>
          <span>Durum</span>
          <span className="text-right">Vade</span>
          <span />
        </div>
        <div className="sm:hidden grid grid-cols-[auto_2fr_1fr_auto] gap-2 items-center px-4 py-3 bg-slate-50/50 border-b text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          <div
            onClick={handleSelectAll}
            style={{ 
                backgroundColor: allCurrentSelected ? 'var(--brand-from)' : 'transparent',
                borderColor: allCurrentSelected ? 'var(--brand-from)' : '#cbd5e1'
            }}
            className="h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors"
          />
          <span>Hasta</span>
          <span className="text-center">Tutar</span>
          <span className="text-right">Durum</span>
        </div>

        <PaymentList
          payments={currentPagePayments}
          loading={loading}
          today={today}
          onPaymentClick={openDetail}
          onQuickCollect={handleQuickCollect}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelectId}
        />

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/20">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">Sayfa {currentPage} / {totalPages} · {filteredPayments.length} Kayıt</p>
            <div className="flex gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-white border border-slate-200 shadow-xl shadow-slate-200/60 px-3 py-2 rounded-2xl animate-in slide-in-from-bottom-4 duration-200">
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 border border-teal-100 rounded-xl mr-1">
            <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[11px] font-black text-teal-700">{selectedIds.size} seçili</span>
          </div>

          {/* Toplu Tahsil Et */}
          <button
            onClick={handleBulkCollect}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl text-[10px] font-black text-white transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {bulkLoading ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
            {bulkLoading ? "İşleniyor..." : "Toplu Tahsil Et"}
          </button>

          {/* CSV */}
          <button
            onClick={() => exportToCSV(filteredPayments.filter(p => selectedIds.has(p.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-[10px] font-black text-slate-700 transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>

          {/* İptal */}
          <button
            onClick={clearSelection}
            title="Seçimi temizle"
            className="flex items-center justify-center h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-700 transition-all ml-0.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Modals
        isModalOpen={isModalOpen} closeModal={closeModal}
        selectedAppointmentId={selectedAppointmentId} setSelectedAppointmentId={setSelectedAppointmentId}
        modalPatientSearch={modalPatientSearch} setModalPatientSearch={setModalPatientSearch}
        modalAppointments={modalAppointments} modalAppointmentsLoading={modalAppointmentsLoading}
        isDetailModalOpen={isDetailModalOpen} setIsDetailModalOpen={setIsDetailModalOpen}
        selectedPayment={selectedPayment} detailStatus={detailStatus} setDetailStatus={setDetailStatus}
        detailAmount={detailAmount} setDetailAmount={setDetailAmount} detailMethod={detailMethod} setDetailMethod={setDetailMethod}
        handleUpdateStatus={handleUpdateStatus} handleDelete={handleDelete}
        operationError={error} onClearError={() => setHookError(null)}
        onPaymentSuccess={refresh}
      />

      {/* Geçmiş Kapanışlar */}
      <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
        <button
          onClick={handleToggleHistory}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div 
              style={{ background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` }}
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-indigo-100"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A4.833 4.833 0 0 1 18 10.5c-2.484 0-4.5-2.015-4.5-4.5A4.833 4.833 0 0 1 13.5 3h-3c0 1.104-.896 2-2 2s-2-.896-2-2h-3C3.5 3 3.5 3 3.5 3z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-900">Geçmiş Kasa Kapanışları</p>
              <p className="text-[10px] font-semibold text-slate-400">Son 30 günlük kapanış geçmişi</p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${historyOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {historyOpen && (
          <div className="border-t border-slate-100">
            {closingsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-semibold animate-pulse">
                Yükleniyor...
              </div>
            ) : closings.length === 0 ? (
              <div className="py-10 text-center text-sm font-semibold text-slate-400">
                Henüz kapanış kaydı bulunmuyor.
              </div>
            ) : (
              <>
                {/* Desktop header */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2.5 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Tarih</span>
                  <span className="text-right">Sistem Toplam</span>
                  <span className="text-right">Sayılan Toplam</span>
                  <span className="text-right">Fark</span>
                  <span>Kapatan</span>
                  <span />
                </div>
                <div className="divide-y divide-slate-100">
                  {closings.map(c => {
                    const actualTotal = c.actual_nakit + c.actual_kart + c.actual_havale + c.actual_diger;
                    const hasDiff = c.diff_total !== 0;
                    const dateLabel = new Date(c.closing_date + "T12:00:00").toLocaleDateString("tr-TR", {
                      day: "numeric", month: "short", year: "numeric", weekday: "short",
                    });
                    const closedAt = new Date(c.closed_at).toLocaleTimeString("tr-TR", {
                      timeZone: "Asia/Istanbul", hour: "2-digit", minute: "2-digit",
                    });
                    return (
                      <div key={c.id} className="px-6 py-3 grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 sm:gap-4 items-center text-sm">
                        <div>
                          <p className="font-bold text-slate-800">{dateLabel}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{closedAt} · {c.payment_count} tahsilat</p>
                        </div>
                        <p className="sm:text-right font-mono text-slate-600">
                          <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Sistem:</span>
                          {fmt(c.calc_total)} ₺
                        </p>
                        <p className="sm:text-right font-mono font-bold text-slate-900">
                          <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Sayılan:</span>
                          {fmt(actualTotal)} ₺
                        </p>
                        <p className={`sm:text-right font-mono font-bold ${hasDiff ? (c.diff_total > 0 ? "text-emerald-600" : "text-rose-600") : "text-slate-400"}`}>
                          <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Fark:</span>
                          {hasDiff ? `${c.diff_total > 0 ? "+" : ""}${fmt(c.diff_total)} ₺` : "—"}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">
                          {(c.users as { full_name: string | null } | null)?.full_name ?? "—"}
                        </p>
                        {hasDiff && c.notes ? (
                          <div className="col-span-full sm:col-span-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 truncate" title={c.notes}>
                            💬 {c.notes}
                          </div>
                        ) : <div />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <DayCloseModal open={dayCloseOpen} onClose={() => { setDayCloseOpen(false); if (historyOpen) { setClosings([]); loadHistory(); } }} />
    </div>
  );
}

interface ModalsProps {
  isModalOpen: boolean;
  closeModal: () => void;
  selectedAppointmentId: string;
  setSelectedAppointmentId: (v: string) => void;
  modalPatientSearch: string;
  setModalPatientSearch: (v: string) => void;
  modalAppointments: AppointmentOption[];
  modalAppointmentsLoading: boolean;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (v: boolean) => void;
  selectedPayment: PaymentRow | null;
  detailStatus: PaymentStatus;
  setDetailStatus: (v: PaymentStatus) => void;
  detailAmount: string;
  setDetailAmount: (v: string) => void;
  detailMethod: string;
  setDetailMethod: (v: string) => void;
  handleUpdateStatus: (extras?: UpdatePaymentExtras) => void;
  handleDelete: () => void;
  operationError: string | null;
  onClearError: () => void;
  onPaymentSuccess: () => void;
}

function Modals({
  isModalOpen, closeModal,
  selectedAppointmentId, setSelectedAppointmentId,
  modalPatientSearch, setModalPatientSearch,
  modalAppointments, modalAppointmentsLoading,
  isDetailModalOpen, setIsDetailModalOpen, selectedPayment, detailStatus, setDetailStatus,
  detailAmount, setDetailAmount, detailMethod, setDetailMethod, handleUpdateStatus, handleDelete,
  operationError, onClearError, onPaymentSuccess
}: ModalsProps) {
  return (
    <>
      <NewPaymentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={onPaymentSuccess}
        selectedAppointmentId={selectedAppointmentId}
        setSelectedAppointmentId={setSelectedAppointmentId}
        modalPatientSearch={modalPatientSearch}
        setModalPatientSearch={setModalPatientSearch}
        modalAppointments={modalAppointments}
        modalAppointmentsLoading={modalAppointmentsLoading}
      />

      <PaymentDetailModal
        isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}
        payment={selectedPayment} status={detailStatus} setStatus={setDetailStatus}
        amount={detailAmount} setAmount={setDetailAmount} method={detailMethod} setMethod={setDetailMethod}
        onUpdate={handleUpdateStatus} onCancel={handleDelete}
        operationError={operationError} onClearError={onClearError}
      />
    </>
  );
}
