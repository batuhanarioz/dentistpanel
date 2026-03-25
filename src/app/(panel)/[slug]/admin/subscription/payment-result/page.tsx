"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type VerifyState = "checking" | "confirmed" | "pending" | "failed";

export default function PaymentResultPage() {
    const searchParams = useSearchParams();
    const params = useParams();
    const router = useRouter();

    const urlStatus = searchParams.get("status"); // "success" | "failed"
    const oid = searchParams.get("oid");           // merchant_oid (webhook redirect'ten gelir)
    const slug = params.slug as string;

    // PayTR'nin "başarılı" dediği ama webhook'u DB'ye yazmış mı kontrol ediyoruz
    const [verifyState, setVerifyState] = useState<VerifyState>(
        urlStatus === "success" ? "checking" : "failed"
    );
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 8; // 8 × 1.5sn = ~12 sn max bekleme

    useEffect(() => {
        // Başarısız ödemelerde polling'e gerek yok
        if (urlStatus !== "success") return;

        async function verifyPayment() {
            // Önce klinik slug'ından clinic_id'yi bul
            const { data: clinicData } = await supabase
                .from("clinics")
                .select("id, subscription_status")
                .eq("slug", slug)
                .maybeSingle();

            if (!clinicData) return;

            // Seçenek 1: paytr_orders kaydı "paid" olduysa webhook gelmiş demektir
            if (oid) {
                const { data: order } = await supabase
                    .from("paytr_orders")
                    .select("status")
                    .eq("merchant_oid", oid)
                    .maybeSingle();

                if (order?.status === "paid") {
                    setVerifyState("confirmed");
                    return;
                }
            }

            // Seçenek 2: Klinik subscription_status "active" olduysa da onaylı
            if (clinicData.subscription_status === "active") {
                setVerifyState("confirmed");
                return;
            }

            // Webhook henüz gelmedi
            setAttempts(prev => {
                const next = prev + 1;
                if (next >= MAX_ATTEMPTS) {
                    // Maksimum beklemeye ulaştık — URL'e güvenip "success" göster
                    setVerifyState("pending");
                }
                return next;
            });
        }

        if (verifyState === "checking" && attempts < MAX_ATTEMPTS) {
            const timer = setTimeout(verifyPayment, 1500);
            return () => clearTimeout(timer);
        }
    }, [verifyState, attempts, urlStatus, slug, oid]);

    const isSuccess = verifyState === "confirmed" || verifyState === "pending";
    const isChecking = verifyState === "checking";

    // ── Yükleniyor durumu ───────────────────────────────────────────────────
    if (isChecking) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="max-w-md w-full mx-auto text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-2xl shadow-indigo-100">
                            <Loader2 className="h-12 w-12 text-white animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ödeme Doğrulanıyor</h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Ödeme işleminiz onaylanıyor, lütfen bekleyin…
                        </p>
                    </div>
                    <div className="flex justify-center gap-1.5 pt-2">
                        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                    i < attempts ? "bg-indigo-400" : "bg-slate-200"
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Sonuç ekranı ────────────────────────────────────────────────────────
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="max-w-md w-full mx-auto text-center space-y-8">

                {/* İkon */}
                <div className="flex justify-center">
                    <div className={`h-28 w-28 rounded-full flex items-center justify-center shadow-2xl ${
                        isSuccess
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-100"
                            : "bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-100"
                    }`}>
                        {isSuccess
                            ? <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={1.5} />
                            : <XCircle className="h-14 w-14 text-white" strokeWidth={1.5} />
                        }
                    </div>
                </div>

                {/* Başlık */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {isSuccess ? "Ödeme Başarılı!" : "Ödeme Başarısız"}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        {isSuccess
                            ? verifyState === "confirmed"
                                ? "Aboneliğiniz başarıyla aktive edildi. NextGency OS Premium'u tam kapasite kullanmaya başlayabilirsiniz."
                                : "Ödemeniz alındı. Aboneliğiniz birkaç dakika içinde aktive edilecektir."
                            : "Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz."}
                    </p>
                </div>

                {/* Detay kutusu */}
                <div className={`rounded-2xl border p-6 text-left space-y-3 ${
                    isSuccess
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-rose-50 border-rose-100"
                }`}>
                    {isSuccess ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-sm font-bold text-emerald-800">
                                    {verifyState === "confirmed"
                                        ? "Abonelik durumu: Aktif"
                                        : "Ödeme kaydedildi, aktivasyon bekleniyor"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-sm font-bold text-emerald-800">
                                    Ödeme geçmişinizde görüntüleyebilirsiniz
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-sm font-bold text-emerald-800">
                                    Fatura e-posta adresinize gönderildi
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                <span className="text-sm font-bold text-rose-800">Kart bakiyenizi kontrol edin</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                <span className="text-sm font-bold text-rose-800">Kart bilgilerinin doğruluğundan emin olun</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                <span className="text-sm font-bold text-rose-800">Sorun devam ederse bankanızla iletişime geçin</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Butonlar */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.push(`/${slug}/admin/subscription`)}
                        className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                            isSuccess
                                ? "bg-black text-white hover:bg-slate-800 shadow-slate-200"
                                : "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100"
                        }`}
                    >
                        {isSuccess ? (
                            <span className="flex items-center justify-center gap-2">
                                <ArrowLeft size={16} />
                                Abonelik Sayfasına Dön
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <RefreshCw size={16} />
                                Tekrar Dene
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => router.push(`/${slug}`)}
                        className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        Ana Sayfaya Git
                    </button>
                </div>
            </div>
        </div>
    );
}
