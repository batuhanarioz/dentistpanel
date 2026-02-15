import React from "react";
import { AppointmentOption, PaymentRow } from "@/hooks/usePaymentManagement";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

interface NewPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    error: string | null;
    saving: boolean;
    selectedDate: string;
    setSelectedDate: (v: string) => void;
    today: string;
    amount: string;
    setAmount: (v: string) => void;
    method: string;
    setMethod: (v: string) => void;
    note: string;
    setNote: (v: string) => void;
    selectedAppointmentId: string;
    setSelectedAppointmentId: (v: string) => void;
    modalPatientSearch: string;
    setModalPatientSearch: (v: string) => void;
    modalAppointments: AppointmentOption[];
    modalAppointmentsLoading: boolean;
}

export function NewPaymentModal({
    isOpen, onClose, onSubmit, error, saving,
    selectedDate, setSelectedDate, today, amount, setAmount, method, setMethod, note, setNote,
    selectedAppointmentId, setSelectedAppointmentId, modalPatientSearch, setModalPatientSearch,
    modalAppointments, modalAppointmentsLoading
}: NewPaymentModalProps) {
    if (!isOpen) return null;

    const PAYMENT_METHODS = ["Nakit", "Kredi Kartı", "Havale / EFT", "POS / Taksit", "Çek", "Diğer"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">Yeni Ödeme Planı</h2>
                                <p className="text-xs text-emerald-100">Tarih: {selectedDate}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
                    {error && (
                        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-4">
                            {error}
                        </p>
                    )}

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">
                                Randevu seç
                            </label>
                            {!selectedAppointmentId ? (
                                <>
                                    <input
                                        value={modalPatientSearch}
                                        onChange={(e) => setModalPatientSearch(e.target.value)}
                                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        placeholder="Ad soyad veya telefon ile ara..."
                                    />
                                    <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                                        {modalAppointmentsLoading && (
                                            <div className="px-3 py-2 text-[11px] text-slate-600">
                                                Randevular yükleniyor...
                                            </div>
                                        )}
                                        {!modalAppointmentsLoading &&
                                            modalPatientSearch.trim() &&
                                            modalAppointments.length === 0 && (
                                                <div className="px-3 py-2 text-[11px] text-slate-600">
                                                    Bu arama ile eşleşen randevu bulunamadı.
                                                </div>
                                            )}
                                        {!modalAppointmentsLoading &&
                                            modalAppointments.map((appt) => {
                                                const start = new Date(appt.starts_at);
                                                const startTime = start
                                                    .toTimeString()
                                                    .slice(0, 5);
                                                return (
                                                    <div
                                                        key={appt.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedAppointmentId(appt.id);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-[11px] flex flex-col gap-0.5 transition-colors cursor-pointer hover:bg-slate-50"
                                                    >
                                                        <span className="font-medium text-slate-900 pointer-events-none">
                                                            {appt.patient_full_name}{" "}
                                                            {appt.patient_phone ? `· ${appt.patient_phone}` : ""}
                                                        </span>
                                                        <span className="text-[10px] text-slate-600 pointer-events-none">
                                                            {start.toLocaleDateString("tr-TR")} · {startTime} ·{" "}
                                                            {appt.treatment_type || "Genel muayene"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-500">
                                        Önce hastayı arayın, ardından listeden ilgili randevuyu
                                        seçip ödeme planı oluşturun.
                                    </p>
                                </>
                            ) : (
                                <>
                                    {(() => {
                                        const selectedAppt = modalAppointments.find(a => a.id === selectedAppointmentId);
                                        if (!selectedAppt) return null;
                                        const start = new Date(selectedAppt.starts_at);
                                        const startTime = start.toTimeString().slice(0, 5);
                                        return (
                                            <div className="relative">
                                                <div className="w-full rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2.5 text-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-900">
                                                                {selectedAppt.patient_full_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-600 mt-0.5">
                                                                {selectedAppt.patient_phone && `${selectedAppt.patient_phone} · `}
                                                                {start.toLocaleDateString("tr-TR")} · {startTime}
                                                                {selectedAppt.treatment_type && ` · ${selectedAppt.treatment_type}`}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAppointmentId("");
                                                                setModalPatientSearch("");
                                                            }}
                                                            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-700 hover:bg-emerald-300 transition-colors"
                                                            title="Seçimi temizle"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <p className="mt-1 text-[10px] text-emerald-600">
                                        ✓ Randevu seçildi. Değiştirmek için X butonuna tıklayın.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-700">
                                    Ödeme tarihi
                                </label>
                                <PremiumDatePicker
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                    today={today}
                                    compact
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-700">
                                    Tutar (₺)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">
                                Ödeme yöntemi
                            </label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700">
                                Not (opsiyonel)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                rows={2}
                                placeholder="Ödeme ile ilgili açıklama..."
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !selectedAppointmentId}
                                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-emerald-700 hover:to-teal-600 transition-colors"
                            >
                                {saving ? "Kaydediliyor..." : "Ödeme planı ekle"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

interface DetailModalProps {
    isOpen: boolean; onClose: () => void;
    payment: PaymentRow | null;
    status: string; setStatus: (v: string) => void;
    amount: string; setAmount: (v: string) => void;
    method: string; setMethod: (v: string) => void;
    onUpdate: () => void; onDelete: () => void;
}

export function PaymentDetailModal({ isOpen, onClose, payment, status, setStatus, amount, setAmount, method, setMethod, onUpdate, onDelete }: DetailModalProps) {
    if (!isOpen || !payment) return null;
    const PAYMENT_METHODS = ["Nakit", "Kredi Kartı", "Havale / EFT", "POS / Taksit", "Çek", "Diğer"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900">Ödeme Detayı</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{payment.patient?.full_name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="flex rounded-2xl border-2 border-slate-50 bg-slate-50/50 p-1">
                            {([["planned", "Planlı"], ["partial", "Kısmi"], ["paid", "Ödendi"], ["cancelled", "İptal"]] as const).map(([v, l]) => (
                                <button key={v} onClick={() => setStatus(v)} className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-xl transition-all ${status === v ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tutar</label>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-11 rounded-2xl border-2 border-slate-100 bg-white px-4 text-sm font-extrabold focus:border-teal-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Yöntem</label>
                                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-11 rounded-2xl border-2 border-slate-100 bg-white px-3 text-sm font-extrabold focus:border-teal-500 outline-none transition-all">
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>

                        {payment.note && (
                            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mb-1">Ödeme Notu</p>
                                <p className="text-xs font-semibold text-indigo-700 italic">{payment.note}</p>
                            </div>
                        )}

                        <div className="flex gap-2.5 pt-4">
                            <button onClick={onDelete} className="h-11 px-4 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="m14.74 9-.34 9m-4.78 0-.34-9m9.27 1.5h-15.5m1.5-3v14m12.5-3V5.25a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75V11.25" /></svg>
                            </button>
                            <button onClick={onUpdate} className="flex-1 h-11 bg-slate-900 text-white rounded-2xl font-extrabold text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Kaydet & Kapat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
