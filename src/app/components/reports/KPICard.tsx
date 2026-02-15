import React from "react";

interface KPICardProps {
    value: string;
    label: string;
    icon: React.ReactNode;
    iconBg: string;
    valueColor: string;
    small?: boolean;
    onClick?: () => void;
    active?: boolean;
}

export function KPICard({ value, label, icon, iconBg, valueColor, small, onClick, active }: KPICardProps) {
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-left transition-all ${onClick ? "cursor-pointer hover:border-indigo-200 hover:shadow-md" : ""
                } ${active ? "ring-2 ring-indigo-500 ring-offset-2 border-indigo-200 shadow-sm" : ""}`}
        >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ${iconBg}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className={`font-bold tracking-tight ${small ? "text-sm" : "text-base"} ${valueColor}`}>{value}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
        </button>
    );
}
