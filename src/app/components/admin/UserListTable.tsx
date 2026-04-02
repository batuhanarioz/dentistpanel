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
    currentUserId: string | null;
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

export function UserListTable({ users, loading, isAdmin, currentUserId, onEditUser }: UserListTableProps) {
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
        }).sort((a, b) => {
            if (a.id === currentUserId) return -1;
            if (b.id === currentUserId) return 1;
            return 0;
        });
    }, [users, search, roleFilter, showInactive, currentUserId]);

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
            {/* Search & Filter - Modernized UI */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 shrink-0">
                <div className="relative group flex-1">
                    <input
                        type="search"
                        placeholder="İsim veya e-posta ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 transition-all outline-none group-hover:border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-medium"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <svg className="w-5 h-5 transition-transform group-focus-within:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="relative group min-w-[160px]">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm font-black text-slate-600 outline-none transition-all group-hover:border-slate-200 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 cursor-pointer"
                        >
                            {ROLE_FILTER_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-teal-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </div>
                    </div>

                    {inactiveCount > 0 && (
                        <button
                            onClick={() => setShowInactive(v => !v)}
                            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 whitespace-nowrap ${
                                showInactive
                                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200"
                                    : "bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:text-slate-700"
                            }`}
                        >
                            <span>Pasif</span>
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-black italic ${
                                showInactive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                                {inactiveCount}
                            </span>
                        </button>
                    )}
                </div>
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
                        const isMe = u.id === currentUserId;
                        const avatarColor = isMe ? "bg-slate-900 text-white" : (AVATAR_COLORS[u.role] ?? "bg-slate-100 text-slate-600");
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
                                                    {isMe && (
                                                        <span className="ml-1.5 text-[9px] font-black uppercase text-white bg-slate-900 px-1.5 py-0.5 rounded-md align-middle shadow-sm">Siz</span>
                                                    )}
                                                    {!u.is_active && (
                                                        <span className="ml-1.5 text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md align-middle">Pasif</span>
                                                    )}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                    <span className="text-[11px] text-slate-400 font-medium truncate shrink-1">{u.email}</span>
                                                    {u.phone && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-100/30 shadow-sm transition-all group/phone hover:bg-white hover:border-teal-200 shrink-0">
                                                            <svg className="w-2.5 h-2.5 text-teal-500 group-hover/phone:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                                            <span className="text-teal-700 text-[10px] font-black tracking-tight">{u.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {(isAdmin || isMe) && (
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
                                                    {isMe ? "Profilimi Düzenle" : "Düzenle"}
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
