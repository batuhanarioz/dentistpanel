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
        <div className="rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
            <div className="bg-slate-50/50 border-b px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-100">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">Super Admins</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Platform Yetkilileri</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-3">
                    {superAdmins.map((u) => (
                        <div
                            key={u.id}
                            className="group flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-transparent hover:bg-white hover:border-violet-100 hover:shadow-lg hover:shadow-violet-50 transition-all duration-300"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-black text-white shadow-md group-hover:rotate-6 transition-transform">
                                {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{u.full_name || "-"}</p>
                                <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{u.email || "-"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/30 border-t">
                <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest leading-relaxed">
                    Yetkili kullanıcılar tüm klinik verilerine tam erişim hakkına sahiptir.
                </p>
            </div>
        </div>
    );
}
