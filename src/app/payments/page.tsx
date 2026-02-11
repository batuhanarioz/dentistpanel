 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { localDateStr } from "../lib/dateUtils";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
};

type AppointmentOption = {
  id: string;
  starts_at: string;
  treatment_type: string | null;
  patient_id: string;
  patient_full_name: string;
  patient_phone: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  method: string | null;
  status: string | null;
  note: string | null;
  due_date: string | null;
  patient: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

const PAYMENT_METHODS = [
  "Nakit",
  "Kredi Kartı",
  "Havale / EFT",
  "POS / Taksit",
  "Çek",
  "Diğer",
];

export default function PaymentsPage() {
  const today = useMemo(() => localDateStr(), []);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [modalPatientSearch, setModalPatientSearch] = useState("");
  const [modalAppointments, setModalAppointments] = useState<AppointmentOption[]>([]);
  const [modalAppointmentsLoading, setModalAppointmentsLoading] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | "">("");

  const [selectedDate, setSelectedDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("Nakit");
  const [note, setNote] = useState("");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(
    null
  );
  const [detailStatus, setDetailStatus] = useState<string>("planned");
  const [detailAmount, setDetailAmount] = useState<string>("");
  const [detailMethod, setDetailMethod] = useState<string>("Nakit");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const loadPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone")
        .order("full_name", { ascending: true });

      if (!error && data) {
        setPatients(data as Patient[]);
      }
    };

    loadPatients();
  }, []);

  const loadPayments = async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, amount, method, status, note, due_date, patient:patient_id(full_name, phone)"
      )
      .gte("due_date", startDate)
      .lt("due_date", endDate)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message || "Ödeme planı yüklenemedi.");
      setPayments([]);
      setLoading(false);
      return;
    }

    setPayments((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    const baseDate = new Date(selectedDate);
    let startDate = new Date(baseDate);
    let endDate = new Date(baseDate);

    if (viewMode === "day") {
      // sadece seçili gün
      endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (viewMode === "week") {
      // haftanın pazartesisi - pazartesi
      const day = baseDate.getDay(); // 0=pazar
      const diffToMonday = (day + 6) % 7; // pazartesi=1 -> 0
      startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() - diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else {
      // ayın ilk günü - bir sonraki ayın ilk günü
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    }

    const startStr = localDateStr(startDate);
    const endStr = localDateStr(endDate);

    loadPayments(startStr, endStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode]);

  useEffect(() => {
    const fetchAppointmentsForSearch = async () => {
      const term = modalPatientSearch.trim().toLowerCase();
      if (!isModalOpen || !term) {
        setModalAppointments([]);
        return;
      }

      const matchingPatients = patients.filter((p) => {
        const name = p.full_name?.toLowerCase() ?? "";
        const phone = p.phone?.replace(/\s+/g, "") ?? "";
        const normalizedTerm = term.replace(/\s+/g, "");
        return (
          name.includes(term) ||
          phone.includes(normalizedTerm) ||
          phone.includes(term)
        );
      });

      const patientIds = matchingPatients.map((p) => p.id);
      if (patientIds.length === 0) {
        setModalAppointments([]);
        return;
      }

      setModalAppointmentsLoading(true);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, treatment_type, patient_id, patients:patient_id(full_name, phone)"
        )
        .in("patient_id", patientIds)
        .order("starts_at", { ascending: true })
        .limit(30);

      if (error || !data) {
        setModalAppointments([]);
        setModalAppointmentsLoading(false);
        return;
      }

      const mapped: AppointmentOption[] = (data as any[]).map((row) => ({
        id: row.id,
        starts_at: row.starts_at,
        treatment_type: row.treatment_type ?? null,
        patient_id: row.patient_id,
        patient_full_name: row.patients?.full_name ?? "Hasta",
        patient_phone: row.patients?.phone ?? null,
      }));

      setModalAppointments(mapped);
      setModalAppointmentsLoading(false);
    };

    fetchAppointmentsForSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalPatientSearch, isModalOpen, patients]);

  const filteredPayments = payments.filter((p) => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return true;
    const name = p.patient?.full_name?.toLowerCase() ?? "";
    const phone = p.patient?.phone?.replace(/\s+/g, "") ?? "";
    return (
      name.includes(term) ||
      phone.includes(term.replace(/\s+/g, "")) ||
      phone.includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPagePayments = filteredPayments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId || !amount || !selectedDate) return;

    const appt = modalAppointments.find((a) => a.id === selectedAppointmentId);
    if (!appt) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("payments").insert({
      appointment_id: selectedAppointmentId,
      patient_id: appt.patient_id,
      amount: Number(amount),
      method,
      status: "planned",
      note: note || null,
      due_date: selectedDate,
    });

    if (error) {
      setError(error.message || "Ödeme planı kaydedilemedi.");
      setSaving(false);
      return;
    }

    setAmount("");
    setMethod("Nakit");
    setNote("");
    setSelectedAppointmentId("");
    setModalPatientSearch("");
    setModalAppointments([]);
    setIsModalOpen(false);
    setSaving(false);
    // seçili görünüm aralığına göre listeyi tazele
    const baseDate = new Date(selectedDate);
    let startDate = new Date(baseDate);
    let endDate = new Date(baseDate);
    if (viewMode === "day") {
      endDate.setDate(endDate.getDate() + 1);
    } else if (viewMode === "week") {
      const day = baseDate.getDay();
      const diffToMonday = (day + 6) % 7;
      startDate.setDate(startDate.getDate() - diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    }
    await loadPayments(
      localDateStr(startDate),
      localDateStr(endDate)
    );
  };

  const handleStatusSave = async () => {
    if (!selectedPayment) return;
    const id = selectedPayment.id;
    const parsedAmount = detailAmount ? Number(detailAmount) : 0;
    if (Number.isNaN(parsedAmount)) {
      return;
    }
    setUpdatingStatusId(id);
    const { error } = await supabase
      .from("payments")
      .update({
        status: detailStatus,
        amount: parsedAmount,
        method: detailMethod,
      })
      .eq("id", id);
    if (!error) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: detailStatus, amount: parsedAmount, method: detailMethod }
            : p
        )
      );
      setSelectedPayment((p) =>
        p ? { ...p, status: detailStatus, amount: parsedAmount, method: detailMethod } : p
      );
      setIsDetailModalOpen(false);
    }
    setUpdatingStatusId(null);
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    const id = selectedPayment.id;
    setDeletingId(id);
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (!error) {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setSelectedPayment(null);
      setIsDetailModalOpen(false);
    }
    setDeletingId(null);
    setIsDeleteConfirmOpen(false);
  };

  const totalAmount = filteredPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const rangeLabel = (() => {
    const baseDate = new Date(selectedDate);
    if (viewMode === "day") {
      return baseDate.toLocaleDateString("tr-TR");
    }
    if (viewMode === "week") {
      const day = baseDate.getDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(baseDate);
      start.setDate(start.getDate() - diffToMonday);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString(
        "tr-TR"
      )}`;
    }
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    return `${start.toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
    })} (${start
      .toLocaleDateString("tr-TR")
      .slice(0, 5)} - ${end.toLocaleDateString("tr-TR").slice(0, 5)})`;
  })();

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-800">
            Toplam{" "}
            <span className="font-semibold">
              {totalAmount.toLocaleString("tr-TR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{" "}
              ₺
            </span>{" "}
            · Seçilen dönem: {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-xs"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            className="rounded-md border px-2 py-1 bg-white"
            onClick={() => {
              setSelectedDate(today);
              setCurrentPage(1);
            }}
          >
            Bugün
          </button>
          <div className="flex gap-1 ml-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("day");
                setCurrentPage(1);
              }}
              className={`rounded-md border px-2 py-1 text-[11px] ${
                viewMode === "day"
                  ? "bg-teal-600 text-white border-slate-900"
                  : "bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              Gün
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("week");
                setCurrentPage(1);
              }}
              className={`rounded-md border px-2 py-1 text-[11px] ${
                viewMode === "week"
                  ? "bg-teal-600 text-white border-slate-900"
                  : "bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              Hafta
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("month");
                setCurrentPage(1);
              }}
              className={`rounded-md border px-2 py-1 text-[11px] ${
                viewMode === "month"
                  ? "bg-teal-600 text-white border-slate-900"
                  : "bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              Ay
            </button>
          </div>
          <button
            className="rounded-md border px-3 py-1.5 text-[11px] bg-teal-600 text-white"
            onClick={() => setIsModalOpen(true)}
          >
            Ödeme ekle
          </button>
        </div>
      </header>

      <section className="rounded-2xl border bg-teal-50/60 p-4 md:p-5 text-xs space-y-3">
        <div className="mb-2">
          <div className="relative">
            <input
              value={listSearch}
              onChange={(e) => {
                setListSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-full border border-teal-300 bg-white/70 px-4 py-2 text-xs shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none"
              placeholder="Hasta adı veya telefon ile ara..."
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="border border-teal-100 rounded-xl overflow-x-auto text-[11px] bg-white/80">
          <div className="min-w-[520px] grid grid-cols-3 items-center bg-teal-600 px-4 py-2 font-medium text-teal-50 text-[11px]">
            <span className="text-left leading-none">Hasta</span>
            <span className="text-left leading-none">Tutar</span>
            <span className="text-right leading-none">Ödeme Tarihi</span>
          </div>
          <div className="min-w-[520px] divide-y divide-teal-50">
            {loading && (
              <div className="px-4 py-3 text-[11px] text-slate-800">
                Ödemeler yükleniyor...
              </div>
            )}
            {!loading && currentPagePayments.length === 0 && (
              <div className="px-4 py-3 text-[11px] text-slate-800">
                Bu tarih ve arama kriterine uygun ödeme bulunmuyor.
              </div>
            )}
            {currentPagePayments.map((p) => {
              const due = p.due_date ? new Date(p.due_date) : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPayment(p);
                    setDetailStatus(p.status || "planned");
                    setDetailAmount(p.amount ? String(p.amount) : "");
                    setDetailMethod(p.method || "Nakit");
                    setIsDetailModalOpen(true);
                  }}
                  className="w-full px-4 py-2 grid grid-cols-3 items-center gap-4 text-left transition-colors hover:bg-teal-50/60"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-900 truncate">
                      {p.patient?.full_name || "Hasta"}
                    </span>
                    <span className="text-[10px] text-slate-600 truncate">
                      {p.patient?.phone || "-"}
                    </span>
                  </div>
                  <div className="flex items-center min-w-0 justify-start text-slate-800">
                    <span className="text-slate-900 font-medium">
                      {p.amount.toLocaleString("tr-TR")} ₺
                    </span>
                    {p.method && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-800">
                        {p.method}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800 border border-teal-100">
                      {due ? due.toLocaleDateString("tr-TR") : selectedDate}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-700">
          <span>
            Toplam {filteredPayments.length} sonuç · Sayfa {currentPage} /{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-teal-200 px-2 py-0.5 disabled:opacity-50 bg-white hover:bg-teal-50 text-teal-800"
            >
              Önceki
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={[
                  "rounded-md px-2 py-0.5 border border-teal-200 text-[11px]",
                  page === currentPage
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-teal-900 hover:bg-teal-50",
                ].join(" ")}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="rounded-md border border-teal-200 px-2 py-0.5 disabled:opacity-50 bg-white hover:bg-teal-50 text-teal-800"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-5 text-xs shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Yeni ödeme planı
                </h2>
                <p className="text-[11px] text-slate-700">
                  Tarih: {selectedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>

            {error && (
              <p className="mb-2 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Randevu seç
                </label>
                <input
                  value={modalPatientSearch}
                  onChange={(e) => setModalPatientSearch(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs mb-1"
                  placeholder="Ad soyad veya telefon ile ara..."
                />
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {modalAppointmentsLoading && (
                    <div className="px-2 py-2 text-[11px] text-slate-600">
                      Randevular yükleniyor...
                    </div>
                  )}
                  {!modalAppointmentsLoading &&
                    modalPatientSearch.trim() &&
                    modalAppointments.length === 0 && (
                      <div className="px-2 py-2 text-[11px] text-slate-600">
                        Bu arama ile eşleşen randevu bulunamadı.
                      </div>
                    )}
                  {!modalAppointmentsLoading &&
                    modalAppointments.map((appt) => {
                      const start = new Date(appt.starts_at);
                      const startTime = start
                        .toTimeString()
                        .slice(0, 5);
                      const selected = selectedAppointmentId === appt.id;
                      return (
                        <button
                          type="button"
                          key={appt.id}
                          onClick={() => setSelectedAppointmentId(appt.id)}
                          className={[
                            "w-full px-2 py-1.5 text-left text-[11px] flex flex-col gap-0.5",
                            selected
                              ? "bg-teal-50 border-l-2 border-l-teal-600"
                              : "hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <span className="font-medium text-slate-900">
                            {appt.patient_full_name}{" "}
                            {appt.patient_phone ? `· ${appt.patient_phone}` : ""}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {start.toLocaleDateString("tr-TR")} · {startTime} ·{" "}
                            {appt.treatment_type || "Genel muayene"}
                          </span>
                        </button>
                      );
                    })}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Önce hastayı arayın, ardından listeden ilgili randevuyu
                  seçip ödeme planı oluşturun.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-800">
                    Ödeme tarihi
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-800">
                    Tutar (₺)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Ödeme yöntemi
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Not (opsiyonel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  rows={2}
                  placeholder="Ödeme ile ilgili açıklama..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : "Ödeme planı ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-5 text-xs shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Ödeme detayı
                </h2>
                <p className="text-[11px] text-slate-700">
                  {selectedPayment.patient?.full_name || "Hasta"} ·{" "}
                  {selectedPayment.amount.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-full border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Hasta
                  </p>
                  <p className="text-slate-900">
                    {selectedPayment.patient?.full_name || "Hasta"}
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Telefon: {selectedPayment.patient?.phone || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Ödeme
                  </p>
                  <p className="text-slate-900">
                    {selectedPayment.amount.toLocaleString("tr-TR")} ₺
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Tarih:{" "}
                    {selectedPayment.due_date
                      ? new Date(
                          selectedPayment.due_date
                        ).toLocaleDateString("tr-TR")
                      : "-"}
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Yöntem: {selectedPayment.method || "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-slate-800 text-[11px]">Not</p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selectedPayment.note || "Bu ödeme için not girilmemiş."}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Ödeme durumu
                </label>
                <select
                  value={detailStatus}
                  onChange={(e) => setDetailStatus(e.target.value)}
                  disabled={!!updatingStatusId}
                  className="w-full rounded-md border px-2 py-1 text-[11px]"
                >
                  <option value="planned">Planlandı</option>
                  <option value="paid">Ödeme alındı</option>
                  <option value="partial">Kısmi ödeme</option>
                  <option value="cancelled">İptal edildi</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-800">
                    Tutar (₺)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={detailAmount}
                    onChange={(e) => setDetailAmount(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-800">
                    Ödeme yöntemi
                  </label>
                  <select
                    value={detailMethod}
                    onChange={(e) => setDetailMethod(e.target.value)}
                    className="w-full rounded-md border px-2 py-1 text-[11px]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white"
                >
                  Ödemeyi sil
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleStatusSave}
                    disabled={!!updatingStatusId}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              {isDeleteConfirmOpen && (
                <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 flex items-center justify-between">
                  <p className="text-[11px] text-red-800">
                    Bu ödemeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-800 bg-white hover:bg-red-50"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePayment}
                      disabled={!!deletingId}
                      className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                    >
                      {deletingId ? "Siliniyor..." : "Evet, sil"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

