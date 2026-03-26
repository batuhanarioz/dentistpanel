"use client";

import { useState, useEffect, useCallback } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { Copy, Check, Gift, Users, Award, Share2 } from "lucide-react";

interface ReferralStats {
  referral_code: string | null;
  total: number;
  converted: number;
  rewarded: number;
}

export default function ReferPage() {
  usePageHeader("Arkadaşına Öner", "Referans programı");

  const { clinicId } = useClinic();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStats = useCallback(async () => {
    if (!clinicId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/referral/stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setStats(await res.json());
  }, [clinicId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const referralLink = stats?.referral_code
    ? `https://clinic.nextgency360.com/register?ref=${stats.referral_code}`
    : null;

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={18} className="text-teal-400" />
            <span className="text-teal-400 text-xs font-black uppercase tracking-widest">Referans Programı</span>
          </div>
          <h1 className="text-xl font-black mb-2 leading-tight">
            Her başarılı davet için<br />1 ay ücretsiz kazan
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Referans linkinizi paylaşın. Davet ettiğiniz klinik aboneliğe geçtiğinde hesabınıza otomatik olarak 1 aylık ücretsiz kullanım eklenir.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: "Davet Gönderilen", value: stats?.total ?? 0, color: "text-slate-600" },
          { icon: Award, label: "Aboneliğe Geçen", value: stats?.converted ?? 0, color: "text-teal-600" },
          { icon: Gift, label: "Kazanılan Ay", value: stats?.rewarded ?? 0, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 text-center">
            <s.icon size={16} className={`${s.color} mx-auto mb-1.5`} />
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
            <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Referans Linkiniz</p>
        {referralLink ? (
          <>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3">
              <span className="text-xs font-mono text-slate-600 truncate flex-1">{referralLink}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-700"
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
          </>
        ) : (
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Nasıl Çalışır?</p>
        <div className="space-y-3">
          {[
            { num: "1", text: "Referans linkinizi bir diş hekimi arkadaşınızla paylaşın" },
            { num: "2", text: "Arkadaşınız linkinizden kayıt olup ücretsiz denemeyi başlatır" },
            { num: "3", text: "Arkadaşınız ücretli aboneliğe geçtiğinde hesabınıza 1 ay eklenir" },
          ].map((s) => (
            <div key={s.num} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-teal-600">{s.num}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
