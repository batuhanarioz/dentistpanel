"use client";

import { useEffect, useRef, useState } from "react";
import { localDateStr } from "@/lib/dateUtils";

const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE = { min: CURRENT_YEAR - 2, max: CURRENT_YEAR + 3 };

type Props = {
  value: string;
  onChange: (date: string) => void;
  today?: string;
  className?: string;
  /** Kompakt mod: daha küçük buton (form içi kullanım) */
  compact?: boolean;
};

export function PremiumDatePicker({ value, onChange, today: todayProp, className = "", compact }: Props) {
  const today = todayProp ?? localDateStr();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const [y, m] = value.split("-").map(Number);
    setView({ year: y, month: m - 1 });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayLabel = (() => {
    const [y, m, d] = value.split("-").map(Number);
    return `${d}.${String(m).padStart(2, "0")}.${y}`;
  })();

  const firstDay = new Date(view.year, view.month, 1);
  const lastDay = new Date(view.year, view.month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const grid: (number | null)[] = Array(startOffset).fill(null);
  for (let i = 1; i <= daysInMonth; i++) grid.push(i);
  const rows = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (view.month === 0) setView({ year: view.year - 1, month: 11 });
    else setView({ year: view.year, month: view.month - 1 });
  };
  const nextMonth = () => {
    if (view.month === 11) setView({ year: view.year + 1, month: 0 });
    else setView({ year: view.year, month: view.month + 1 });
  };

  const setMonth = (m: number) => setView((v) => ({ ...v, month: m }));
  const setYear = (y: number) => setView((v) => ({ ...v, year: y }));

  const buttonClass = compact
    ? "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full min-w-0"
    : "flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[140px] w-full";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </span>
        <span className="truncate">{displayLabel}</span>
        <svg className={`h-4 w-4 text-slate-400 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 min-w-[280px]">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ay</label>
              <select
                value={view.month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Yıl</label>
              <select
                value={view.year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {Array.from({ length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, (_, i) => YEAR_RANGE.min + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Önceki ay">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </button>
            <span className="text-sm font-semibold text-slate-800">{MONTH_NAMES[view.month]} {view.year}</span>
            <button type="button" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Sonraki ay">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="py-1.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {rows.map((row, ri) =>
              row.map((day, di) => {
                if (day === null) return <div key={`e-${ri}-${di}`} className="w-9 h-9" />;
                const dateStr = toDateStr(view.year, view.month, day);
                const isSelected = dateStr === value;
                const isToday = dateStr === today;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => { onChange(dateStr); setOpen(false); }}
                    className={[
                      "h-9 w-9 rounded-xl text-sm font-medium transition-colors",
                      isSelected ? "bg-indigo-600 text-white shadow-md" : "text-slate-700 hover:bg-slate-100",
                      isToday && !isSelected ? "ring-2 ring-indigo-300 ring-offset-1" : "",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Kapat</button>
            <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="flex-1 rounded-xl bg-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-200">Bugün</button>
          </div>
        </div>
      )}
    </div>
  );
}
