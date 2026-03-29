"use client";

import { useState, useEffect, useCallback } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";

// ─── Tipler ────────────────────────────────────────────────────────────────────

interface DaySummary {
    nakit: number;
    kart: number;
    havale: number;
    diger: number;
    total: number;
}

interface ExistingClosing {
    id: string;
    closing_date: string;
    calc_nakit: number;
    calc_kart: number;
    calc_havale: number;
    calc_diger: number;
    calc_total: number;
    actual_nakit: number;
    actual_kart: number;
    actual_havale: number;
    actual_diger: number;
    diff_nakit: number;
    diff_kart: number;
    diff_havale: number;
    diff_diger: number;
    diff_total: number;
    notes: string | null;
    payment_count: number;
    closed_at: string;
    users?: { full_name: string | null } | null;
}

interface SummaryPayment {
    id: string;
    amount: number;
    method: string | null;
    receipt_number: string | null;
    created_at: string;
    patients: { full_name: string } | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    date?: string; // "2026-03-27" formatı; yoksa bugün
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diffColor(diff: number) {
    if (diff > 0) return "text-emerald-600";
    if (diff < 0) return "text-rose-600";
    return "text-slate-500";
}

function diffLabel(diff: number) {
    if (diff > 0) return `+${fmt(diff)} ₺ Fazla`;
    if (diff < 0) return `${fmt(diff)} ₺ Açık`;
    return "Fark yok";
}

type SummaryGroup = "nakit" | "kart" | "havale" | "diger";
const ROWS: { key: SummaryGroup; label: string; icon: string }[] = [
    { key: "nakit",  label: "Nakit",       icon: "💵" },
    { key: "kart",   label: "Kredi Kartı / POS", icon: "💳" },
    { key: "havale", label: "Havale / EFT", icon: "🏦" },
    { key: "diger",  label: "Diğer",        icon: "📋" },
];

// ─── Bileşen ───────────────────────────────────────────────────────────────────

export function DayCloseModal({ open, onClose, date }: Props) {
    const { clinicId } = useClinic();

    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    const targetDate = date ?? today;

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<DaySummary | null>(null);
    const [paymentCount, setPaymentCount] = useState(0);
    const [payments, setPayments] = useState<SummaryPayment[]>([]);
    const [existing, setExisting] = useState<ExistingClosing | null>(null);

    // Görevli giriş alanları (başlangıçta hesaplanan değerle dolu gelir)
    const [actualNakit,  setActualNakit]  = useState("");
    const [actualKart,   setActualKart]   = useState("");
    const [actualHavale, setActualHavale] = useState("");
    const [actualDiger,  setActualDiger]  = useState("");
    const [notes, setNotes] = useState("");

    const [step, setStep] = useState<"summary" | "count" | "confirm">("summary");
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ── Veri yükle ─────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!open || !clinicId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/daily-closing/summary?date=${targetDate}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            if (res.status === 403) {
                const json = await res.json();
                throw new Error(json.error ?? "Bu işlem için yetkiniz yok.");
            }
            if (!res.ok) throw new Error("Veri alınamadı");
            const json = await res.json();
            setSummary(json.summary);
            setPaymentCount(json.payment_count);
            setPayments(json.payments ?? []);
            setExisting(json.existing_closing ?? null);

            if (!json.existing_closing) {
                // Giriş alanlarını hesaplanan değerle doldur
                setActualNakit(String(json.summary.nakit ?? 0));
                setActualKart(String(json.summary.kart ?? 0));
                setActualHavale(String(json.summary.havale ?? 0));
                setActualDiger(String(json.summary.diger ?? 0));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Hata oluştu");
        } finally {
            setLoading(false);
        }
    }, [open, clinicId, targetDate]);

    useEffect(() => {
        if (open) {
            setStep("summary");
            setNotes("");
            setSubmitError(null);
            load();
        }
    }, [open, load]);

    // ── Hesaplanan farklar ─────────────────────────────────────────────────────
    const computed = summary ? {
        nakit:  (parseFloat(actualNakit)  || 0) - summary.nakit,
        kart:   (parseFloat(actualKart)   || 0) - summary.kart,
        havale: (parseFloat(actualHavale) || 0) - summary.havale,
        diger:  (parseFloat(actualDiger)  || 0) - summary.diger,
        total:
            (parseFloat(actualNakit)  || 0) +
            (parseFloat(actualKart)   || 0) +
            (parseFloat(actualHavale) || 0) +
            (parseFloat(actualDiger)  || 0) -
            summary.total,
    } : null;

    const hasDiff = computed && (
        computed.nakit !== 0 || computed.kart !== 0 ||
        computed.havale !== 0 || computed.diger !== 0
    );

    // ── Gönder ────────────────────────────────────────────────────────────────
    async function handleSubmit() {
        if (hasDiff && !notes.trim()) {
            setSubmitError("Fark varsa açıklama zorunludur.");
            return;
        }
        setSubmitLoading(true);
        setSubmitError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/daily-closing/close", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    closing_date: targetDate,
                    actual_nakit:  parseFloat(actualNakit)  || 0,
                    actual_kart:   parseFloat(actualKart)   || 0,
                    actual_havale: parseFloat(actualHavale) || 0,
                    actual_diger:  parseFloat(actualDiger)  || 0,
                    notes: notes.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Hata oluştu");
            setExisting(json.closing);
            setStep("summary"); // kapat veya özet göster
            onClose();
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : "Hata oluştu");
        } finally {
            setSubmitLoading(false);
        }
    }

    if (!open) return null;

    // ── Render ────────────────────────────────────────────────────────────────
    const dateLabel = new Date(targetDate + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric", weekday: "long",
    });

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">🏦</span>
                                <h2 className="text-lg font-black text-slate-900">Gün Sonu Kasa Kapatma</h2>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500">{dateLabel}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step tabs */}
                    {!existing && !loading && (
                        <div className="flex gap-1 mt-4">
                            {(["summary", "count", "confirm"] as const).map((s, i) => (
                                <div key={s} className="flex items-center gap-1">
                                    <button
                                        onClick={() => step !== "summary" && setStep(s)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            step === s
                                                ? "bg-slate-900 text-white"
                                                : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        {i + 1}. {s === "summary" ? "Özet" : s === "count" ? "Sayım" : "Onayla"}
                                    </button>
                                    {i < 2 && <span className="text-slate-300 text-xs">›</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">

                    {loading && (
                        <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-semibold animate-pulse">
                            Veriler yükleniyor...
                        </div>
                    )}

                    {error && (
                        <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-700">
                            {error}
                        </div>
                    )}

                    {/* Zaten kapatılmış — read-only görünüm */}
                    {!loading && !error && existing && (
                        <ClosedView closing={existing} />
                    )}

                    {/* Adım 1: Özet */}
                    {!loading && !error && !existing && step === "summary" && summary && (
                        <SummaryStep
                            summary={summary}
                            paymentCount={paymentCount}
                            payments={payments}
                            onNext={() => setStep("count")}
                        />
                    )}

                    {/* Adım 2: Fiziksel Sayım */}
                    {!loading && !error && !existing && step === "count" && summary && (
                        <CountStep
                            summary={summary}
                            actualNakit={actualNakit}   setActualNakit={setActualNakit}
                            actualKart={actualKart}     setActualKart={setActualKart}
                            actualHavale={actualHavale} setActualHavale={setActualHavale}
                            actualDiger={actualDiger}   setActualDiger={setActualDiger}
                            computed={computed!}
                            onBack={() => setStep("summary")}
                            onNext={() => setStep("confirm")}
                        />
                    )}

                    {/* Adım 3: Onay */}
                    {!loading && !error && !existing && step === "confirm" && summary && computed && (
                        <ConfirmStep
                            summary={summary}
                            actual={{ nakit: parseFloat(actualNakit) || 0, kart: parseFloat(actualKart) || 0, havale: parseFloat(actualHavale) || 0, diger: parseFloat(actualDiger) || 0 }}
                            computed={computed}
                            hasDiff={!!hasDiff}
                            notes={notes}
                            setNotes={setNotes}
                            submitError={submitError}
                            submitLoading={submitLoading}
                            onBack={() => setStep("count")}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Alt Bileşenler ────────────────────────────────────────────────────────────

function ClosedView({ closing }: { closing: ExistingClosing }) {
    const closedAt = new Date(closing.closed_at).toLocaleString("tr-TR", {
        timeZone: "Asia/Istanbul", hour: "2-digit", minute: "2-digit",
    });

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <div>
                    <p className="text-sm font-black text-emerald-800">Bu gün kapatıldı</p>
                    <p className="text-[11px] font-semibold text-emerald-600">
                        {closedAt} · {closing.payment_count} tahsilat
                        {closing.users?.full_name ? ` · ${closing.users.full_name}` : ""}
                    </p>
                </div>
            </div>

            {/* Özet tablo */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto">
                <div className="min-w-[420px]">
                <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2.5">
                    <span>Ödeme Türü</span>
                    <span className="text-right">Sistem</span>
                    <span className="text-right">Sayılan</span>
                    <span className="text-right">Fark</span>
                </div>
                {ROWS.map(row => {
                    const calc   = closing[`calc_${row.key}` as keyof ExistingClosing] as number;
                    const actual = closing[`actual_${row.key}` as keyof ExistingClosing] as number;
                    const diff   = closing[`diff_${row.key}` as keyof ExistingClosing] as number;
                    return (
                        <div key={row.key} className="grid grid-cols-4 px-4 py-3 border-t border-slate-100 text-sm">
                            <span className="font-semibold text-slate-700">{row.icon} {row.label}</span>
                            <span className="text-right font-mono text-slate-600">{fmt(calc)} ₺</span>
                            <span className="text-right font-mono font-bold text-slate-900">{fmt(actual)} ₺</span>
                            <span className={`text-right font-mono font-bold ${diffColor(diff)}`}>{diff !== 0 ? diffLabel(diff) : "—"}</span>
                        </div>
                    );
                })}
                <div className="grid grid-cols-4 px-4 py-3 border-t-2 border-slate-200 bg-slate-50">
                    <span className="font-black text-slate-900 text-sm">Toplam</span>
                    <span className="text-right font-mono font-bold text-slate-700 text-sm">{fmt(closing.calc_total)} ₺</span>
                    <span className="text-right font-mono font-bold text-slate-900 text-sm">
                        {fmt(closing.actual_nakit + closing.actual_kart + closing.actual_havale + closing.actual_diger)} ₺
                    </span>
                    <span className={`text-right font-mono font-bold text-sm ${diffColor(closing.diff_total)}`}>
                        {closing.diff_total !== 0 ? diffLabel(closing.diff_total) : "—"}
                    </span>
                </div>
                </div>
            </div>

            {closing.notes && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                    <span className="font-black">Açıklama: </span>{closing.notes}
                </div>
            )}
        </div>
    );
}

function SummaryStep({
    summary, paymentCount, payments, onNext,
}: {
    summary: DaySummary;
    paymentCount: number;
    payments: SummaryPayment[];
    onNext: () => void;
}) {
    return (
        <div className="p-6 space-y-5">
            {/* Kasa özet kartları */}
            <div className="grid grid-cols-2 gap-3">
                {ROWS.map(row => (
                    <div key={row.key} className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{row.icon} {row.label}</p>
                        <p className="text-xl font-black text-slate-900">{fmt(summary[row.key])} ₺</p>
                    </div>
                ))}
            </div>

            {/* Toplam */}
            <div className="rounded-2xl bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toplam Tahsilat</p>
                    <p className="text-3xl font-black mt-0.5">{fmt(summary.total)} ₺</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">İşlem</p>
                    <p className="text-2xl font-black">{paymentCount}</p>
                </div>
            </div>

            {/* Tahsilat listesi (collapsible) */}
            {payments.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors select-none list-none flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        {payments.length} tahsilat detayı
                    </summary>
                    <div className="mt-3 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                            {payments.map(p => (
                                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                    <div>
                                        <p className="font-semibold text-slate-800">{p.patients?.full_name ?? "—"}</p>
                                        <p className="text-[10px] font-medium text-slate-400">{p.method ?? "—"}{p.receipt_number ? ` · #${p.receipt_number}` : ""}</p>
                                    </div>
                                    <span className="font-black text-slate-900">{fmt(p.amount)} ₺</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </details>
            )}

            {payments.length === 0 && (
                <p className="text-center text-sm font-semibold text-slate-400 py-4">Bu gün henüz tahsilat kaydı yok.</p>
            )}

            <button
                onClick={onNext}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
                Fiziksel Sayıma Geç →
            </button>
        </div>
    );
}

function CountStep({
    summary, actualNakit, setActualNakit, actualKart, setActualKart,
    actualHavale, setActualHavale, actualDiger, setActualDiger,
    computed, onBack, onNext,
}: {
    summary: DaySummary;
    actualNakit: string; setActualNakit: (v: string) => void;
    actualKart: string;  setActualKart:  (v: string) => void;
    actualHavale: string; setActualHavale: (v: string) => void;
    actualDiger: string; setActualDiger: (v: string) => void;
    computed: { nakit: number; kart: number; havale: number; diger: number; total: number };
    onBack: () => void;
    onNext: () => void;
}) {
    const fields: { key: keyof DaySummary; label: string; icon: string; value: string; set: (v: string) => void }[] = [
        { key: "nakit",  label: "Nakit",             icon: "💵", value: actualNakit,  set: setActualNakit  },
        { key: "kart",   label: "Kredi Kartı / POS", icon: "💳", value: actualKart,   set: setActualKart   },
        { key: "havale", label: "Havale / EFT",       icon: "🏦", value: actualHavale, set: setActualHavale },
        { key: "diger",  label: "Diğer",              icon: "📋", value: actualDiger,  set: setActualDiger  },
    ];

    return (
        <div className="p-6 space-y-4">
            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                Kasadaki fiziksel tutarları sayın ve aşağıya girin. Sistem hesabı referans olarak gösterilmektedir.
            </p>

            <div className="space-y-3">
                {fields.map(f => {
                    const diff = computed[f.key];
                    return (
                        <div key={f.key} className="rounded-2xl border border-slate-200 px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{f.icon} {f.label}</span>
                                <span className="text-[10px] font-semibold text-slate-400">Sistem: {fmt(summary[f.key])} ₺</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={f.value}
                                        onChange={e => f.set(e.target.value)}
                                        className="w-full h-11 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 pr-8 text-sm font-bold text-slate-900 focus:border-slate-900 focus:bg-white outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">₺</span>
                                </div>
                                {f.value !== "" && (
                                    <span className={`text-[11px] font-black whitespace-nowrap ${diffColor(diff)}`}>
                                        {diff !== 0 ? diffLabel(diff) : "✓ Eşleşiyor"}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onBack} className="h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    ← Geri
                </button>
                <button onClick={onNext} className="flex-1 h-12 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all">
                    Fark Analizine Geç →
                </button>
            </div>
        </div>
    );
}

function ConfirmStep({
    summary, actual, computed, hasDiff, notes, setNotes,
    submitError, submitLoading, onBack, onSubmit,
}: {
    summary: DaySummary;
    actual: { nakit: number; kart: number; havale: number; diger: number };
    computed: { nakit: number; kart: number; havale: number; diger: number; total: number };
    hasDiff: boolean;
    notes: string; setNotes: (v: string) => void;
    submitError: string | null;
    submitLoading: boolean;
    onBack: () => void;
    onSubmit: () => void;
}) {
    const actualTotal = actual.nakit + actual.kart + actual.havale + actual.diger;

    return (
        <div className="p-6 space-y-5">

            {/* Fark analizi tablosu */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto">
                <div className="min-w-[420px]">
                <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2.5">
                    <span>Tür</span>
                    <span className="text-right">Sistem</span>
                    <span className="text-right">Sayılan</span>
                    <span className="text-right">Fark</span>
                </div>
                {ROWS.map(row => {
                    const diff = computed[row.key];
                    return (
                        <div key={row.key} className={`grid grid-cols-4 px-4 py-3 border-t border-slate-100 text-sm ${diff !== 0 ? "bg-amber-50/50" : ""}`}>
                            <span className="font-semibold text-slate-700">{row.icon} {row.label}</span>
                            <span className="text-right font-mono text-slate-500">{fmt(summary[row.key])} ₺</span>
                            <span className="text-right font-mono font-bold text-slate-900">{fmt(actual[row.key])} ₺</span>
                            <span className={`text-right font-mono font-bold text-sm ${diffColor(diff)}`}>
                                {diff !== 0 ? diffLabel(diff) : "—"}
                            </span>
                        </div>
                    );
                })}
                <div className="grid grid-cols-4 px-4 py-3 border-t-2 border-slate-200 bg-slate-50">
                    <span className="font-black text-slate-900 text-sm">Toplam</span>
                    <span className="text-right font-mono font-bold text-slate-700 text-sm">{fmt(summary.total)} ₺</span>
                    <span className="text-right font-mono font-bold text-slate-900 text-sm">{fmt(actualTotal)} ₺</span>
                    <span className={`text-right font-mono font-bold text-sm ${diffColor(computed.total)}`}>
                        {computed.total !== 0 ? diffLabel(computed.total) : "—"}
                    </span>
                </div>
                </div>
            </div>

            {/* Uyarı: fark var */}
            {hasDiff && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                    <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <div>
                        <p className="text-sm font-black text-amber-800">Kasa farkı tespit edildi</p>
                        <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Açıklama girmeniz zorunludur.</p>
                    </div>
                </div>
            )}

            {/* Açıklama alanı */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
                    Açıklama {hasDiff ? <span className="text-rose-500">*</span> : "(isteğe bağlı)"}
                </label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Fark varsa nedenini açıklayın..."
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:border-slate-900 focus:bg-white outline-none transition-all resize-none"
                />
            </div>

            {submitError && (
                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-semibold text-rose-700">
                    {submitError}
                </div>
            )}

            {/* Onay kutusu */}
            {!hasDiff && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <p className="text-sm font-black text-emerald-800">Sistem ve fiziksel sayım eşleşiyor</p>
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={onBack} className="h-12 px-6 rounded-2xl border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    ← Geri
                </button>
                <button
                    onClick={onSubmit}
                    disabled={submitLoading}
                    className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitLoading ? (
                        <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Kaydediliyor...</>
                    ) : (
                        <> ✓ Günü Kapat ve Kaydet</>
                    )}
                </button>
            </div>
        </div>
    );
}
