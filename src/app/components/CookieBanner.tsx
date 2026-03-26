"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";

type ConsentType = "all" | "essential" | null;

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie_consent") as ConsentType;
    if (!stored) setVisible(true);
  }, []);

  function applyConsent(type: "all" | "essential") {
    localStorage.setItem("cookie_consent", type);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("cookie_consent_updated", { detail: type }));
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[300] p-3 md:p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)] border border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 p-2 bg-teal-50 rounded-xl shrink-0">
            <Cookie size={16} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800 mb-0.5">Çerez Politikası</p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              KVKK kapsamında; site deneyimini iyileştirmek ve analitik veriler toplamak için çerezler kullanıyoruz.
              Tercihlerinizi seçebilirsiniz.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => applyConsent("essential")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Yalnızca Zorunlu
          </button>
          <button
            onClick={() => applyConsent("all")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Kabul Et
          </button>
          <button
            onClick={() => applyConsent("essential")}
            className="p-2 rounded-xl text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
