import React from "react";
import { useClinic } from "@/app/context/ClinicContext";

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
    const { themeColorFrom: brandFrom = '#4f46e5' } = useClinic();
    
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-left transition-all ${onClick ? "cursor-pointer hover:shadow-md" : ""
                }`}
            style={{ 
                borderColor: active ? brandFrom : (onClick ? undefined : undefined),
                boxShadow: active ? `0 0 0 2px ${brandFrom}20` : undefined
            }}
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
