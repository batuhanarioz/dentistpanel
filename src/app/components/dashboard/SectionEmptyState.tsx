import React from "react";

interface SectionEmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    /** Tailwind gradient classes for the icon container, e.g. "from-emerald-400 to-teal-500" */
    gradient?: string;
    /** Tailwind shadow class for the icon container */
    shadow?: string;
}

export function SectionEmptyState({
    icon,
    title,
    description,
    gradient = "from-slate-300 to-slate-400",
    shadow = "shadow-slate-200/60",
}: SectionEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className={`bg-gradient-to-br ${gradient} shadow-lg ${shadow} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-bold text-slate-700">{title}</p>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
        </div>
    );
}
