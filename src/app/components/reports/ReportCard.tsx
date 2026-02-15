import React from "react";

interface ReportCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    iconBg: string;
    children: React.ReactNode;
}

export function ReportCard({ title, subtitle, icon, iconBg, children }: ReportCardProps) {
    return (
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-slate-50/50 border-b px-5 py-4 flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
                    {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
                </div>
            </div>
            <div className="p-5 flex-1 min-h-[160px]">
                {children}
            </div>
        </section>
    );
}

export function EmptyState() {
    return (
        <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-slate-300">
            <svg className="h-10 w-10 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0h.5m-1.5 0h-9m1.5-3-1 3m10-3 1 3" />
            </svg>
            <p className="text-[11px] font-medium italic">Veri bulunamadı.</p>
        </div>
    );
}
