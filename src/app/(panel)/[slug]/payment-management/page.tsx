"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePaymentManagement } from "@/hooks/usePaymentManagement";
import { PaymentStats } from "@/app/components/payments/PaymentStats";
import { PaymentList } from "@/app/components/payments/PaymentList";
import { NewPaymentModal, PaymentDetailModal } from "@/app/components/payments/PaymentModals";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium animate-pulse italic">Yükleniyor...</div>}>
      <PaymentsInner />
    </Suspense>
  );
}

function PaymentsInner() {
  const searchParams = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const {
    today, listSearch, setListSearch, modalPatientSearch, setModalPatientSearch,
    modalAppointments, modalAppointmentsLoading, selectedAppointmentId, setSelectedAppointmentId,
    selectedDate, setSelectedDate, startDate, setStartDate, endDate, setEndDate,
    amount, setAmount, method, setMethod, status, setStatus, note, setNote,
    loading, saving, error, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
    viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
    detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
    filteredPayments, stats, handleUpdateStatus, handleDelete, openDetail
  } = usePaymentManagement(appointmentIdParam);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPagePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6 pb-20 italic-none">

      <PaymentStats stats={stats} />

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
                  className={`w-max whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest ${viewMode === m ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
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
                    className="h-[42px] px-6 rounded-xl border-2 border-slate-100 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 active:scale-95 transition-all uppercase tracking-widest"
                  >
                    Bugün
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right: Search & Add Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full 2xl:w-auto mt-2 2xl:mt-0">
            <div className="relative flex-1 sm:w-72 md:w-80 group max-w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={listSearch}
                onChange={(e) => { setListSearch(e.target.value); setCurrentPage(1); }}
                className="w-full h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 pl-11 pr-4 text-[11px] font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                placeholder="İsim veya telefon ile ara..."
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto h-[42px] rounded-xl bg-emerald-600 px-6 text-[10px] font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 uppercase tracking-widest"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Yeni Ödeme Kaydı</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main List */}
      <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-6 py-3 bg-slate-50/50 border-b text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          <span>Hasta Bilgisi</span>
          <span>Tutar & Tahsilat</span>
          <span>Durum</span>
          <span className="text-right">Vade</span>
        </div>
        <div className="sm:hidden grid grid-cols-[2fr_1fr_auto] gap-2 items-center px-4 py-3 bg-slate-50/50 border-b text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          <span>Hasta</span>
          <span className="text-center">Tutar</span>
          <span className="text-right">Durum</span>
        </div>

        <PaymentList payments={currentPagePayments} loading={loading} onPaymentClick={openDetail} />

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/20">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">Sayfa {currentPage} / {totalPages} · {filteredPayments.length} Kayıt</p>
            <div className="flex gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <Modals
        isModalOpen={isModalOpen} closeModal={closeModal} today={today}
        selectedAppointmentId={selectedAppointmentId} setSelectedAppointmentId={setSelectedAppointmentId}
        modalPatientSearch={modalPatientSearch} setModalPatientSearch={setModalPatientSearch}
        modalAppointments={modalAppointments} modalAppointmentsLoading={modalAppointmentsLoading}
        isDetailModalOpen={isDetailModalOpen} setIsDetailModalOpen={setIsDetailModalOpen}
        selectedPayment={selectedPayment} detailStatus={detailStatus} setDetailStatus={setDetailStatus}
        detailAmount={detailAmount} setDetailAmount={setDetailAmount} detailMethod={detailMethod} setDetailMethod={setDetailMethod}
        handleUpdateStatus={handleUpdateStatus} handleDelete={handleDelete}
        onPaymentSuccess={() => window.location.reload()}
      />
    </div>
  );
}

function Modals({
  isModalOpen, closeModal, today,
  selectedAppointmentId, setSelectedAppointmentId,
  modalPatientSearch, setModalPatientSearch,
  modalAppointments, modalAppointmentsLoading,
  isDetailModalOpen, setIsDetailModalOpen, selectedPayment, detailStatus, setDetailStatus,
  detailAmount, setDetailAmount, detailMethod, setDetailMethod, handleUpdateStatus, handleDelete,
  onPaymentSuccess
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
  return (
    <>
      <NewPaymentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={onPaymentSuccess}
        today={today}
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
        onUpdate={handleUpdateStatus} onDelete={handleDelete}
      />
    </>
  );
}
