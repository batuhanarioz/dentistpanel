"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PatientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  tc_identity_no: string | null;
  created_at: string;
};

const CLINIC_NAME = "NextGency Dis Klinigi";

type PatientAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  treatment_type: string | null;
  doctor_name: string | null;
  patient_note: string | null;
  internal_note: string | null;
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
        .select("id, full_name, phone, email, birth_date, tc_identity_no, created_at")
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
            "id, starts_at, ends_at, status, treatment_type, doctor:doctor_id(full_name), patient_note, internal_note"
          )
          .eq("patient_id", selectedPatient.id)
          .order("starts_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, method, status, due_date")
          .eq("patient_id", selectedPatient.id)
          .order("due_date", { ascending: false }),
      ]);

      const mapped: PatientAppointment[] = (apptRes.data || []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id as string,
          starts_at: r.starts_at as string,
          ends_at: r.ends_at as string,
          status: r.status as PatientAppointment["status"],
          treatment_type: r.treatment_type as string | null,
          doctor_name: (r.doctor as { full_name: string }[])?.[0]?.full_name ?? null,
          patient_note: r.patient_note as string | null,
          internal_note: r.internal_note as string | null,
        };
      });
      setAppointments(mapped);
      setPayments(
        (payRes.data || []).map((r) => ({
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

  const statusLabelMap: Record<string, string> = {
    pending: "Onay bekliyor",
    confirmed: "Onaylı",
    completed: "Tamamlandı",
    cancelled: "İptal",
    no_show: "Gelmedi",
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-800">
            Kayıtlı Toplam Hasta Sayısı:{" "}
            <span className="font-semibold">{patients.length}</span>
          </p>
        </div>
      </header>

      <section className="rounded-2xl border bg-teal-50/60 p-4 md:p-5 text-xs space-y-3">
        <div className="mb-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-full border border-teal-300 bg-white/70 px-4 py-2 text-xs shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none"
              placeholder="Ad soyad veya telefon ile ara..."
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
            <span className="text-left leading-none">Ad Soyad</span>
            <span className="text-left leading-none">İletişim</span>
            <span className="text-right leading-none">Kayıt Tarihi</span>
          </div>
          <div className="min-w-[520px] divide-y divide-teal-50">
            {loading && (
              <div className="px-4 py-3 text-[11px] text-slate-800">
                Hastalar yükleniyor...
              </div>
            )}
            {!loading && currentPagePatients.length === 0 && (
              <div className="px-4 py-3 text-[11px] text-slate-800">
                Arama kriterine uygun hasta bulunamadı.
              </div>
            )}
            {currentPagePatients.map((p) => {
              const created = new Date(p.created_at);
              const isActive = selectedPatient?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className={[
                    "w-full px-4 py-2 grid grid-cols-3 items-center gap-4 text-left transition-colors",
                    isActive
                      ? "bg-teal-50 border-l-4 border-l-teal-600"
                      : "hover:bg-teal-50/60 cursor-pointer",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-slate-900 truncate">
                      {p.full_name}
                    </span>
                  </div>
                  <div className="flex items-center min-w-0 justify-start text-slate-800">
                    <span className="truncate text-[11px]">
                      {p.phone || "-"}
                      {p.email ? ` · ${p.email}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800 border border-teal-100">
                      {created.toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-700">
          <span>
            Toplam {filteredPatients.length} sonuç · Sayfa {currentPage} /{" "}
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
          csv += "Tarih;Saat;Islem;Doktor;Durum;Hasta Notu;Doktor Tedavi Notu\n";
          appointments.forEach((a) => {
            const d = new Date(a.starts_at);
            const e = new Date(a.ends_at);
            csv += `${d.toLocaleDateString("tr-TR")};${d.toTimeString().slice(0, 5)}-${e.toTimeString().slice(0, 5)};${a.treatment_type || "Muayene"};${a.doctor_name || "-"};${statusLabelMap[a.status] ?? a.status};${(a.patient_note || "").replace(/[\n;]/g, " ")};${(a.internal_note || "").replace(/[\n;]/g, " ")}\n`;
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
            if (a.patient_note) txt += `   Hasta Notu: ${a.patient_note}\n`;
            if (a.internal_note) txt += `   Doktor Tedavi Notu: ${a.internal_note}\n`;
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
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 text-xs shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                    {selectedPatient.full_name[0]?.toUpperCase() ?? "H"}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {selectedPatient.full_name}
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Kayıt: {new Date(selectedPatient.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <button
                      type="button"
                      className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                      onClick={handleDownloadCSV}
                    >
                      CSV indir
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                    onClick={handleDownloadTXT}
                  >
                    TXT indir
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="rounded-full border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="rounded-lg border bg-slate-50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-slate-900">{appointments.length}</p>
                  <p className="text-[10px] text-slate-600">Toplam Ziyaret</p>
                </div>
                <div className="rounded-lg border bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-700">{completedCount}</p>
                  <p className="text-[10px] text-emerald-600">Tamamlanan</p>
                </div>
                <div className="rounded-lg border bg-rose-50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-rose-700">{cancelledCount}</p>
                  <p className="text-[10px] text-rose-600">İptal</p>
                </div>
                <div className="rounded-lg border bg-teal-50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-teal-700">{totalPaid.toLocaleString("tr-TR")} ₺</p>
                  <p className="text-[10px] text-teal-600">Toplam Ödeme</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-[11px]">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">İletişim</p>
                  <p className="text-slate-800">Telefon: {selectedPatient.phone || "-"}</p>
                  <p className="text-slate-800">E-posta: {selectedPatient.email || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">Kişisel Bilgiler</p>
                  {selectedPatient.tc_identity_no && (
                    <p className="text-slate-800">
                      TC Kimlik No: {selectedPatient.tc_identity_no}
                    </p>
                  )}
                  <p className="text-slate-800">
                    Doğum tarihi:{" "}
                    {selectedPatient.birth_date
                      ? new Date(selectedPatient.birth_date).toLocaleDateString("tr-TR")
                      : "-"}
                  </p>
                  {totalPlanned > 0 && (
                    <p className="text-amber-700 font-medium">
                      Bekleyen ödeme: {totalPlanned.toLocaleString("tr-TR")} ₺
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Randevu Geçmişi
                  </p>
                  {appointmentsLoading && (
                    <span className="text-[11px] text-slate-700">Yükleniyor...</span>
                  )}
                </div>

                {appointments.length === 0 && !appointmentsLoading && (
                  <p className="text-[11px] text-slate-700">
                    Bu hasta için henüz randevu kaydı bulunmuyor.
                  </p>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {appointments.map((appt) => {
                    const start = new Date(appt.starts_at);
                    const end = new Date(appt.ends_at);
                    const dateStr = start.toLocaleDateString("tr-TR");
                    const timeStr = `${start.toTimeString().slice(0, 5)} - ${end.toTimeString().slice(0, 5)}`;
                    const statusLabel = statusLabelMap[appt.status] ?? appt.status;

                    const statusClass: Record<string, string> = {
                      completed: "bg-emerald-100 text-emerald-800",
                      confirmed: "bg-emerald-50 text-emerald-700",
                      pending: "bg-amber-100 text-amber-800",
                      cancelled: "bg-rose-100 text-rose-800",
                      no_show: "bg-rose-100 text-rose-800",
                    };

                    return (
                      <div
                        key={appt.id}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-white"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {appt.treatment_type || "Muayene"}
                            </span>
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px]",
                                statusClass[appt.status] ?? "bg-slate-100 text-slate-800",
                              ].join(" ")}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-600">
                            {dateStr} · {timeStr}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-700">
                          Doktor: {appt.doctor_name || "Atanmadı"}
                        </div>
                        {appt.patient_note && (
                          <p className="mt-1 text-[10px] text-slate-800">
                            <span className="font-semibold">Hasta notu: </span>
                            {appt.patient_note}
                          </p>
                        )}
                        {appt.internal_note && (
                          <p className="mt-0.5 text-[10px] text-slate-800">
                            <span className="font-semibold">Doktor tedavi notu: </span>
                            {appt.internal_note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

