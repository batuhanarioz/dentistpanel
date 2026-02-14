"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { localDateStr } from "@/app/lib/dateUtils";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

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

  const paidTotal = filteredPayments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
  const plannedTotal = filteredPayments.filter(p => p.status === "planned" || p.status === "partial").reduce((s, p) => s + (p.amount || 0), 0);

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "partial": return "bg-amber-100 text-amber-700 border-amber-200";
      case "cancelled": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };
  const statusLabel = (status: string | null) => {
    switch (status) {
      case "paid": return "Ödendi";
      case "partial": return "Kısmi";
      case "cancelled": return "İptal";
      default: return "Planlandı";
    }
  };

  return (
    <div className="space-y-5">
      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Toplam Tutar</p>
              <p className="text-lg font-bold text-slate-900">{totalAmount.toLocaleString("tr-TR")} <span className="text-sm font-semibold">₺</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Tahsil Edilen</p>
              <p className="text-lg font-bold text-emerald-700">{paidTotal.toLocaleString("tr-TR")} <span className="text-sm font-semibold">₺</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Bekleyen</p>
              <p className="text-lg font-bold text-amber-700">{plannedTotal.toLocaleString("tr-TR")} <span className="text-sm font-semibold">₺</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Kayıt Sayısı</p>
              <p className="text-lg font-bold text-slate-900">{filteredPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Araç Çubuğu */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">{rangeLabel}</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center w-full md:w-auto">
          {/* Mobil: Tarih ve Bugün */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-auto">
              <PremiumDatePicker
                value={selectedDate}
                onChange={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                today={today}
              />
            </div>
            <button
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
              onClick={() => { setSelectedDate(today); setCurrentPage(1); }}
            >
              Bugün
            </button>
          </div>

          {/* Mobil: Görünüm ve Ekle */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 md:flex-none">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setViewMode(mode); setCurrentPage(1); }}
                  className={[
                    "flex-1 md:flex-none px-3 py-2.5 text-xs font-medium transition-colors border-r last:border-r-0 border-slate-200",
                    viewMode === mode
                      ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {mode === "day" ? "Gün" : mode === "week" ? "Hafta" : "Ay"}
                </button>
              ))}
            </div>
            <button
              className="flex-1 md:flex-none h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-600 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              <span>Ödeme Ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Arama */}
        <div className="px-5 pt-5 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <input
              value={listSearch}
              onChange={(e) => { setListSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:bg-white focus:outline-none transition-all"
              placeholder="Hasta adı veya telefon ile ara..."
            />
          </div>
        </div>

        {error && (
          <div className="px-5">
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{error}</p>
          </div>
        )}

        {/* Tablo Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[580px]">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-y text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Hasta</span>
              <span>Tutar & Yöntem</span>
              <span>Durum</span>
              <span className="text-right">Tarih</span>
            </div>

            {/* Tablo Satırları */}
            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="px-5 py-8 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Ödemeler yükleniyor...
                  </div>
                </div>
              )}
              {!loading && currentPagePayments.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                    </div>
                    <p className="text-sm text-slate-500">Bu dönemde ödeme bulunmuyor</p>
                    <p className="text-xs text-slate-400">Tarih aralığını değiştirin veya yeni ödeme ekleyin</p>
                  </div>
                </div>
              )}
              {!loading && currentPagePayments.map((p) => {
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
                    className="w-full grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-3.5 text-left transition-all hover:bg-slate-50/80 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-[11px] font-bold text-white shadow-sm shrink-0">
                        {(p.patient?.full_name || "H")[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                          {p.patient?.full_name || "Hasta"}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {p.patient?.phone || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-slate-900">
                        {p.amount.toLocaleString("tr-TR")} ₺
                      </span>
                      {p.method && (
                        <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                          {p.method}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border", statusBadge(p.status)].join(" ")}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">
                        {due ? due.toLocaleDateString("tr-TR") : selectedDate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{filteredPayments.length}</span> sonuç · Sayfa <span className="font-medium text-slate-700">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 bg-white hover:bg-slate-50 text-slate-600 font-medium shadow-sm transition-colors"
              >
                Önceki
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all",
                    page === currentPage
                      ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white border border-teal-600"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 bg-white hover:bg-slate-50 text-slate-600 font-medium shadow-sm transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                  onClick={() => setIsModalOpen(false)}
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

              <form onSubmit={handleSave} className="space-y-4">
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
                                    setModalAppointments([]);
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
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-emerald-700 hover:to-teal-600 transition-colors"
                  >
                    {saving ? "Kaydediliyor..." : "Ödeme planı ekle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Ödeme Detayı</h2>
                    <p className="text-xs text-slate-200">
                      {selectedPayment.patient?.full_name || "Hasta"} · {selectedPayment.amount.toLocaleString("tr-TR")} ₺
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-slate-50 px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">Hasta</p>
                    <p className="text-sm text-slate-900">
                      {selectedPayment.patient?.full_name || "Hasta"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Telefon: {selectedPayment.patient?.phone || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">Ödeme</p>
                    <p className="text-sm text-slate-900">
                      {selectedPayment.amount.toLocaleString("tr-TR")} ₺
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Tarih:{" "}
                      {selectedPayment.due_date
                        ? new Date(
                          selectedPayment.due_date
                        ).toLocaleDateString("tr-TR")
                        : "-"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Yöntem: {selectedPayment.method || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Not</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {selectedPayment.note || "Bu ödeme için not girilmemiş."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Ödeme durumu
                  </label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    disabled={!!updatingStatusId}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  >
                    <option value="planned">Planlandı</option>
                    <option value="paid">Ödeme alındı</option>
                    <option value="partial">Kısmi ödeme</option>
                    <option value="cancelled">İptal edildi</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Tutar (₺)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={detailAmount}
                      onChange={(e) => setDetailAmount(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Ödeme yöntemi
                    </label>
                    <select
                      value={detailMethod}
                      onChange={(e) => setDetailMethod(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {isDeleteConfirmOpen && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-red-800">
                      Bu ödemeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirmOpen(false)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-800 bg-white hover:bg-red-50 transition-colors"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleDeletePayment}
                        disabled={!!deletingId}
                        className="rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-60 transition-colors"
                      >
                        {deletingId ? "Siliniyor..." : "Evet, sil"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-between gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-3 py-2 text-xs font-medium text-white hover:from-red-700 hover:to-red-600 transition-colors"
                  >
                    Ödemeyi sil
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={handleStatusSave}
                      disabled={!!updatingStatusId}
                      className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-emerald-700 hover:to-teal-600 transition-colors"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

