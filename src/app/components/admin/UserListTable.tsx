import React, { useState, useMemo } from "react";
import { UserRow } from "@/hooks/useAdminUsers";
import { UserRole } from "@/types/database";
import { ROLE_LABELS } from "@/constants/roles";

interface UserListTableProps {
    users: UserRow[];
    loading: boolean;
    isAdmin: boolean;
    onEditUser: (user: UserRow) => void;
}

const ROLE_FILTER_OPTIONS = [
    { value: "", label: "Tüm Roller" },
    { value: UserRole.ADMIN, label: "Yönetici" },
    { value: UserRole.DOKTOR, label: "Hekim" },
    { value: UserRole.SEKRETER, label: "Sekreter" },
    { value: UserRole.FINANS, label: "Finans" },
];

function formatLastSeen(dateStr: string | null): string {
    if (!dateStr) return "Hiç giriş yapılmadı";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR");
}

export function UserListTable({ users, loading, isAdmin, onEditUser }: UserListTableProps) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    const filtered = useMemo(() => {
        return users.filter(u => {
            if (!showInactive && !u.is_active) return false;
            if (roleFilter && u.role !== roleFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    (u.full_name?.toLowerCase().includes(q)) ||
                    (u.email?.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [users, search, roleFilter, showInactive]);

    const inactiveCount = users.filter(u => !u.is_active).length;

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="İsim veya e-posta ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="py-2 pl-3 pr-8 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 text-slate-700"
                >
                    {ROLE_FILTER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {inactiveCount > 0 && (
                    <button
                        onClick={() => setShowInactive(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${showInactive
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                    >
                        <span>Pasif</span>
                        <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${showInactive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {inactiveCount}
                        </span>
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-4">Kullanıcı</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4 hidden md:table-cell">Son Giriş</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Kayıt Tarihi</th>
                            <th className="px-6 py-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                                    {search || roleFilter ? "Arama kriterine uygun kullanıcı bulunamadı." : "Henüz kullanıcı yok."}
                                </td>
                            </tr>
                        ) : filtered.map((u) => (
                            <tr key={u.id} className={`group transition-colors hover:bg-slate-50/80 ${!u.is_active ? "opacity-50" : ""}`}>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold uppercase transition-transform group-hover:scale-110 shadow-sm border ${u.is_active
                                                    ? "bg-teal-50 text-teal-600 border-teal-100"
                                                    : "bg-slate-100 text-slate-400 border-slate-200"
                                                }`}>
                                                {u.full_name?.[0] || u.email?.[0] || "?"}
                                            </div>
                                            {!u.is_active && (
                                                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-slate-400 border border-white">
                                                    <svg className="h-1.5 w-1.5 text-white" fill="currentColor" viewBox="0 0 6 6">
                                                        <path d="M3 0a3 3 0 1 0 0 6A3 3 0 0 0 3 0z" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold transition-colors ${u.is_active ? "text-slate-900 group-hover:text-teal-700" : "text-slate-500"}`}>
                                                    {u.full_name || "İsimsiz"}
                                                </span>
                                                {!u.is_active && (
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">Pasif</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium">{u.email}</div>
                                            {u.specialty_code && (
                                                <div className="text-[10px] text-teal-600 font-medium mt-0.5">{u.specialty_code}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${u.role === UserRole.ADMIN ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                            u.role === UserRole.DOKTOR ? "bg-teal-50 text-teal-700 border-teal-100" :
                                                u.role === UserRole.SEKRETER ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                    "bg-slate-50 text-slate-600 border-slate-100"
                                        }`}>
                                        {ROLE_LABELS[u.role] || u.role}
                                    </span>
                                    {u.role !== UserRole.DOKTOR && u.is_clinical_provider && (
                                        <span className="ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-100">
                                            HEKİM
                                        </span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 hidden md:table-cell">
                                    <span className={`text-[11px] font-medium ${u.last_sign_in_at ? "text-slate-500" : "text-slate-300"}`}>
                                        {formatLastSeen(u.last_sign_in_at)}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 hidden sm:table-cell text-slate-500 text-[11px] font-medium">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString("tr-TR") : "-"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                    <button
                                        onClick={() => onEditUser(u)}
                                        disabled={!isAdmin}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Düzenle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
