"use client";

import { useMemo, useState, useEffect } from "react";
import { usePatients } from "@/hooks/usePatients";
import { PatientListTable } from "@/app/components/patients/PatientListTable";
import { PatientDetailModal } from "@/app/components/patients/PatientDetailModal";
import { CSVUploadModal } from "@/app/components/patients/CSVUploadModal";
import { AddPatientModal } from "@/app/components/patients/AddPatientModal";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

const PAGE_SIZE = 10;

type SortKey = "name" | "date";
type SortDir = "asc" | "desc";

export default function PatientsPage() {
  const {
    loading,
    error,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    selectedPatient,
    appointments,
    payments,
    detailOpen,
    setDetailOpen,
    patients,
    filteredPatients,
    handleSelectPatient,
    downloadPatientsCsv,
    createPatient,
    deletePatient,
    updatePatient,
    totalCount,
    isAdmin,
  } = usePatients();

  const queryClient = useQueryClient();
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(decodeURIComponent(q));
  }, [searchParams, setSearch]);

  const thisMonthCount = patients.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Sort + paginate locally so sorting works across all pages
  const sorted = useMemo(() => {
    const arr = [...filteredPatients];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.full_name.localeCompare(b.full_name, "tr");
      else cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredPatients, sortKey, sortDir]);

  const computedTotalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, computedTotalPages);
  const pagePatients = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
    setCurrentPage(1);
  };

  const refreshPatients = () => {
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Toplam Hasta */}
        <div 
          style={{ background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` }}
          className="relative rounded-2xl overflow-hidden px-3 md:px-4 py-3.5 shadow-lg shadow-indigo-200/40 hover:-translate-y-0.5 transition-all duration-300 cursor-default w-full"
        >
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute right-2 bottom-2 opacity-[0.12]">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/70 mb-1 truncate">Toplam Hasta</p>
          <p className="text-2xl md:text-3xl font-black text-white leading-none">{totalCount}</p>
          <p className="text-[9px] md:text-[10px] text-white/70 font-semibold mt-1.5 truncate">kayıtlı hasta</p>
        </div>

        {/* Bu Ay Yeni */}
        <div 
          style={{ background: `linear-gradient(to bottom right, var(--brand-to), var(--brand-from))` }}
          className="relative rounded-2xl overflow-hidden px-3 md:px-4 py-3.5 shadow-lg shadow-purple-200/40 hover:-translate-y-0.5 transition-all duration-300 cursor-default w-full"
        >
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute right-2 bottom-2 opacity-[0.12]">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/70 mb-1 truncate">Bu Ay Yeni</p>
          <p className="text-2xl md:text-3xl font-black text-white leading-none">{thisMonthCount}</p>
          <p className="text-[9px] md:text-[10px] text-white/70 font-semibold mt-1.5 truncate">bu ay eklenen</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b bg-slate-50/50 px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 group w-full">
              <svg 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--focus-color)] transition-colors" 
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                style={{ '--focus-color': 'var(--brand-from)' } as React.CSSProperties}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="İsim veya telefon ile hızla ara..."
                style={{ '--focus-border-color': 'var(--brand-from)' } as React.CSSProperties}
                className="w-full h-10 rounded-xl border-2 border-slate-100 bg-white pl-10 pr-4 text-sm font-bold focus:border-[var(--focus-border-color)] focus:outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => setIsAddModalOpen(true)}
                style={{ 
                  background: `linear-gradient(to right, var(--brand-from), var(--brand-to))`,
                  boxShadow: `0 10px 15px -3px var(--brand-from)33`
                }}
                className="flex-1 md:flex-none h-10 flex items-center justify-center gap-2 rounded-xl px-5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Yeni Hasta
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setIsCSVModalOpen(true)}
                    style={{ '--brand-from-15': 'var(--brand-from)26' } as React.CSSProperties}
                    className="h-10 flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-100 bg-white px-4 text-xs font-black text-slate-700 hover:bg-[var(--brand-from-15)] hover:text-[var(--brand-from)] hover:border-[var(--brand-from-15)] active:scale-95 transition-all whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    CSV Yükle
                  </button>
                  <button
                    onClick={downloadPatientsCsv}
                    className="h-10 flex items-center justify-center rounded-xl border-2 border-slate-100 bg-white px-3 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                    title="CSV İndir"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600 font-medium flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <PatientListTable
          patients={pagePatients}
          loading={loading}
          onSelectPatient={handleSelectPatient}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
        />

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between border-t bg-slate-50/30 px-5 py-3.5">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">
              {sorted.length} hastadan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} gösteriliyor
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
               <div 
                 style={{ backgroundColor: 'var(--brand-from)' }}
                 className="h-8 min-w-[32px] px-2 rounded-lg text-white text-xs font-black flex items-center justify-center shadow-md shadow-indigo-200/50"
               >
                 {safePage}
               </div>
              <button
                disabled={safePage === computedTotalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="h-8 w-8 rounded-lg border-2 border-slate-100 bg-white flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <PatientDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        patient={selectedPatient}
        appointments={appointments}
        payments={payments}
        onDelete={deletePatient}
        onUpdate={updatePatient}
      />
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onUploadComplete={refreshPatients}
      />
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={async (data) => {
          const ok = await createPatient(data);
          if (ok) refreshPatients();
          return ok;
        }}
      />
    </div>
  );
}
