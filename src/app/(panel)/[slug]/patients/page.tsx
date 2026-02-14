"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";

type PatientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  tc_identity_no: string | null;
  allergies: string | null;
  medical_alerts: string | null;
  created_at: string;
};

type PatientAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  treatment_type: string | null;
  doctor_name: string | null;
  patient_note: string | null;
  internal_note: string | null;
  treatment_note: string | null;
};

type PatientPayment = {
  id: string;
  amount: number;
  method: string | null;
  status: string | null;
  due_date: string | null;
};

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const clinic = useClinic();
  const CLINIC_NAME = clinic.clinicName || "Klinik";
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(
    null
  );
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone, email, birth_date, tc_identity_no, allergies, medical_alerts, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message || "Hastalar yüklenemedi.");
        setLoading(false);
        return;
      }

      const rows = data || [];
      setPatients(rows);
      setLoading(false);
    };

    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadPatientDetail = async () => {
      if (!selectedPatient) {
        setAppointments([]);
        setPayments([]);
        return;
      }

      setAppointmentsLoading(true);

      const [apptRes, payRes] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id, starts_at, ends_at, status, treatment_type, doctor:doctor_id(full_name), patient_note, internal_note, treatment_note"
          )
          .eq("patient_id", selectedPatient.id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, method, status, due_date")
          .eq("patient_id", selectedPatient.id)
          .order("due_date", { ascending: false }),
      ]);

      const mapped: PatientAppointment[] = (apptRes.data || []).map(
        (row: any) => ({
          id: row.id,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          status: row.status,
          treatment_type: row.treatment_type,
          doctor_name: row.doctor?.full_name ?? null,
          patient_note: row.patient_note,
          internal_note: row.internal_note,
          treatment_note: row.treatment_note ?? row.internal_note,
        })
      );

      setAppointments(mapped);
      setPayments(
        (payRes.data || []).map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          method: r.method,
          status: r.status,
          due_date: r.due_date,
        }))
      );
      setAppointmentsLoading(false);
    };

    loadPatientDetail();
  }, [selectedPatient]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((p) => {
      const name = p.full_name?.toLowerCase() ?? "";
      const phone = p.phone?.replace(/\s+/g, "") ?? "";
      return (
        name.includes(term) ||
        phone.includes(term.replace(/\s+/g, "")) ||
        phone.includes(term)
      );
    });
  }, [patients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));

  const currentPagePatients = filteredPatients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSelectPatient = (patient: PatientRow) => {
    setSelectedPatient(patient);
    setDetailOpen(true);
  };

  const canDownload = clinic.userRole === "ADMIN" || clinic.userRole === "SUPER_ADMIN";

  const downloadPatientsCsv = () => {
    const escape = (v: string | null | undefined) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };
    const rows = [
      ["Ad Soyad", "Telefon", "E-posta", "Doğum Tarihi", "TC Kimlik No", "Alerjiler", "Tıbbi Uyarılar", "Kayıt Tarihi"],
      ...filteredPatients.map((p) => [
        escape(p.full_name),
        escape(p.phone),
        escape(p.email),
        escape(p.birth_date ? p.birth_date.slice(0, 10) : null),
        escape(p.tc_identity_no),
        escape(p.allergies),
        escape(p.medical_alerts),
        escape(p.created_at ? p.created_at.slice(0, 10) : null),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (CLINIC_NAME || "Klinik").replace(/\s+/g, "_").replace(/[^\w\u00C0-\u024F.-]/gi, "") || "Klinik";
    a.download = `${safeName}_Hastalar.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabelMap: Record<string, string> = {
    pending: "Onay bekliyor",
    confirmed: "Onaylı",
    completed: "Tamamlandı",
    cancelled: "İptal",
    no_show: "Gelmedi",
  };

  return (
    <div className="space-y-5">
      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Toplam Hasta</p>
              <p className="text-lg font-bold text-slate-900">{patients.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Arama Sonucu</p>
              <p className="text-lg font-bold text-slate-900">{filteredPatients.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Sayfa</p>
              <p className="text-lg font-bold text-slate-900">{currentPage} <span className="text-sm font-normal text-slate-400">/ {totalPages}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Hasta Listesi */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Arama + İndir */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:bg-white focus:outline-none transition-all"
                placeholder="Ad soyad veya telefon ile ara..."
              />
            </div>
            {canDownload && (
              <button
                type="button"
                onClick={downloadPatientsCsv}
                className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-600 transition-all shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                İndir (CSV)
              </button>
            )}
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
            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-y text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Hasta</span>
              <span>İletişim</span>
              <span className="text-right">Kayıt Tarihi</span>
            </div>

            {/* Tablo Satırları */}
            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="px-5 py-8 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Hastalar yükleniyor...
                  </div>
                </div>
              )}
              {!loading && currentPagePatients.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                    </div>
                    <p className="text-sm text-slate-500">Hasta bulunamadı</p>
                    <p className="text-xs text-slate-400">Arama kriterinizi değiştirmeyi deneyin</p>
                  </div>
                </div>
              )}
              {!loading && currentPagePatients.map((p) => {
                const created = new Date(p.created_at);
                const isActive = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className={[
                      "w-full grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-5 py-3.5 text-left transition-all group",
                      isActive
                        ? "bg-teal-50/70 border-l-4 border-l-teal-500"
                        : "hover:bg-slate-50/80",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-[11px] font-bold text-white shadow-sm shrink-0">
                        {p.full_name[0]?.toUpperCase() ?? "H"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                          {p.full_name}
                        </span>
                        {p.birth_date && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {new Date(p.birth_date).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-slate-700 truncate">
                        {p.phone || "-"}
                      </span>
                      {p.email && (
                        <span className="text-[11px] text-slate-400 truncate">
                          {p.email}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 border border-slate-200">
                        {created.toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!loading && filteredPatients.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              <span className="font-medium text-slate-700">{filteredPatients.length}</span> sonuç · Sayfa <span className="font-medium text-slate-700">{currentPage}</span> / {totalPages}
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

      {detailOpen && selectedPatient && (() => {
        const completedCount = appointments.filter((a) => a.status === "completed").length;
        const cancelledCount = appointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length;
        const totalPaid = payments
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + p.amount, 0);
        const totalPlanned = payments
          .filter((p) => p.status === "planned" || p.status === "partial")
          .reduce((s, p) => s + p.amount, 0);

        const todayStr = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
        const safePatientName = selectedPatient.full_name.replace(/\s+/g, "-");
        const fileBaseName = `${CLINIC_NAME.replace(/\s+/g, "-")}-${safePatientName}-Raporu-${todayStr}`;

        const handleDownloadCSV = () => {
          // --- Özet Bilgiler ---
          let csv = "";
          csv += "HASTA RAPORU\n";
          csv += `Ad Soyad;${selectedPatient.full_name}\n`;
          csv += `TC Kimlik No;${selectedPatient.tc_identity_no || "-"}\n`;
          csv += `Telefon;${selectedPatient.phone || "-"}\n`;
          csv += `E-posta;${selectedPatient.email || "-"}\n`;
          csv += `Dogum Tarihi;${selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString("tr-TR") : "-"}\n`;
          csv += `Alerjiler;${selectedPatient.allergies || "-"}\n`;
          csv += `Tibbi Uyarilar;${selectedPatient.medical_alerts || "-"}\n`;
          csv += `Kayit Tarihi;${new Date(selectedPatient.created_at).toLocaleDateString("tr-TR")}\n`;
          csv += `\n`;
          csv += `Toplam Ziyaret;${appointments.length}\n`;
          csv += `Tamamlanan;${completedCount}\n`;
          csv += `Iptal / Gelmedi;${cancelledCount}\n`;
          csv += `Tahsil Edilen Odeme;${totalPaid.toLocaleString("tr-TR")} TL\n`;
          csv += `Bekleyen Odeme;${totalPlanned.toLocaleString("tr-TR")} TL\n`;
          csv += `\n`;

          // --- Randevu Detay Tablosu ---
          csv += "RANDEVU GECMISI\n";
          csv += "Tarih;Saat;Islem;Doktor;Durum;Randevu Oncesi Not;Tedavi Sonrasi Not\n";
          appointments.forEach((a) => {
            const d = new Date(a.starts_at);
            const e = new Date(a.ends_at);
            const treatmentNote = a.treatment_note ?? a.internal_note ?? "";
            csv += `${d.toLocaleDateString("tr-TR")};${d.toTimeString().slice(0, 5)}-${e.toTimeString().slice(0, 5)};${a.treatment_type || "Muayene"};${a.doctor_name || "-"};${statusLabelMap[a.status] ?? a.status};${(a.patient_note || "").replace(/[\n;]/g, " ")};${(treatmentNote || "").replace(/[\n;]/g, " ")}\n`;
          });

          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${fileBaseName}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        };

        const handleDownloadTXT = () => {
          let txt = `HASTA RAPORU\n${"=".repeat(40)}\n`;
          txt += `Ad Soyad: ${selectedPatient.full_name}\n`;
          txt += `TC Kimlik No: ${selectedPatient.tc_identity_no || "-"}\n`;
          txt += `Telefon: ${selectedPatient.phone || "-"}\n`;
          txt += `E-posta: ${selectedPatient.email || "-"}\n`;
          txt += `Doğum Tarihi: ${selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString("tr-TR") : "-"}\n`;
          txt += `Alerjiler: ${selectedPatient.allergies || "-"}\n`;
          txt += `Tıbbi Uyarılar: ${selectedPatient.medical_alerts || "-"}\n`;
          txt += `Kayıt Tarihi: ${new Date(selectedPatient.created_at).toLocaleDateString("tr-TR")}\n`;
          txt += `\nToplam Ziyaret: ${appointments.length} | Tamamlanan: ${completedCount} | İptal: ${cancelledCount}\n`;
          txt += `Toplam Ödeme: ${totalPaid.toLocaleString("tr-TR")} ₺ | Bekleyen: ${totalPlanned.toLocaleString("tr-TR")} ₺\n`;
          txt += `\n${"=".repeat(40)}\nRANDEVU GEÇMİŞİ\n${"=".repeat(40)}\n\n`;
          appointments.forEach((a, i) => {
            const d = new Date(a.starts_at);
            const e = new Date(a.ends_at);
            txt += `${i + 1}. ${d.toLocaleDateString("tr-TR")} ${d.toTimeString().slice(0, 5)}-${e.toTimeString().slice(0, 5)}\n`;
            txt += `   İşlem: ${a.treatment_type || "Muayene"}\n`;
            txt += `   Doktor: ${a.doctor_name || "Atanmadı"}\n`;
            txt += `   Durum: ${statusLabelMap[a.status] ?? a.status}\n`;
            if (a.patient_note) txt += `   Randevu öncesi not: ${a.patient_note}\n`;
            const treatmentNote = a.treatment_note ?? a.internal_note;
            if (treatmentNote) txt += `   Tedavi sonrası not: ${treatmentNote}\n`;
            txt += "\n";
          });
          const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${fileBaseName}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-teal-700">
                    {selectedPatient.full_name[0]?.toUpperCase() ?? "H"}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {selectedPatient.full_name}
                    </h2>
                    <p className="text-xs text-teal-100">
                      Kayıt: {new Date(selectedPatient.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-white/15 border border-white/20 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/25 transition-colors"
                    onClick={handleDownloadCSV}
                  >
                    CSV indir
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/15 border border-white/20 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/25 transition-colors"
                    onClick={handleDownloadTXT}
                  >
                    TXT indir
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 text-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60 mx-auto mb-1.5">
                      <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{appointments.length}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Toplam Ziyaret</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 text-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-200/60 mx-auto mb-1.5">
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">{completedCount}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Tamamlanan</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-3 text-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-200/60 mx-auto mb-1.5">
                      <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </div>
                    <p className="text-lg font-bold text-rose-700">{cancelledCount}</p>
                    <p className="text-[10px] text-rose-600 font-medium">İptal</p>
                  </div>
                  <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-3 text-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-200/60 mx-auto mb-1.5">
                      <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    </div>
                    <p className="text-lg font-bold text-teal-700">{totalPaid.toLocaleString("tr-TR")} ₺</p>
                    <p className="text-[10px] text-teal-600 font-medium">Toplam Ödeme</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-[11px]">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100">
                        <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                      </div>
                      <p className="font-semibold text-slate-700 text-xs">İletişim</p>
                    </div>
                    <div className="space-y-1.5 pl-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-14 shrink-0">Telefon</span>
                        <span className="text-slate-800 font-medium">{selectedPatient.phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-14 shrink-0">E-posta</span>
                        <span className="text-slate-800 font-medium truncate">{selectedPatient.email || "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100">
                        <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      </div>
                      <p className="font-semibold text-slate-700 text-xs">Kişisel Bilgiler</p>
                    </div>
                    <div className="space-y-1.5 pl-0.5">
                      {selectedPatient.tc_identity_no && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-14 shrink-0">TC No</span>
                          <span className="text-slate-800 font-medium">{selectedPatient.tc_identity_no}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-14 shrink-0">Doğum</span>
                        <span className="text-slate-800 font-medium">
                          {selectedPatient.birth_date
                            ? new Date(selectedPatient.birth_date).toLocaleDateString("tr-TR")
                            : "-"}
                        </span>
                      </div>
                      {totalPlanned > 0 && (
                        <div className="flex items-center gap-2 mt-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                          <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                          <span className="text-amber-700 font-semibold text-[11px]">Bekleyen ödeme: {totalPlanned.toLocaleString("tr-TR")} ₺</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedPatient.allergies || selectedPatient.medical_alerts) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-200">
                        <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                      </div>
                      <p className="font-semibold text-amber-800 text-xs">Alerji / Tıbbi uyarı</p>
                    </div>
                    <div className="space-y-1.5 pl-0.5 text-[11px]">
                      {selectedPatient.allergies && (
                        <p><span className="text-amber-700 font-medium">Alerjiler:</span> <span className="text-amber-900">{selectedPatient.allergies}</span></p>
                      )}
                      {selectedPatient.medical_alerts && (
                        <p><span className="text-amber-700 font-medium">Tıbbi uyarılar:</span> <span className="text-amber-900">{selectedPatient.medical_alerts}</span></p>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100">
                        <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        Randevu Geçmişi
                      </p>
                    </div>
                    {appointmentsLoading && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Yükleniyor...
                      </div>
                    )}
                  </div>

                  {appointments.length === 0 && !appointmentsLoading && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>
                      </div>
                      <p className="text-[11px] text-slate-500">Bu hasta için henüz randevu kaydı bulunmuyor.</p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {appointments.map((appt) => {
                      const start = new Date(appt.starts_at);
                      const end = new Date(appt.ends_at);
                      const dateStr = start.toLocaleDateString("tr-TR");
                      const timeStr = `${start.toTimeString().slice(0, 5)} - ${end.toTimeString().slice(0, 5)}`;
                      const statusLabel = statusLabelMap[appt.status] ?? appt.status;

                      const statusClass: Record<string, string> = {
                        completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        confirmed: "bg-emerald-50 text-emerald-600 border-emerald-200",
                        pending: "bg-amber-100 text-amber-700 border-amber-200",
                        cancelled: "bg-rose-100 text-rose-700 border-rose-200",
                        no_show: "bg-rose-100 text-rose-700 border-rose-200",
                      };

                      return (
                        <div
                          key={appt.id}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-[11px] bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {appt.treatment_type || "Muayene"}
                              </span>
                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                  statusClass[appt.status] ?? "bg-slate-100 text-slate-600 border-slate-200",
                                ].join(" ")}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {dateStr} · {timeStr}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                            <span>Dr. {appt.doctor_name || "Atanmadı"}</span>
                          </div>
                          {appt.patient_note && (
                            <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[10px]">
                              <span className="font-semibold text-slate-600">Randevu öncesi not:</span>{" "}
                              <span className="text-slate-700">{appt.patient_note}</span>
                            </div>
                          )}
                          {(appt.treatment_note ?? appt.internal_note) && (
                            <div className="mt-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-[10px]">
                              <span className="font-semibold text-indigo-600">Tedavi sonrası not:</span>{" "}
                              <span className="text-indigo-700">{appt.treatment_note ?? appt.internal_note}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

