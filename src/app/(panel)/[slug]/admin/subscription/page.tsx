"use client";

import { useState, useEffect } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { AddonCard } from "@/app/components/subscription/AddonCard";
import { PayTRCheckoutModal } from "@/app/components/subscription/PayTRCheckoutModal";
import { ReferralSection } from "@/app/components/subscription/ReferralSection";
import type { PaymentHistory } from "@/types/database";
import {
    Check,
    ShieldCheck,
    CreditCard,
    Sparkles,
    History,
    AlertCircle,
    Calendar as CalendarIcon,
    ChevronRight,
    Zap,
    Users,
    BarChart3,
    MessageCircle,
    Package,
    X,
    RefreshCw,
    XCircle,
} from "lucide-react";

const billingPeriodTR: Record<string, string> = {
    monthly: "Aylık",
    annual: "Yıllık",
    pilot: "Pilot",
};

function openReceipt(payment: PaymentHistory, clinicName: string) {
    const period = billingPeriodTR[payment.billing_period] ?? payment.billing_period;
    const date = new Date(payment.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const receiptNo = `RCP-${payment.id.slice(0, 8).toUpperCase()}`;
    const amountFormatted = `${payment.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${payment.currency}`;

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Makbuz ${receiptNo} — NextGency OS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px 16px;
    }

    .page {
      width: 100%;
      max-width: 640px;
    }

    /* ── Kart ── */
    .card {
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,.06), 0 10px 15px -3px rgba(0,0,0,.05);
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      padding: 36px 40px 32px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(20,184,166,.12);
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -40px; left: 40px;
      width: 120px; height: 120px;
      border-radius: 50%;
      background: rgba(20,184,166,.08);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }
    .brand-icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #14b8a6, #0d9488);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .brand-name {
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      color: rgba(255,255,255,0.5);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      position: relative;
      z-index: 1;
    }
    .header-title {
      color: rgba(255,255,255,0.6);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .header-receipt {
      color: #ffffff;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(20,184,166,.2);
      border: 1px solid rgba(20,184,166,.35);
      color: #5eead4;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 100px;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #2dd4bf;
    }

    /* ── Body ── */
    .body {
      padding: 36px 40px;
    }

    /* ── Billing info strip ── */
    .billing-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 20px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .billing-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .billing-value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    /* ── Line items ── */
    .section-label {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .items-table thead tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table thead th {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 0 0 10px;
      text-align: left;
    }
    .items-table thead th:last-child {
      text-align: right;
    }
    .items-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .items-table tbody tr:last-child {
      border-bottom: none;
    }
    .items-table td {
      padding: 14px 0;
      font-size: 13px;
      color: #334155;
    }
    .items-table td:last-child {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    .item-name {
      font-weight: 600;
      color: #0f172a;
    }
    .item-desc {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      margin-top: 2px;
    }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }

    /* ── Total ── */
    .total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: #0f172a;
      border-radius: 16px;
      margin-top: 20px;
    }
    .total-label {
      color: rgba(255,255,255,0.6);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .total-amount {
      color: #ffffff;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    /* ── Footer ── */
    .footer {
      padding: 20px 40px 28px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .footer-note {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      line-height: 1.5;
    }
    .footer-note strong {
      color: #64748b;
      font-weight: 700;
    }

    /* ── Print button ── */
    .print-wrap {
      margin-top: 24px;
      text-align: center;
    }
    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 14px;
      padding: 13px 28px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: 0.3px;
      transition: background 0.15s;
    }
    .print-btn:hover { background: #1e293b; }

    @media print {
      body { background: white; padding: 0; }
      .card { box-shadow: none; border-radius: 0; }
      .print-wrap { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="brand">
          <div class="brand-icon">🦷</div>
          <div>
            <div class="brand-name">NextGency OS</div>
            <div class="brand-sub">Diş Kliniği Yönetim Sistemi</div>
          </div>
        </div>
        <div class="header-row">
          <div>
            <div class="header-title">Ödeme Makbuzu</div>
            <div class="header-receipt">${receiptNo}</div>
          </div>
          <div class="status-badge">
            <div class="status-dot"></div>
            Ödeme Başarılı
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="body">

        <!-- Billing strip -->
        <div class="billing-strip">
          <div>
            <div class="billing-label">Fatura Kesilen</div>
            <div class="billing-value">${clinicName}</div>
          </div>
          <div>
            <div class="billing-label">Ödeme Tarihi</div>
            <div class="billing-value">${date}</div>
          </div>
        </div>

        <!-- Line items -->
        <div class="section-label">Ödeme Detayı</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Ürün / Hizmet</th>
              <th style="text-align:right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="item-name">${payment.package_name}</div>
                <div class="item-desc">${period} Plan · Bulut tabanlı klinik yönetim yazılımı</div>
              </td>
              <td>${amountFormatted}</td>
            </tr>
          </tbody>
        </table>

        <!-- Total -->
        <div class="total-row">
          <div class="total-label">Toplam Ödenen</div>
          <div class="total-amount">${amountFormatted}</div>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-note">
          <strong>NextGency Yapay Zeka Ajansı</strong><br>
          Bu makbuz elektronik olarak oluşturulmuştur.<br>
          Makbuz No: ${receiptNo}
        </div>
        <div class="footer-note" style="text-align:right">
          Destek: <strong>hello@nextgency360.com</strong>
        </div>
      </div>

    </div>

    <!-- Print button -->
    <div class="print-wrap">
      <button class="print-btn" onclick="window.print()">
        ⬇ Yazdır / PDF Olarak Kaydet
      </button>
    </div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w?.document.write(html);
    w?.document.close();
}

export default function SubscriptionPage() {
    const clinic = useClinic();
    usePageHeader("Abonelik & Destek");

    // Trial hesaplarda billing_cycle "monthly" default kayıtlı olabilir.
    // Deneme kullanıcısına her zaman "annual" göster (daha avantajlı planı öne çıkar).
    const isTrial = clinic.subscriptionStatus === "trialing";
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual" | "pilot">(
        isTrial ? "annual" : ((clinic.billingCycle as "monthly" | "annual" | "pilot") ?? "annual")
    );
    const [payments, setPayments] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);


    useEffect(() => {
        async function fetchPayments() {
            if (!clinic.clinicId) return;
            const { data } = await supabase
                .from("payment_history")
                .select("id, package_name, billing_period, amount, currency, status, invoice_url, created_at")
                .eq("clinic_id", clinic.clinicId)
                .eq("status", "paid")
                .order("created_at", { ascending: false });
            if (data) setPayments(data as PaymentHistory[]);
            setLoading(false);
        }
        fetchPayments();
    }, [clinic.clinicId]);

    const monthlyPrice = 1199;
    const annualPrice = 11990;         // actual charge (full year)
    const annualPricePerMonth = 999;   // marketing display (per month equivalent)
    // displayPrice: shown in plan card UI ("/ ay")
    let displayPrice = billingCycle === "monthly" ? monthlyPrice : annualPricePerMonth;
    if (billingCycle === "pilot") displayPrice = 0;
    // checkoutPrice: actual amount charged via PayTR
    let checkoutPrice = billingCycle === "monthly" ? monthlyPrice : annualPrice;
    if (billingCycle === "pilot") checkoutPrice = 0;

    const features = [
        { icon: CalendarIcon, text: "Sınırsız Randevu Yönetimi" },
        { icon: Users, text: "Sınırsız Hasta Kaydı ve Takibi" },
        { icon: Zap, text: "Sınırsız Hekim ve Personel Tanımı" },
        { icon: CreditCard, text: "Gelişmiş Finansal Yönetim & Kasa" },
        { icon: BarChart3, text: "Detaylı Klinik Analiz Raporları" },
        { icon: ShieldCheck, text: "Bulut Tabanlı %100 Güvenli Veri" },
        { icon: MessageCircle, text: "7/24 Teknik Destek & Eğitim" },
    ];

    // isAdmin olmayan roller de sayfayı görebilir ama hassas bölümler gizlenir

    const trialDaysLeft = clinic.currentPeriodEnd
        ? Math.max(0, Math.ceil((new Date(clinic.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const isTrialExpiringSoon = isTrial && trialDaysLeft <= 7;
    const visibleAddons = clinic.clinicAddons ?? [];

    // Yıllık aktif abonelik varken aylık plana geçişi engelle
    // "Ödeme Yöntemini Güncelle" — sadece dönem bitmesine ≤30 gün kaldığında göster
    // (Daha erken göstermek çifte ödeme riskine yol açar)
    const daysUntilExpiry = clinic.currentPeriodEnd
        ? Math.ceil((new Date(clinic.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    const showUpdatePaymentMethod =
        !isTrial &&
        clinic.subscriptionStatus === "active" &&
        daysUntilExpiry !== null &&
        daysUntilExpiry <= 30;

    const isAnnualActive =
        !isTrial &&
        clinic.billingCycle === "annual" &&
        clinic.subscriptionStatus === "active" &&
        !!clinic.currentPeriodEnd &&
        new Date(clinic.currentPeriodEnd) > new Date();

    const isBlockedDowngrade = isAnnualActive && billingCycle === "monthly";

    const periodEndFormatted = clinic.currentPeriodEnd
        ? new Date(clinic.currentPeriodEnd).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
        : "";

    return (
        <>
            <PayTRCheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                billingCycle={billingCycle === "pilot" ? "monthly" : billingCycle}
                amountTL={checkoutPrice}
                prices={{ monthly: monthlyPrice, annual: annualPrice }}
                onSuccess={() => { setShowCheckout(false); window.location.reload(); }}
            />

            {/* İptal Onay Modalı */}
            {showCancelModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-rose-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">Aboneliği İptal Et</p>
                                    <p className="text-[10px] text-slate-400 font-medium">NextGency OS Premium</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                                <p className="text-xs font-black text-rose-800 mb-1">Bunu bilmenizi istiyoruz</p>
                                <p className="text-xs text-rose-700 font-medium leading-relaxed">
                                    İptal talebiniz destek ekibimize iletilecektir. Mevcut aboneliğiniz
                                    {periodEndFormatted ? <> <span className="font-black">{periodEndFormatted}</span> tarihine</> : " dönem sonuna"} kadar
                                    {" "}tam erişimle aktif kalmaya devam eder.
                                </p>
                            </div>

                            <div className="space-y-2 text-xs text-slate-500 font-medium">
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Check size={10} className="text-slate-500" />
                                    </div>
                                    Dönem sonuna kadar tüm verilere erişiminiz devam eder
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Check size={10} className="text-slate-500" />
                                    </div>
                                    Hasta kayıtları ve verileriniz güvende tutulur
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Check size={10} className="text-slate-500" />
                                    </div>
                                    İptal işlemi için destek ekibimiz sizi yönlendirecektir
                                </div>
                            </div>

                            {cancelError && (
                                <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                                    <AlertCircle size={12} /> {cancelError}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowCancelModal(false); setCancelError(null); }}
                                    className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    disabled={cancelLoading}
                                    onClick={async () => {
                                        setCancelLoading(true);
                                        setCancelError(null);
                                        try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const res = await fetch("/api/subscription/cancel", {
                                                method: "POST",
                                                headers: { Authorization: `Bearer ${session?.access_token}` },
                                            });
                                            if (res.ok) {
                                                setShowCancelModal(false);
                                                window.location.reload();
                                            } else {
                                                const err = await res.json().catch(() => ({}));
                                                setCancelError(err.error ?? "İptal işlemi başarısız oldu.");
                                            }
                                        } catch {
                                            setCancelError("Bağlantı hatası. Lütfen tekrar deneyin.");
                                        } finally {
                                            setCancelLoading(false);
                                        }
                                    }}
                                    className="flex-1 bg-rose-500 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {cancelLoading ? (
                                        <><span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> İptal ediliyor...</>
                                    ) : "Aboneliği İptal Et"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto space-y-8 pb-12">

                {/* Deneme süresi uyarı banner'ı — yalnızca admin */}
                {isTrialExpiringSoon && clinic.isAdmin && (
                    <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-4 shadow-lg shadow-amber-100 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white">
                                Deneme süreniz {trialDaysLeft === 0 ? "bugün" : `${trialDaysLeft} gün sonra`} sona eriyor!
                            </p>
                            <p className="text-xs text-white/80 font-medium">
                                Kesintisiz kullanım için aşağıdan bir plan seçerek aboneliğinizi başlatın.
                            </p>
                        </div>
                        <button
                            onClick={() => document.getElementById("plan-selector")?.scrollIntoView({ behavior: "smooth" })}
                            className="shrink-0 bg-white text-amber-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-amber-50 transition-all"
                        >
                            Plan Seç
                        </button>
                    </div>
                )}

                {/* ── 1. Mevcut Abonelik + Destek ──────────────────────────────── */}
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -m-8 h-32 w-32 rounded-full bg-indigo-50/50 blur-3xl group-hover:bg-indigo-100/50 transition-colors" />
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mevcut Abonelik</h3>
                                    {isTrial ? (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm animate-pulse">
                                            Ücretsiz Deneme
                                        </span>
                                    ) : (
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm">
                                            Aktif Abonelik
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {clinic.billingCycle === "pilot" ? "Pilot Klinik Paketi" : "NextGency OS Premium"}
                                </h2>
                                <p className="text-slate-500 text-sm mt-1 font-medium">
                                    {isTrial
                                        ? trialDaysLeft > 0
                                            ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı.`
                                            : "Deneme süreniz doldu. Devam etmek için bir plan seçin."
                                        : clinic.billingCycle === "annual"
                                            ? "Yıllık Plan • Avantajlı Kullanım"
                                            : clinic.billingCycle === "pilot"
                                                ? "Pilot Klinik Paketi"
                                                : "Aylık Plan • Esnek Kullanım"}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-xs font-bold text-slate-700">Sistem Durumu: Aktif</span>
                                </div>
                                {clinic.currentPeriodEnd && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {isTrial ? "Deneme Bitiş" : "Sıradaki Ödeme"}
                                        </p>
                                        <p className="text-sm font-black text-slate-900">
                                            {new Date(clinic.currentPeriodEnd).toLocaleDateString("tr-TR", {
                                                day: "numeric", month: "long", year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {clinic.isAdmin && (
                            <div className="mt-8 flex flex-wrap gap-3">
                                <button
                                    onClick={() => {
                                        if (isTrial) {
                                            document.getElementById("plan-selector")?.scrollIntoView({ behavior: "smooth" });
                                        } else {
                                            setShowCheckout(true);
                                        }
                                    }}
                                    className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    {isTrial ? "Plan Seç" : "Planı Değiştir / Yenile"}
                                </button>
                                {!isTrial && clinic.subscriptionStatus === "active" && (
                                    <>
                                        {showUpdatePaymentMethod && (
                                            <button
                                                onClick={() => setShowCheckout(true)}
                                                className="flex items-center gap-2 border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                            >
                                                <RefreshCw size={14} />
                                                Ödeme Yöntemini Güncelle
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="flex items-center gap-2 border border-rose-200 text-rose-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95"
                                        >
                                            <XCircle size={14} />
                                            Aboneliği İptal Et
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-black mb-2">Desteğe mi ihtiyacınız var?</h3>
                            <p className="text-slate-400 text-xs leading-relaxed font-medium">
                                Fatura işlemleri veya paket seçimleri hakkında her zaman bizimle iletişime geçebilirsiniz.
                            </p>
                        </div>
                        <button
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onClick={() => (window as any).openSupportModal?.()}
                            className="flex items-center justify-between w-full mt-8 group text-left"
                        >
                            <span className="text-xs font-black uppercase tracking-widest group-hover:text-teal-400 transition-colors">
                                Destek Merkezine Git
                            </span>
                            <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-teal-400 group-hover:text-teal-400 transition-all">
                                <ChevronRight size={20} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* ── 2. Eklentilerim ───────────────────────────────────────────── */}
                {visibleAddons.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-100">
                                <Package size={18} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Eklentiler</h3>
                                <p className="text-xs text-slate-500 font-medium">Veriminizi arttırabilecek NextGency Teknolojileri</p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleAddons.map((addon) => (
                                <AddonCard key={addon.id} addon={addon} clinic={clinic} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 3. Paket Seçenekleri — yalnızca admin ────────────────────── */}
                {clinic.isAdmin && <div id="plan-selector" className="pt-2">
                    {/* Başlık + Toggle tek satırda */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Planınızı Seçin</h2>
                            <p className="text-slate-500 text-xs font-medium mt-0.5">Aboneliğinizi başlatın veya değiştirin.</p>
                        </div>
                        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 self-start">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${billingCycle === "monthly" ? "bg-black text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                Aylık
                            </button>
                            <button
                                onClick={() => setBillingCycle("annual")}
                                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${billingCycle === "annual" ? "bg-black text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                Yıllık
                                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">%20</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Premium Plan Kartı */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Üst: fiyat + başlık */}
                            <div className="p-6 flex items-center justify-between gap-4 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-100 shrink-0">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">NextGency OS Premium</h3>
                                        <p className="text-slate-400 text-xs font-medium">Sınırsız kullanım, tüm özellikler</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {displayPrice.toLocaleString("tr-TR")} ₺
                                        </span>
                                        {billingCycle !== "pilot" && <span className="text-sm text-slate-400 font-bold">/ ay</span>}
                                    </div>
                                    {billingCycle === "annual" && (
                                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                            Toplam {annualPrice.toLocaleString("tr-TR")} ₺ / yıl
                                        </p>
                                    )}
                                    {billingCycle === "monthly" && (
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                            Yıllıkta 2.400 ₺ tasarruf
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Özellikler kompakt grid */}
                            <div className="px-6 py-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                                {features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Check size={13} className="text-teal-500 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-600">{feature.text}</span>
                                    </div>
                                ))}
                            </div>
                            {/* CTA */}
                            <div className="px-6 pb-6 pt-3">
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    disabled={
                                        isBlockedDowngrade ||
                                        (!isTrial && clinic.billingCycle === billingCycle && clinic.subscriptionStatus === "active")
                                    }
                                    className="w-full bg-black text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isBlockedDowngrade
                                        ? `Aboneliğiniz ${periodEndFormatted} tarihine kadar aktif`
                                        : !isTrial && clinic.billingCycle === billingCycle && clinic.subscriptionStatus === "active"
                                            ? "Mevcut Planınız"
                                            : isTrial
                                                ? "Denemeyi Bitir, Aboneliği Başlat"
                                                : "Bu Plana Geçiş Yap"}
                                </button>
                            </div>
                        </div>

                        {/* Pilot Klinik Kartı */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 opacity-10 translate-x-4 -translate-y-2">
                                <Sparkles size={80} />
                            </div>
                            <div>
                                <h3 className="text-base font-black mb-2 tracking-tight">Pilot Kliniğimiz Olun</h3>
                                <p className="text-indigo-200 text-xs leading-relaxed mb-4 font-medium">
                                    Kliniğinize özel çözümler ve öncelikli destekle sisteme entegrasyon sağlayın.
                                </p>
                                <ul className="space-y-2 mb-5">
                                    <li className="flex items-center gap-2 text-xs font-bold">
                                        <div className="bg-white/20 p-0.5 rounded-md"><Check size={12} /></div>
                                        1 Ay Ücretsiz Kullanım
                                    </li>
                                    <li className="flex items-center gap-2 text-xs font-bold">
                                        <div className="bg-white/20 p-0.5 rounded-md"><Check size={12} /></div>
                                        Özel Revize Talepleri
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => window.open(`https://wa.me/905444412180?text=${encodeURIComponent("Merhaba, Pilot Klinik programınız hakkında bilgi almak istiyorum.")}`, "_blank")}
                                className="w-full bg-white text-indigo-700 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
                            >
                                Detaylı Bilgi & Başvuru
                            </button>
                        </div>
                    </div>
                </div>}

                {/* ── 4. Ödeme Geçmişi — yalnızca admin ───────────────────────── */}
                {clinic.isAdmin && <div className="pt-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ödeme Geçmişi</h3>
                            <p className="text-xs text-slate-500 font-medium">Geçmiş ödemeleriniz ve fatura dökümleri.</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutar</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <>
                                            {[...Array(3)].map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td className="px-8 py-5"><div className="h-3 w-20 bg-slate-100 rounded-full" /></td>
                                                    <td className="px-8 py-5">
                                                        <div className="h-3 w-32 bg-slate-100 rounded-full mb-1.5" />
                                                        <div className="h-2 w-20 bg-slate-50 rounded-full" />
                                                    </td>
                                                    <td className="px-8 py-5"><div className="h-3 w-16 bg-slate-100 rounded-full" /></td>
                                                    <td className="px-8 py-5"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
                                                    <td className="px-8 py-5 text-right"><div className="h-3 w-20 bg-slate-100 rounded-full ml-auto" /></td>
                                                </tr>
                                            ))}
                                        </>
                                    ) : payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-14 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-100">
                                                        <CreditCard className="h-6 w-6 text-white" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700">Henüz ödeme kaydı bulunmuyor</p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        İlk abonelik ödemesinin ardından faturalarınız burada görünecektir.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {new Date(payment.created_at).toLocaleDateString("tr-TR")}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-xs font-bold text-slate-800">{payment.package_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{billingPeriodTR[payment.billing_period] ?? payment.billing_period}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-black text-slate-900">
                                                        {payment.amount.toLocaleString("tr-TR")} {payment.currency}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${payment.status === "paid" ? "bg-emerald-100 text-emerald-700"
                                                        : payment.status === "failed" ? "bg-rose-100 text-rose-700"
                                                            : "bg-amber-100 text-amber-700"
                                                        }`}>
                                                        <div className={`h-1 w-1 rounded-full ${payment.status === "paid" ? "bg-emerald-500"
                                                            : payment.status === "failed" ? "bg-rose-500"
                                                                : "bg-amber-500"
                                                            }`} />
                                                        {payment.status === "paid" ? "Başarılı" : payment.status === "failed" ? "Hata" : "Beklemede"}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    {payment.invoice_url ? (
                                                        <a
                                                            href={payment.invoice_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1 ml-auto"
                                                        >
                                                            Faturayı İndir
                                                            <ChevronRight size={14} />
                                                        </a>
                                                    ) : (
                                                        <button
                                                            onClick={() => openReceipt(payment, clinic.clinicName ?? "")}
                                                            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors flex items-center gap-1 ml-auto"
                                                        >
                                                            Makbuz
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>}

                {/* ── 5. Arkadaşına Öner — yalnızca admin ─────────────────── */}
                {clinic.isAdmin && clinic.clinicId && (
                    <div className="pt-4">
                        <ReferralSection clinicId={clinic.clinicId} />
                    </div>
                )}
            </div>
        </>
    );
}
