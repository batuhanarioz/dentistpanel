"use client";

import { useState, useMemo } from "react";
import { useFinanceDashboard, type DoctorRow, type TreatmentRow, type MethodRow } from "@/hooks/useFinanceDashboard";
import { supabase } from "@/lib/supabaseClient";
import { PremiumDatePicker } from "@/app/components/PremiumDatePicker";

interface ClosingRecord {
    id: string;
    closing_date: string;
    closed_at: string;
    payment_count: number;
    calc_total: number;
    actual_nakit: number;
    actual_kart: number;
    actual_havale: number;
    actual_diger: number;
    diff_total: number;
    notes: string | null;
    users?: { full_name: string | null } | null;
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

function profitColor(n: number) {
    if (n > 0) return "text-emerald-700";
    if (n < 0) return "text-rose-700";
    return "text-slate-500";
}

// ─── Tarih Hesaplamaları ───────────────────────────────────────────────────────

function currentMonth() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const last = new Date(y, d.getMonth() + 1, 0).getDate();
    return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2, "0")}` };
}

function lastMonth() {
    const d = new Date();
    const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
    const m = d.getMonth() === 0 ? 12 : d.getMonth();
    const ms = String(m).padStart(2, "0");
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${ms}-01`, to: `${y}-${ms}-${String(last).padStart(2, "0")}` };
}

function last3Months() {
    const to = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return { from, to };
}

function currentQuarter() {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3);
    const qStart = q * 3;
    const from = `${d.getFullYear()}-${String(qStart + 1).padStart(2, "0")}-01`;
    const lastDayOfQEnd = new Date(d.getFullYear(), qStart + 3, 0).getDate();
    const to = `${d.getFullYear()}-${String(qStart + 3).padStart(2, "0")}-${String(lastDayOfQEnd).padStart(2, "0")}`;
    return { from, to };
}

function ytd() {
    const d = new Date();
    const today = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    return { from: `${d.getFullYear()}-01-01`, to: today };
}

const QUICK_RANGES = [
    { label: "Bu Ay", fn: currentMonth },
    { label: "Geçen Ay", fn: lastMonth },
    { label: "Son 3 Ay", fn: last3Months },
    { label: "Bu Çeyrek", fn: currentQuarter },
    { label: "Yıl Başından", fn: ytd },
];

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(
    byDoctor: DoctorRow[],
    byTreatment: TreatmentRow[],
    byMethod: MethodRow[],
    period: { from: string; to: string }
) {
    const rows: string[][] = [
        [`Dönem: ${period.from} — ${period.to}`],
        [],
        ["HEKİM BAZINDA HAK EDİŞ"],
        ["Hekim", "Tahsilat (₺)", "Malzeme (₺)", "Prim (₺)", "Net Kâr (₺)"],
        ...byDoctor.map(r => [r.name, String(r.revenue), String(r.materialCost), String(r.doctorPrim), String(r.netProfit)]),
        [],
        ["TEDAVİ TÜRÜNE GÖRE KARLILIK"],
        ["Tedavi", "Adet", "Tahsilat (₺)", "Malzeme (₺)", "Prim (₺)", "Net Kâr (₺)"],
        ...byTreatment.map(r => [r.name, String(r.count), String(r.revenue), String(r.materialCost), String(r.doctorPrim), String(r.netProfit)]),
        [],
        ["ÖDEME YÖNTEMİ DAĞILIMI"],
        ["Yöntem", "İşlem Adedi", "Tahsilat (₺)"],
        ...byMethod.map(r => [r.label, String(r.count), String(r.revenue)]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `karlılık-${period.from}-${period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── KPI Kartı ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className={`rounded-3xl border p-6 flex flex-col gap-1 ${color}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            {sub && <p className="text-[11px] font-semibold opacity-50 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Tablolar ────────────────────────────────────────────────────────────────

function TableHeader({ cols }: { cols: string[] }) {
    return (
        <thead>
            <tr className="border-b border-slate-100">
                {cols.map(c => (
                    <th key={c} className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest first:rounded-tl-2xl last:rounded-tr-2xl">
                        {c}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

function DoctorTable({ rows }: { rows: DoctorRow[] }) {
    if (!rows.length) return <p className="text-sm text-slate-400 italic px-2 py-6">Bu dönemde randevuya bağlı tahsilat bulunamadı.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
                <TableHeader cols={["Hekim", "Tahsilat", "Malzeme", "Prim", "Net Kâr"]} />
                <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                        <tr key={r.doctorId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{fmt(r.revenue)}</td>
                            <td className="py-3 px-4 text-amber-700 font-semibold">{fmt(r.materialCost)}</td>
                            <td className="py-3 px-4 text-indigo-700 font-semibold">{fmt(r.doctorPrim)}</td>
                            <td className={`py-3 px-4 font-black ${profitColor(r.netProfit)}`}>{fmt(r.netProfit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TreatmentTable({ rows }: { rows: TreatmentRow[] }) {
    if (!rows.length) return <p className="text-sm text-slate-400 italic px-2 py-6">Bu dönemde kayıt bulunamadı.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
                <TableHeader cols={["Tedavi", "İşlem", "Tahsilat", "Malzeme", "Prim", "Net Kâr"]} />
                <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                        <tr key={r.name} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                            <td className="py-3 px-4 text-slate-500 font-semibold">{r.count}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{fmt(r.revenue)}</td>
                            <td className="py-3 px-4 text-amber-700 font-semibold">{fmt(r.materialCost)}</td>
                            <td className="py-3 px-4 text-indigo-700 font-semibold">{fmt(r.doctorPrim)}</td>
                            <td className={`py-3 px-4 font-black ${profitColor(r.netProfit)}`}>{fmt(r.netProfit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MethodTable({ rows, total }: { rows: MethodRow[]; total: number }) {
    if (!rows.length) return <p className="text-sm text-slate-400 italic px-2 py-6">Bu dönemde kayıt bulunamadı.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
                <TableHeader cols={["Ödeme Yöntemi", "İşlem Adedi", "Tahsilat", "Pay %"]} />
                <tbody className="divide-y divide-slate-50">
                    {rows.map(r => {
                        const pct = total > 0 ? ((r.revenue / total) * 100).toFixed(1) : "0.0";
                        return (
                            <tr key={r.label} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900">{r.label}</td>
                                <td className="py-3 px-4 text-slate-500 font-semibold">{r.count}</td>
                                <td className="py-3 px-4 font-semibold text-slate-700">{fmt(r.revenue)}</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 rounded-full"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-500 w-10 text-right">%{pct}</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function FinancePage() {
    const def = useMemo(() => currentMonth(), []);
    const [from, setFrom] = useState(def.from);
    const [to, setTo] = useState(def.to);

    const { data, isLoading, isError } = useFinanceDashboard(from, to);

    const marginPct = data && data.kpi.revenue > 0
        ? ((data.kpi.netProfit / data.kpi.revenue) * 100).toFixed(1)
        : null;

    // Quick range aktiflik — fonksiyon başta hesaplanır, her render'da tutarlı
    const activeRange = useMemo(() => ({ from, to }), [from, to]);

    // Gün sonu geçmişi
    const [historyOpen, setHistoryOpen] = useState(false);
    const [closings, setClosings] = useState<ClosingRecord[]>([]);
    const [closingsLoading, setClosingsLoading] = useState(false);

    async function loadClosingHistory() {
        setClosingsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/daily-closing/history?limit=30", {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (res.ok) {
                const json = await res.json();
                setClosings(json.closings ?? []);
            }
        } finally {
            setClosingsLoading(false);
        }
    }

    function handleToggleHistory() {
        if (!historyOpen && closings.length === 0) loadClosingHistory();
        setHistoryOpen(v => !v);
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

            {/* Başlık + araç çubuğu */}
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Tahsilat · Malzeme Maliyeti · Hekim Hak Edişi · Net Kâr
                        </p>
                    </div>
                    {data && (
                        <button
                            onClick={() => exportCSV(data.byDoctor, data.byTreatment, data.byMethod, data.period)}
                            title="CSV olarak indir"
                            className="shrink-0 h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Hızlı aralıklar — yatay scroll */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {QUICK_RANGES.map(r => {
                        const range = r.fn();
                        const isActive = activeRange.from === range.from && activeRange.to === range.to;
                        return (
                            <button
                                key={r.label}
                                onClick={() => { setFrom(range.from); setTo(range.to); }}
                                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all border ${isActive
                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                                    }`}
                            >
                                {r.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tarih aralığı */}
                <div className="flex items-center gap-2">
                    <PremiumDatePicker value={from} onChange={setFrom} compact align="left" className="flex-1 sm:flex-none" />
                    <span className="text-slate-400 text-xs shrink-0">—</span>
                    <PremiumDatePicker value={to} onChange={setTo} compact align="right" className="flex-1 sm:flex-none" />
                </div>
            </div>

            {/* Yükleniyor / hata */}
            {isLoading && (
                <div className="py-20 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                </div>
            )}
            {isError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 px-6 py-4 text-sm font-bold text-rose-700">
                    Veriler yüklenirken bir hata oluştu.
                </div>
            )}

            {data && (
                <>
                    {/* KPI kartları — 5 sütun */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard
                            label="Toplam Tahsilat"
                            value={fmt(data.kpi.revenue)}
                            color="bg-white border-slate-100 text-slate-900"
                        />
                        <KpiCard
                            label="Malzeme Maliyeti"
                            value={fmt(data.kpi.materialCost)}
                            sub="Tedavi tanımından"
                            color="bg-amber-50 border-amber-100 text-amber-900"
                        />
                        <KpiCard
                            label="Hekim Primleri"
                            value={fmt(data.kpi.doctorPrim)}
                            sub="Prim % × Tahsilat"
                            color="bg-indigo-50 border-indigo-100 text-indigo-900"
                        />
                        <KpiCard
                            label="Klinik Net Kârı"
                            value={fmt(data.kpi.netProfit)}
                            sub={marginPct ? `%${marginPct} marj` : undefined}
                            color={data.kpi.netProfit >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-rose-50 border-rose-100 text-rose-900"}
                        />
                        <KpiCard
                            label="Açık Alacak"
                            value={fmt(data.kpi.openReceivables)}
                            sub="Bekleyen / kısmi"
                            color={data.kpi.openReceivables > 0 ? "bg-orange-50 border-orange-100 text-orange-900" : "bg-white border-slate-100 text-slate-400"}
                        />
                    </div>

                    {/* Eşleşmeyen tedavi tipi uyarısı */}
                    {data.kpi.unmatchedCount > 0 && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3.5 flex items-start gap-3">
                            <svg className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            <div>
                                <p className="text-sm font-black text-amber-800">
                                    {data.kpi.unmatchedCount} ödeme tedavi tanımıyla eşleşmedi
                                </p>
                                <p className="text-xs font-medium text-amber-700 mt-0.5">
                                    Bu ödemeler için malzeme maliyeti ve hekim primi <strong>0 ₺</strong> olarak hesaplandı.
                                    Klinik Ayarları → Tedavi Tanımları bölümünden eksik tanımları ekleyebilirsiniz.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Ödeme Yöntemi Dağılımı */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50">
                            <h2 className="text-base font-black text-slate-900">Ödeme Yöntemi Dağılımı</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Nakit · Kart · Havale/EFT · Diğer
                            </p>
                        </div>
                        <div className="px-2 py-2">
                            <MethodTable rows={data.byMethod} total={data.kpi.revenue} />
                        </div>
                    </div>

                    {/* Hekim bazında tablo */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50">
                            <h2 className="text-base font-black text-slate-900">Hekim Bazında Hak Ediş</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Sadece randevuya bağlı ödemeler hesaba katılır
                            </p>
                        </div>
                        <div className="px-2 py-2">
                            <DoctorTable rows={data.byDoctor} />
                        </div>
                    </div>

                    {/* Tedavi bazında tablo */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50">
                            <h2 className="text-base font-black text-slate-900">Tedavi Türüne Göre Karlılık</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Tedavi tanımında maliyet/prim girilmemiş işlemler 0 olarak hesaplanır
                            </p>
                        </div>
                        <div className="px-2 py-2">
                            <TreatmentTable rows={data.byTreatment} />
                        </div>
                    </div>
                </>
            )}

            {/* Gün Sonu Geçmişi */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={handleToggleHistory}
                    className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p className="text-base font-black text-slate-900">Gün Sonu Geçmişi</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Son 30 kapanış kaydı</p>
                        </div>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {historyOpen && (
                    <div className="border-t border-slate-100">
                        {closingsLoading ? (
                            <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-semibold animate-pulse">
                                Yükleniyor...
                            </div>
                        ) : closings.length === 0 ? (
                            <div className="py-10 text-center text-sm font-semibold text-slate-400">
                                Henüz kapanış kaydı bulunmuyor.
                            </div>
                        ) : (
                            <>
                                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2.5 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Tarih</span>
                                    <span className="text-right">Sistem</span>
                                    <span className="text-right">Sayılan</span>
                                    <span className="text-right">Fark</span>
                                    <span>Kapatan</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {closings.map(c => {
                                        const actualTotal = c.actual_nakit + c.actual_kart + c.actual_havale + c.actual_diger;
                                        const hasDiff = c.diff_total !== 0;
                                        const fmtMoney = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        const dateLabel = new Date(c.closing_date + "T12:00:00").toLocaleDateString("tr-TR", {
                                            day: "numeric", month: "short", year: "numeric", weekday: "short",
                                        });
                                        const closedAt = new Date(c.closed_at).toLocaleTimeString("tr-TR", {
                                            timeZone: "Asia/Istanbul", hour: "2-digit", minute: "2-digit",
                                        });
                                        return (
                                            <div key={c.id} className="px-4 sm:px-6 py-3 text-sm">
                                                {/* Mobil: kart görünümü */}
                                                <div className="sm:hidden flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-[13px]">{dateLabel}</p>
                                                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{closedAt} · {c.payment_count} tahsilat</p>
                                                        {(c.users as { full_name: string | null } | null)?.full_name && (
                                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{(c.users as { full_name: string | null }).full_name}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-black text-slate-900 font-mono">{fmtMoney(actualTotal)} ₺</p>
                                                        <p className={`text-[11px] font-bold font-mono mt-0.5 ${hasDiff ? (c.diff_total > 0 ? "text-emerald-600" : "text-rose-600") : "text-slate-400"}`}>
                                                            {hasDiff ? `${c.diff_total > 0 ? "+" : ""}${fmtMoney(c.diff_total)} ₺` : "Fark yok"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {hasDiff && c.notes && (
                                                    <div className="sm:hidden mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                                                        💬 {c.notes}
                                                    </div>
                                                )}

                                                {/* Desktop: grid satırı */}
                                                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{dateLabel}</p>
                                                        <p className="text-[10px] font-semibold text-slate-400">{closedAt} · {c.payment_count} tahsilat</p>
                                                    </div>
                                                    <p className="text-right font-mono text-slate-600">{fmtMoney(c.calc_total)} ₺</p>
                                                    <p className="text-right font-mono font-bold text-slate-900">{fmtMoney(actualTotal)} ₺</p>
                                                    <p className={`text-right font-mono font-bold ${hasDiff ? (c.diff_total > 0 ? "text-emerald-600" : "text-rose-600") : "text-slate-400"}`}>
                                                        {hasDiff ? `${c.diff_total > 0 ? "+" : ""}${fmtMoney(c.diff_total)} ₺` : "—"}
                                                        {hasDiff && c.notes && (
                                                            <span className="block text-[10px] text-amber-600 font-semibold truncate max-w-[120px]" title={c.notes}>💬 {c.notes}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                                                        {(c.users as { full_name: string | null } | null)?.full_name ?? "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
