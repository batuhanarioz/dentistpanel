"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Copy, Check, Gift, Users, Award, Share2,
    Clock, CheckCircle2, AlertCircle, Lock,
} from "lucide-react";

type ConversionStatus = "pending" | "converted" | "rewarded";

interface Conversion {
    id: string;
    clinic_name: string;
    status: ConversionStatus;
    invited_at: string;
    converted_at: string | null;
}

interface ReferralStats {
    referral_code: string | null;
    referral_code_active: boolean;
    total: number;
    converted: number;
    rewarded: number;
    reward_months_remaining: number;
    reward_limit: number;
    list: Conversion[];
}

const STATUS_CONFIG: Record<ConversionStatus, { label: string; icon: React.ElementType; cls: string }> = {
    pending:   { label: "Deneme Aşamasında", icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" },
    converted: { label: "Aboneliğe Geçti",   icon: CheckCircle2, cls: "bg-teal-50 text-teal-700 border-teal-200" },
    rewarded:  { label: "Ödül Verildi",      icon: Gift,         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function formatDate(iso: string) {
    return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric", month: "short", year: "numeric",
    }).format(new Date(iso));
}

export function ReferralSection({ clinicId }: { clinicId: string }) {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/referral/stats", {
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setStats(await res.json());
    }, []);

    useEffect(() => { load(); }, [load]);

    // clinicId kullanılmadı lint için suppress
    void clinicId;

    const isActive = stats?.referral_code_active === true;
    const referralLink = isActive && stats?.referral_code
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://clinic.nextgency360.com"}/register?ref=${stats.referral_code}`
        : null;

    const limitReached = stats ? stats.rewarded >= stats.reward_limit : false;
    const progressPct  = stats ? Math.min(100, (stats.rewarded / stats.reward_limit) * 100) : 0;

    function copyLink() {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-6">
            {/* Başlık */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                    <Gift size={18} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Arkadaşına Öner</h3>
                    <p className="text-xs text-slate-500 font-medium">Her başarılı davet için 1 ay ücretsiz kazanın.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">

                {/* Aktif değilse kilitleme mesajı */}
                {stats && !isActive && (
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Lock size={22} className="text-slate-400" />
                        </div>
                        <div>
                            <p className="text-base font-black text-slate-800 mb-1">Referans programı kilitli</p>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">
                                Referans linkinizi elde etmek için ilk abonelik ödemesini tamamlamanız gerekiyor.
                                Ödeme sonrası referans kodunuz otomatik olarak aktif hale gelir.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                            <CheckCircle2 size={14} className="text-teal-600" />
                            <span className="text-xs font-bold text-teal-700">Aboneliğe geçtikten sonra bu bölüm aktif olacak</span>
                        </div>
                    </div>
                )}

                {/* Yükleniyor */}
                {!stats && (
                    <div className="p-8 space-y-3 animate-pulse">
                        <div className="h-4 w-48 bg-slate-100 rounded-full" />
                        <div className="h-10 bg-slate-50 rounded-xl" />
                        <div className="h-8 w-32 bg-slate-100 rounded-full" />
                    </div>
                )}

                {/* Aktif görünüm */}
                {stats && isActive && (
                    <div className="p-6 sm:p-8 space-y-6">

                        {/* Limit uyarısı */}
                        {limitReached && (
                            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5">
                                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-amber-700">
                                    Maksimum {stats.reward_limit} aylık ödül limitine ulaştınız. Yeni davetleriniz kaydedilmeye devam eder ancak ek ödül verilmez.
                                </p>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Users,  label: "Davet Gönderilen", value: stats.total,     color: "text-slate-600" },
                                { icon: Award,  label: "Aboneliğe Geçen",  value: stats.converted, color: "text-teal-600" },
                                { icon: Gift,   label: "Kazanılan Ay",      value: stats.rewarded,  color: "text-emerald-600" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                                    <s.icon size={15} className={`${s.color} mx-auto mb-1.5`} />
                                    <p className="text-2xl font-black text-slate-900">{s.value}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödül Limiti</p>
                                <p className="text-xs font-black text-slate-600">{stats.rewarded} / {stats.reward_limit} ay</p>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${limitReached ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            {!limitReached && (
                                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                                    Daha <span className="font-black text-emerald-600">{stats.reward_months_remaining} ay</span> daha kazanabilirsiniz
                                </p>
                            )}
                        </div>

                        {/* Referral link */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Referans Linkiniz</p>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3">
                                <span className="text-xs font-mono text-slate-600 truncate flex-1">{referralLink}</span>
                                <span className="text-[10px] font-black text-slate-400 shrink-0">{stats.referral_code}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyLink}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                                        copied ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-700"
                                    }`}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "Kopyalandı!" : "Linki Kopyala"}
                                </button>
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`NextGency OS ile diş kliniğini çok daha verimli yönetebilirsin. ${referralLink}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black transition-all"
                                >
                                    <Share2 size={14} />
                                    WhatsApp
                                </a>
                            </div>
                        </div>

                        {/* Davet listesi */}
                        {stats.list.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Davet Geçmişi</p>
                                <div className="space-y-1">
                                    {stats.list.map((c) => {
                                        const cfg = STATUS_CONFIG[c.status];
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        <Users size={12} className="text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{c.clinic_name}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {formatDate(c.invited_at)}
                                                            {c.converted_at && ` → ${formatDate(c.converted_at)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${cfg.cls}`}>
                                                    <Icon size={10} />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Nasıl çalışır */}
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nasıl Çalışır?</p>
                            <div className="space-y-2.5">
                                {[
                                    "Referans linkinizi bir diş hekimi arkadaşınızla paylaşın",
                                    "Arkadaşınız linkinizden kayıt olup ücretsiz denemeyi başlatır",
                                    "Arkadaşınız ücretli aboneliğe geçtiğinde hesabınıza 1 ay eklenir",
                                ].map((text, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[9px] font-black text-teal-600">{i + 1}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{text}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-3">
                                Her referans için maksimum <span className="font-black text-slate-600">12 aylık ödül</span> kazanılabilir. Ödüller abonelik sürenize otomatik eklenir.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
