"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import toast from "react-hot-toast";

interface ThemePreset {
  id: string;
  name: string;
  from: string;
  to: string;
}

const THEME_PRESETS: ThemePreset[] = [
  { id: "mint", name: "Mint", from: "#059669", to: "#34d399" },
  { id: "ocean", name: "Ocean", from: "#1e40af", to: "#60a5fa" },
  { id: "indigo", name: "Indigo", from: "#4f46e5", to: "#818cf8" },
  { id: "ruby", name: "Ruby", from: "#be123c", to: "#fb7185" },
  { id: "gold", name: "Amber", from: "#b45309", to: "#fbbf24" },
  { id: "slate", name: "Slate", from: "#1e293b", to: "#64748b" },
  { id: "violet", name: "Violet", from: "#7e22ce", to: "#c084fc" },
  { id: "peach", name: "Peach", from: "#ea580c", to: "#fdba74" },
  { id: "teal", name: "Teal", from: "#0d9488", to: "#10b981" }, // Orijinal teal seçeneği kalsın
];

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSettingsModal({ isOpen, onClose }: ThemeSettingsModalProps) {
  const { userId, themeColorFrom, themeColorTo } = useClinic();
  const [selectedFrom, setSelectedFrom] = useState(themeColorFrom || "#0d9488");
  const [selectedTo, setSelectedTo] = useState(themeColorTo || "#10b981");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          theme_color_from: selectedFrom,
          theme_color_to: selectedTo,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Tema güncellendi!");
      window.location.reload();
    } catch (err) {
      console.error("Tema kaydedilemedi:", err);
      toast.error("Hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[340px] bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Tema Seçimi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Görünümünü Kişiselleştir</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {THEME_PRESETS.map((preset) => {
              const isActive = selectedFrom === preset.from && selectedTo === preset.to;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedFrom(preset.from);
                    setSelectedTo(preset.to);
                  }}
                  className="flex flex-col items-center gap-2 group outline-none"
                >
                  <div
                    className={`h-12 w-12 rounded-full shadow-inner flex items-center justify-center transition-all duration-300 relative ${isActive ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-lg" : "hover:scale-105 group-active:scale-95 shadow-md"
                      }`}
                    style={{ background: `linear-gradient(to bottom right, ${preset.from}, ${preset.to})` }}
                  >
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                    }`}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-900 text-white text-xs font-black shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                "Uygula"
              )}
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold px-2">
              * Ayarlar kaydedildikten sonra sayfa yenilenecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
