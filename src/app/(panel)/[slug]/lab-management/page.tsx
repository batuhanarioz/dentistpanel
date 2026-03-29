"use client";

import { useState } from "react";
import {
    useLabJobs, useUpdateLabJob,
    LabJob, LabJobStatus, LAB_JOB_STATUSES,
} from "@/hooks/useLabJobs";
import { LabJobModal } from "@/app/components/lab/LabJobModal";

// ─── Statü sekmeleri ──────────────────────────────────────────────────────────

const STATUS_TABS = [
    { value: "all", label: "Tümü" },
    { value: "sent", label: "Gönderildi" },
    { value: "in_progress", label: "İşlemde" },
    { value: "try_in", label: "Prova" },
    { value: "received", label: "Teslim Alındı" },
    { value: "cancelled", label: "İptal" },
];

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function statusConfig(status: LabJobStatus) {
    return LAB_JOB_STATUSES.find(s => s.value === status) ?? LAB_JOB_STATUSES[0];
}

function formatDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric", month: "short", year: "numeric",
    });
}

function isOverdue(job: LabJob) {
    if (job.status === "received" || job.status === "cancelled") return false;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    return job.expected_at < today;
}

const PAGE_SIZE = 20;

type SortKey = "expected_at" | "patient_name" | "created_at";

// ─── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(jobs: LabJob[]) {
    const headers = ["Hasta", "Lab", "İş Türü", "Renk", "Dişler", "Statü", "Gönderildi", "Beklenen", "Teslim Alındı", "Notlar"];
    const rows = jobs.map(j => [
        j.patients?.full_name ?? "",
        j.lab_name,
        j.job_type,
        j.shade ?? "",
        j.tooth_numbers ?? "",
        LAB_JOB_STATUSES.find(s => s.value === j.status)?.label ?? j.status,
        j.sent_at,
        j.expected_at,
        j.received_at ?? "",
        (j.notes ?? "").replace(/"/g, '""'),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-isleri-${new Date().toLocaleDateString("sv-SE")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────

export default function LabManagementPage() {
    const [activeTab, setActiveTab] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("expected_at");
    const [sortAsc, setSortAsc] = useState(true);
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editJob, setEditJob] = useState<LabJob | null>(null);

    const { data: jobs = [], isLoading } = useLabJobs(activeTab);
    const updateMutation = useUpdateLabJob();

    // Arama filtresi (client-side)
    const filtered = jobs
        .filter(j => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                j.patients?.full_name.toLowerCase().includes(q) ||
                j.lab_name.toLowerCase().includes(q) ||
                j.job_type.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            let cmp = 0;
            if (sortKey === "patient_name") {
                cmp = (a.patients?.full_name ?? "").localeCompare(b.patients?.full_name ?? "", "tr");
            } else {
                cmp = (a[sortKey] ?? "").localeCompare(b[sortKey] ?? "");
            }
            return sortAsc ? cmp : -cmp;
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function handleTabChange(tab: string) {
        setActiveTab(tab);
        setPage(1);
    }

    function handleSearchChange(val: string) {
        setSearch(val);
        setPage(1);
    }


    // İstatistikler
    const allJobs = useLabJobs("all");
    const stats = {
        sent: (allJobs.data ?? []).filter(j => j.status === "sent").length,
        in_progress: (allJobs.data ?? []).filter(j => j.status === "in_progress").length,
        try_in: (allJobs.data ?? []).filter(j => j.status === "try_in").length,
        received: (allJobs.data ?? []).filter(j => j.status === "received").length,
        overdue: (allJobs.data ?? []).filter(j => isOverdue(j)).length,
    };

    function openEdit(job: LabJob) {
        setEditJob(job);
        setModalOpen(true);
    }

    function handleNewJob() {
        setEditJob(null);
        setModalOpen(true);
    }

    async function quickStatus(job: LabJob, newStatus: LabJobStatus) {
        await updateMutation.mutateAsync({ id: job.id, status: newStatus });
    }

    const nextStatus: Partial<Record<LabJobStatus, { status: LabJobStatus; label: string }>> = {
        sent: { status: "in_progress", label: "→ İşlemde" },
        in_progress: { status: "try_in", label: "→ Provaya Al" },
        try_in: { status: "received", label: "→ Teslim Alındı" },
    };

    return (
        <div className="space-y-6 pb-20">

            {/* Stat kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: "Gönderildi", value: stats.sent, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
                    { label: "İşlemde", value: stats.in_progress, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
                    { label: "Prova", value: stats.try_in, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
                    { label: "Teslim Alındı", value: stats.received, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
                    { label: "Geciken", value: stats.overdue, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border ${s.bg} ${s.border} px-4 py-3`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${s.color}`}>{s.label}</p>
                        <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Araç çubuğu */}
            <div className="bg-white p-4 rounded-3xl border shadow-sm space-y-4 lg:space-y-0">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">

                    {/* Statü sekmeleri */}
                    <div className="flex rounded-xl bg-slate-100 p-1 overflow-x-auto no-scrollbar shrink-0">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => handleTabChange(tab.value)}
                                className={`whitespace-nowrap px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === tab.value
                                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                                    : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Arama */}
                        <div className="relative flex-1 lg:w-64">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                value={search}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="Hasta, lab veya iş türü..."
                                className="w-full h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 text-[11px] font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                            />
                        </div>

                        {/* Sıralama */}
                        <select
                            value={`${sortKey}-${sortAsc ? "asc" : "desc"}`}
                            onChange={e => {
                                const [key, dir] = e.target.value.split("-") as [SortKey, string];
                                setSortKey(key);
                                setSortAsc(dir === "asc");
                                setPage(1);
                            }}
                            className="h-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-[11px] font-bold focus:bg-white focus:border-slate-900 outline-none transition-all shrink-0"
                        >
                            <option value="expected_at-asc">Beklenen ↑</option>
                            <option value="expected_at-desc">Beklenen ↓</option>
                            <option value="patient_name-asc">Hasta A→Z</option>
                            <option value="patient_name-desc">Hasta Z→A</option>
                            <option value="created_at-desc">En Yeni</option>
                            <option value="created_at-asc">En Eski</option>
                        </select>

                        {/* CSV Export */}
                        <button
                            onClick={() => exportCSV(filtered)}
                            title="CSV olarak indir"
                            className="h-[42px] w-[42px] rounded-xl border-2 border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                        </button>

                        {/* Yeni iş */}
                        <button
                            onClick={handleNewJob}
                            className="h-[42px] px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span className="hidden sm:inline">Yeni Lab İşi</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Liste */}
            {isLoading ? (
                <div className="text-center py-20 text-slate-400 text-sm font-semibold animate-pulse">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-5xl mb-3">🔬</p>
                    <p className="font-black text-slate-600 text-lg">Laboratuvar işi bulunamadı</p>
                    <p className="text-slate-400 text-sm mt-1">Henüz lab işi yok veya filtre eşleşmedi.</p>
                    <button onClick={handleNewJob} className="mt-6 px-6 py-3 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                        İlk Lab İşini Başlat
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid gap-3">
                        {paginated.map(job => (
                            <LabJobCard
                                key={job.id}
                                job={job}
                                onEdit={() => openEdit(job)}
                                onQuickStatus={ns => quickStatus(job, ns)}
                                nextStatusOption={nextStatus[job.status]}
                                updating={updateMutation.isPending}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <span className="text-[11px] font-black text-slate-600 px-3">
                                {page} / {totalPages}
                                <span className="text-slate-400 font-semibold ml-2">({filtered.length} iş)</span>
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>
                    )}
                </>
            )}

            <LabJobModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditJob(null); }}
                editJob={editJob}
            />
        </div>
    );
}

// ─── Lab İş Kartı ─────────────────────────────────────────────────────────────

function LabJobCard({
    job, onEdit, onQuickStatus, nextStatusOption, updating,
}: {
    job: LabJob;
    onEdit: () => void;
    onQuickStatus: (s: LabJobStatus) => void;
    nextStatusOption?: { status: LabJobStatus; label: string };
    updating: boolean;
}) {
    const sc = statusConfig(job.status);
    const overdue = isOverdue(job);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    const daysLeft = Math.ceil(
        (new Date(job.expected_at + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 86400000
    );

    return (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${overdue ? "border-rose-200" : "border-slate-100"}`}>
            {/* Gecikme şeridi */}
            {overdue && (
                <div className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Gecikti — {formatDate(job.expected_at)} tarihindegelmeliydi
                </div>
            )}

            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">

                    {/* Sol: hasta + iş bilgileri */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {/* Statü badge */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${sc.bg} ${sc.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                {sc.label}
                            </span>
                            {/* İş türü */}
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                {job.job_type}
                            </span>
                            {job.shade && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                    {job.shade}
                                </span>
                            )}
                        </div>

                        <p className="font-black text-slate-900 text-base truncate">
                            {job.patients?.full_name ?? "—"}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            🏭 {job.lab_name}
                            {job.tooth_numbers && <> · Diş: {job.tooth_numbers}</>}
                        </p>
                        {job.notes && (
                            <p className="text-[11px] text-slate-400 mt-1 italic">{job.notes}</p>
                        )}
                    </div>

                    {/* Sağ: tarihler + butonlar */}
                    <div className="shrink-0 text-right space-y-2">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Beklenen</p>
                            <p className={`text-sm font-black ${overdue ? "text-rose-600" : daysLeft <= 2 ? "text-amber-600" : "text-slate-800"}`}>
                                {formatDate(job.expected_at)}
                            </p>
                            {job.status !== "received" && job.status !== "cancelled" && (
                                <p className={`text-[10px] font-semibold ${overdue ? "text-rose-500" : daysLeft <= 1 ? "text-amber-500" : "text-slate-400"}`}>
                                    {overdue ? `${Math.abs(daysLeft)} gün gecikti` : daysLeft === 0 ? "Bugün" : `${daysLeft} gün kaldı`}
                                </p>
                            )}
                            {job.status === "received" && job.received_at && (
                                <p className="text-[10px] font-semibold text-emerald-600">
                                    ✓ {formatDate(job.received_at)}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            {nextStatusOption && (
                                <button
                                    onClick={() => onQuickStatus(nextStatusOption.status)}
                                    disabled={updating}
                                    className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {nextStatusOption.label}
                                </button>
                            )}
                            <button
                                onClick={onEdit}
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                title="Düzenle"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
