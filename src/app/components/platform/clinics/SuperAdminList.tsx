import React from "react";

interface SuperAdminUser {
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
}

interface SuperAdminListProps {
    superAdmins: SuperAdminUser[];
}

export function SuperAdminList({ superAdmins }: SuperAdminListProps) {
    if (superAdmins.length === 0) return null;

    return (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                        <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Super Admin Kullanıcıları</h2>
                </div>
            </div>
            <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                    {superAdmins.map((u) => (
                        <div
                            key={u.id}
                            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-[11px]"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                                {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{u.full_name || "-"}</p>
                                <p className="text-slate-500 truncate max-w-[180px]">{u.email || "-"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
