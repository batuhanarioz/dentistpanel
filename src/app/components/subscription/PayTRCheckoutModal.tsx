"use client";

/**
 * PayTR iFrame Ödeme Modal'ı
 *
 * Kullanım:
 *   <PayTRCheckoutModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     billingCycle="monthly"
 *     onSuccess={() => { refetchClinic(); router.refresh(); }}
 *   />
 *
 * Akış:
 *   1. Opsiyonel: kullanıcı indirim kodu girer → anlık doğrulama + önizleme
 *   2. "Ödemeye Geç" → /api/subscription/create-checkout çağrılır (kod sunucu tarafında 2x doğrulanır)
 *   3. Dönen token ile PayTR iFrame render edilir
 *   4. PayTR ödeme sonucunu postMessage veya redirect ile bildirir
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, AlertCircle, ShieldCheck, Tag, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { BillingCycle } from "@/lib/paytr";

interface PayTRCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    billingCycle: BillingCycle;
    onSuccess?: () => void;
    onFailure?: (reason?: string) => void;
}

interface DiscountPreview {
    codeId: string;
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    isRecurring: boolean;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
}

type Phase =
    | { name: "input" }
    | { name: "loading" }
    | { name: "ready"; iframeUrl: string; amountTL: number }
    | { name: "error"; message: string };

export function PayTRCheckoutModal({
    isOpen,
    onClose,
    billingCycle,
    onSuccess,
    onFailure,
}: PayTRCheckoutModalProps) {
    const [phase, setPhase] = useState<Phase>({ name: "input" });
    const [codeInput, setCodeInput] = useState("");
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [discount, setDiscount] = useState<DiscountPreview | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Modal kapanınca state sıfırla
    useEffect(() => {
        if (!isOpen) {
            setPhase({ name: "input" });
            setCodeInput("");
            setCodeError(null);
            setDiscount(null);
        }
    }, [isOpen]);

    // ── İndirim kodu doğrulama ────────────────────────────────────────────────
    const validateCode = useCallback(async () => {
        const code = codeInput.trim().toUpperCase();
        if (!code) return;

        setCodeLoading(true);
        setCodeError(null);
        setDiscount(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setCodeLoading(false); return; }

        const res = await fetch("/api/subscription/validate-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, billingCycle }),
        });

        const data = await res.json();
        setCodeLoading(false);

        if (data.valid) {
            setDiscount(data as DiscountPreview);
            setCodeError(null);
        } else {
            setCodeError(data.error ?? "Geçersiz kod");
            setDiscount(null);
        }
    }, [codeInput, billingCycle]);

    // ── Ödemeye geç → checkout token al ──────────────────────────────────────
    async function startCheckout() {
        setPhase({ name: "loading" });

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setPhase({ name: "error", message: "Oturum bulunamadı, lütfen tekrar giriş yapın." });
            return;
        }

        const res = await fetch("/api/subscription/create-checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                billingCycle,
                discountCode: discount?.code ?? undefined,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setPhase({ name: "error", message: err.error ?? "Ödeme başlatılamadı, lütfen tekrar deneyin." });
            return;
        }

        const data = await res.json();
        setPhase({ name: "ready", iframeUrl: data.iframeUrl, amountTL: data.finalAmountTL });
    }

    // ── PayTR postMessage ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        function handleMessage(event: MessageEvent) {
            const trustedOrigin = "https://www.paytr.com";
            if (event.origin !== trustedOrigin && process.env.NODE_ENV === "production") return;

            const data = event.data;
            if (data?.status === "success" || data?.result === "success") {
                onSuccess?.();
                onClose();
            } else if (data?.status === "failed" || data?.result === "failed") {
                onFailure?.(data?.reason);
            }
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [isOpen, onSuccess, onFailure, onClose]);

    if (!isOpen) return null;

    const planLabel = billingCycle === "annual" ? "Yıllık Plan" : "Aylık Plan";

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-100">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900">Güvenli Ödeme</p>
                            <p className="text-[10px] text-slate-400 font-medium">{planLabel}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* İçerik */}
                <div>
                    {/* ── Faz: Kod + Devam Ekranı ─────────────────────────────────── */}
                    {phase.name === "input" && (
                        <div className="p-6 space-y-5">
                            {/* İndirim Kodu */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Tag size={12} /> İndirim Kodu (opsiyonel)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Kodu girin..."
                                        value={codeInput}
                                        onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); setDiscount(null); }}
                                        onKeyDown={e => e.key === "Enter" && validateCode()}
                                        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all tracking-widest uppercase"
                                        maxLength={32}
                                    />
                                    <button
                                        onClick={validateCode}
                                        disabled={!codeInput.trim() || codeLoading}
                                        className="shrink-0 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-40"
                                    >
                                        {codeLoading ? <Loader2 size={14} className="animate-spin" /> : "Uygula"}
                                    </button>
                                </div>

                                {/* Kod hatası */}
                                {codeError && (
                                    <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                                        <AlertCircle size={12} /> {codeError}
                                    </p>
                                )}

                                {/* Kod başarılı önizleme */}
                                {discount && (
                                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                            <p className="text-xs font-black text-emerald-800">{discount.message}</p>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-emerald-200">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-slate-400 line-through">
                                                    {discount.originalAmount.toLocaleString("tr-TR")} ₺
                                                </p>
                                                <p className="text-lg font-black text-emerald-700">
                                                    {discount.finalAmount.toLocaleString("tr-TR")} ₺
                                                    <span className="text-[11px] font-bold text-slate-400 ml-1">/ {billingCycle === "annual" ? "yıl" : "ay"}</span>
                                                </p>
                                            </div>
                                            <div className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
                                                {discount.discountType === "percent"
                                                    ? `%${discount.discountValue} İndirim`
                                                    : `${discount.discountValue.toLocaleString("tr-TR")} ₺ İndirim`}
                                            </div>
                                        </div>
                                        {discount.isRecurring && (
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                                                Bu indirim kod aktif olduğu sürece her dönem uygulanır
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Ödemeye Geç butonu */}
                            <button
                                onClick={startCheckout}
                                className="w-full flex items-center justify-between bg-slate-900 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                            >
                                <span>Ödemeye Geç</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-emerald-400">
                                        {(discount?.finalAmount ?? 0).toLocaleString("tr-TR") || "—"} ₺
                                    </span>
                                    <ChevronRight size={18} />
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ── Faz: Yükleniyor ─────────────────────────────────────────── */}
                    {phase.name === "loading" && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
                            <p className="text-sm font-bold text-slate-600">Ödeme ekranı hazırlanıyor...</p>
                        </div>
                    )}

                    {/* ── Faz: Hata ───────────────────────────────────────────────── */}
                    {phase.name === "error" && (
                        <div className="flex flex-col items-center justify-center py-16 px-8 gap-4 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <AlertCircle className="h-7 w-7 text-rose-500" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 mb-1">Ödeme Başlatılamadı</p>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{phase.message}</p>
                            </div>
                            <button
                                onClick={() => setPhase({ name: "input" })}
                                className="mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                            >
                                Geri Dön
                            </button>
                        </div>
                    )}

                    {/* ── Faz: PayTR iFrame ───────────────────────────────────────── */}
                    {phase.name === "ready" && (
                        <iframe
                            ref={iframeRef}
                            src={phase.iframeUrl}
                            className="w-full border-0"
                            style={{ height: 500 }}
                            title="PayTR Güvenli Ödeme"
                            allow="payment"
                        />
                    )}
                </div>

                {/* Footer */}
                {(phase.name === "input" || phase.name === "loading" || phase.name === "ready") && (
                    <div className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 border-t border-slate-100">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <p className="text-[10px] font-bold text-slate-400">
                            SSL şifreli, PCI-DSS uyumlu güvenli ödeme altyapısı
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
