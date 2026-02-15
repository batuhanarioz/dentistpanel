import React from "react";
import { UserRow } from "@/hooks/useAdminUsers";
import { UserRole } from "@/types/database";

const ROLE_LABELS: Record<string, string> = {
    [UserRole.ADMIN]: "Yönetici",
    [UserRole.DOKTOR]: "Doktor",
    [UserRole.SEKRETER]: "Sekreter",
    [UserRole.FINANS]: "Finans",
    [UserRole.SUPER_ADMIN]: "Süper Admin",
};

interface UserListTableProps {
    users: UserRow[];
    loading: boolean;
    isAdmin: boolean;
    onEditUser: (user: UserRow) => void;
}

export function UserListTable({ users, loading, isAdmin, onEditUser }: UserListTableProps) {
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Kullanıcı</th>
                        <th className="px-6 py-4">Rol</th>
                        <th className="px-6 py-4">Kayıt Tarihi</th>
                        <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic-none">
                    {users.map((u) => (
                        <tr key={u.id} className="group transition-colors hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 font-bold uppercase transition-transform group-hover:scale-110 shadow-sm border border-teal-100">
                                        {u.full_name?.[0] || u.email?.[0] || "?"}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                                            {u.full_name || "İsimsiz"}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            {u.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                        u.role === UserRole.DOKTOR ? 'bg-teal-50 text-teal-700 border-teal-100' :
                                            u.role === UserRole.SEKRETER ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-slate-50 text-slate-600 border-slate-100'
                                    }`}>
                                    {ROLE_LABELS[u.role] || u.role}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-500 text-[11px] font-medium">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : "-"}
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
    );
}
