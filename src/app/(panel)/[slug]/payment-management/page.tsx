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
    selectedDate, setSelectedDate, amount, setAmount, method, setMethod, status, setStatus, note, setNote,
    loading, saving, error, isModalOpen, setIsModalOpen, closeModal, currentPage, setCurrentPage,
    viewMode, setViewMode, selectedPayment, isDetailModalOpen, setIsDetailModalOpen,
    detailStatus, setDetailStatus, detailAmount, setDetailAmount, detailMethod, setDetailMethod,
    filteredPayments, stats, handleSave, handleUpdateStatus, handleDelete, openDetail
  } = usePaymentManagement(appointmentIdParam);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPagePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6 pb-20 italic-none">

      <PaymentStats stats={stats} />

      {/* Tools */}
      <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-3">
        {/* Row 1: Date & View Mode */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex items-center gap-2 grow sm:grow-0">
            <PremiumDatePicker value={selectedDate} onChange={(d) => { setSelectedDate(d); setCurrentPage(1); }} today={today} />
            <button onClick={() => { setSelectedDate(today); setCurrentPage(1); }} className="h-10 px-4 rounded-xl border bg-slate-50 text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-tight">Bugün</button>
          </div>

          <div className="flex grow sm:grow-0 rounded-xl bg-slate-100 p-1">
            {(["day", "week", "month"] as const).map(m => (
              <button key={m} onClick={() => { setViewMode(m); setCurrentPage(1); }} className={`flex-1 sm:px-5 py-1.5 text-[11px] font-black rounded-lg transition-all uppercase tracking-tight ${viewMode === m ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {m === 'day' ? 'Gün' : m === 'week' ? 'Hafta' : 'Ay'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Add & Search (Responsive) */}
        <div className="flex flex-col sm:flex-row-reverse gap-3 sm:items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto h-11 sm:h-10 rounded-xl bg-emerald-600 px-6 text-[11px] font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap uppercase tracking-widest"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Yeni Ödeme Kaydı</span>
          </button>

          <div className="relative flex-1 group">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              value={listSearch}
              onChange={(e) => { setListSearch(e.target.value); setCurrentPage(1); }}
              className="w-full h-11 sm:h-10 rounded-xl border bg-slate-50 pl-10 pr-4 text-[11px] font-bold focus:bg-white focus:border-emerald-500 outline-none transition-all"
              placeholder="İsim veya telefon ile ara..."
            />
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

      <NewPaymentModal
        isOpen={isModalOpen} onClose={closeModal} onSubmit={handleSave}
        error={error} saving={saving} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        today={today} amount={amount} setAmount={setAmount}
        method={method} setMethod={setMethod} status={status} setStatus={setStatus} note={note} setNote={setNote}
        selectedAppointmentId={selectedAppointmentId} setSelectedAppointmentId={setSelectedAppointmentId}
        modalPatientSearch={modalPatientSearch} setModalPatientSearch={setModalPatientSearch}
        modalAppointments={modalAppointments} modalAppointmentsLoading={modalAppointmentsLoading}
      />

      <PaymentDetailModal
        isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}
        payment={selectedPayment} status={detailStatus} setStatus={setDetailStatus}
        amount={detailAmount} setAmount={setDetailAmount} method={detailMethod} setMethod={setDetailMethod}
        onUpdate={handleUpdateStatus} onDelete={handleDelete}
      />
    </div>
  );
}
