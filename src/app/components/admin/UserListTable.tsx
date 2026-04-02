"use client";

import React, { useState, useMemo } from "react";
import { UserRole } from "@/types/database";
import { UserRow } from "@/hooks/useAdminUsers";
import { ROLE_LABELS, ROLE_BADGE_COLORS } from "@/constants/roles";
import { useClinic } from "@/app/context/ClinicContext";

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

const AVATAR_COLORS: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: "bg-purple-100 text-purple-700",
    [UserRole.ADMIN]:       "bg-teal-100 text-teal-700",
    [UserRole.DOKTOR]:      "bg-blue-100 text-blue-700",
    [UserRole.SEKRETER]:    "bg-amber-100 text-amber-700",
    [UserRole.FINANS]:      "bg-emerald-100 text-emerald-700",
};

function formatLastSeen(dateStr: string | null): string {
    if (!dateStr) return "Hiç giriş yapılmadı";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR");
}

function getInitials(name: string | null, email: string | null): string {
    if (name) {
        const parts = name.trim().split(" ");
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    }
    return (email?.[0] ?? "?").toUpperCase();
}

export function UserListTable({ users, loading, isAdmin, onEditUser }: UserListTableProps) {
    const { themeColorFrom: brandFrom = '#4f46e5' } = useClinic();
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
                    u.full_name?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [users, search, roleFilter, showInactive]);

    const inactiveCount = users.filter(u => !u.is_active).length;

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div 
                    className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" 
                    style={{ borderColor: brandFrom }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filtreler */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="İsim veya e-posta ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white outline-none transition-all"
                        style={{ boxShadow: `0 0 0 0 ${brandFrom}20` }}
                        onFocus={e => e.currentTarget.style.boxShadow = `0 0 0 4px ${brandFrom}20`}
                        onBlur={e => e.currentTarget.style.boxShadow = `0 0 0 0 ${brandFrom}20`}
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="py-2.5 pl-3 pr-8 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 text-slate-700 transition-all"
                >
                    {ROLE_FILTER_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {inactiveCount > 0 && (
                    <button
                        onClick={() => setShowInactive(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                            showInactive
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <span>Pasif</span>
                        <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${
                            showInactive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                            {inactiveCount}
                        </span>
                    </button>
                )}
            </div>

            {/* Kart Listesi */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                        {search || roleFilter ? "Arama kriterine uygun kullanıcı bulunamadı." : "Henüz kullanıcı yok."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filtered.map(u => {
                        const avatarColor = AVATAR_COLORS[u.role] ?? "bg-slate-100 text-slate-600";
                        const badgeColor = ROLE_BADGE_COLORS[u.role] ?? "bg-slate-100 text-slate-600 border-slate-200";
                        const initials = getInitials(u.full_name, u.email);

                        return (
                            <div
                                key={u.id}
                                className={`relative bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group ${!u.is_active ? "opacity-50" : ""}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${avatarColor}`}>
                                        {initials}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Üst satır: isim + düzenle */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900 text-[13px] leading-tight truncate">
                                                    {u.full_name || "İsimsiz"}
                                                    {!u.is_active && (
                                                        <span className="ml-1.5 text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md align-middle">Pasif</span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-medium truncate">{u.email}</p>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => onEditUser(u)}
                                                    className="shrink-0 h-7 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 transition-all active:scale-95"
                                                    style={{ '--brand': brandFrom } as any}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.borderColor = brandFrom;
                                                        e.currentTarget.style.background = `${brandFrom}10`;
                                                        e.currentTarget.style.color = brandFrom;
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.borderColor = '';
                                                        e.currentTarget.style.background = '';
                                                        e.currentTarget.style.color = '';
                                                    }}
                                                >
                                                    Düzenle
                                                </button>
                                            )}
                                        </div>

                                        {/* Rol rozetleri */}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${badgeColor}`}>
                                                {ROLE_LABELS[u.role] ?? u.role}
                                            </span>
                                            {u.is_clinical_provider && u.role !== UserRole.DOKTOR && (
                                                <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-100">
                                                    Hekim
                                                </span>
                                            )}
                                            {u.specialty_code && (
                                                <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium border bg-slate-50 text-slate-500 border-slate-100">
                                                    {u.specialty_code}
                                                </span>
                                            )}
                                        </div>

                                        {/* Son giriş (Sadece admin görebilir) */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5 mt-2.5 transition-opacity group-hover:opacity-100 opacity-80">
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.last_sign_in_at && (Date.now() - new Date(u.last_sign_in_at).getTime()) < 3600000 ? "bg-emerald-400" : "bg-slate-200"}`} />
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {formatLastSeen(u.last_sign_in_at)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
