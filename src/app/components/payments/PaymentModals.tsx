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
    status: string;
    setStatus: (v: string) => void;
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
    selectedDate, setSelectedDate, today, amount, setAmount, method, setMethod, status, setStatus, note, setNote,
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
                                Ödeme durumu
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="planned">Planlandı</option>
                                <option value="partial">Kısmi</option>
                                <option value="paid">Ödendi</option>
                                <option value="cancelled">İptal</option>
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
                                <div className="flex items-center gap-3">
                                    <h3 className="font-extrabold text-slate-900">Ödeme Detayı</h3>
                                    {payment.patient?.phone && (
                                        <a
                                            href={`https://wa.me/90${payment.patient.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#20bd5a] active:scale-95 transition-all border border-emerald-500/10 hover:border-emerald-500/30"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                            İletişime Geç
                                        </a>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{payment.patient?.full_name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="flex rounded-2xl border-2 border-slate-50 bg-slate-50/80 p-1.5 shadow-sm">
                            {([
                                ["planned", "Planlı", "bg-indigo-500 text-white shadow-md", "text-slate-400 hover:text-slate-600 hover:bg-white"],
                                ["partial", "Kısmi", "bg-amber-500 text-white shadow-md", "text-slate-400 hover:text-slate-600 hover:bg-white"],
                                ["paid", "Ödendi", "bg-emerald-500 text-white shadow-md", "text-slate-400 hover:text-slate-600 hover:bg-white"],
                                ["cancelled", "İptal", "bg-rose-500 text-white shadow-md", "text-slate-400 hover:text-slate-600 hover:bg-white"]
                            ] as const).map(([v, l, selectedClass, unselectedClass]) => (
                                <button key={v} onClick={() => setStatus(v)} className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-xl transition-all duration-200 ${status === v ? selectedClass : unselectedClass}`}>
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
                            <button onClick={onDelete} className="h-11 px-5 rounded-2xl border-2 border-slate-100 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm">
                                Sil
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
