import React from "react";

interface SuperAdminUser {
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
}

interface SuperAdminListProps {
    superAdmins: SuperAdminUser[];
    onRevoke?: (id: string, name: string | null) => void;
    revokingId?: string | null;
}

export function SuperAdminList({ superAdmins, onRevoke, revokingId }: SuperAdminListProps) {
    if (superAdmins.length === 0) {
        return (
            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Henüz Super Admin yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {superAdmins.map((u) => (
                <div
                    key={u.id}
                    className="group flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-transparent hover:bg-white hover:border-violet-100 hover:shadow-lg hover:shadow-violet-50 transition-all duration-300"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-black text-white shadow-md group-hover:rotate-6 transition-transform shrink-0">
                        {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{u.full_name || "-"}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{u.email || "-"}</p>
                    </div>
                    {onRevoke && (
                        <button
                            onClick={() => onRevoke(u.id, u.full_name)}
                            disabled={revokingId === u.id}
                            className="shrink-0 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {revokingId === u.id ? "..." : "Yetkiyi Al"}
                        </button>
                    )}
                </div>
            ))}
            <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest pt-2">
                Yetkili kullanıcılar tüm klinik verilerine tam erişim hakkına sahiptir.
            </p>
        </div>
    );
}
