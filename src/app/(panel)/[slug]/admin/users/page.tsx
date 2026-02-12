"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { ChangePasswordModal } from "@/app/components/ChangePasswordModal";
import { DeleteUserModal } from "@/app/components/DeleteUserModal";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

type ClinicRow = {
  id: string;
  name: string;
};

export default function AdminUsersPage() {
  const clinic = useClinic();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("ASSISTANT");
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("ASSISTANT");
  const [editSaving, setEditSaving] = useState(false);
  const [selfNewEmail, setSelfNewEmail] = useState("");
  const [selfOldPassword, setSelfOldPassword] = useState("");
  const [selfNewPassword, setSelfNewPassword] = useState("");
  const [selfNewPasswordRepeat, setSelfNewPasswordRepeat] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);
  const [selfMessage, setSelfMessage] = useState<string | null>(null);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [newClinicId, setNewClinicId] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteProtected, setDeleteProtected] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);

      // Önce giriş yapan kullanıcının rolünü al
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Oturum bulunamadı.");
        setLoading(false);
        return;
      }

      const { data: current, error: currentError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (currentError || !current) {
        setError("Kullanıcı profili alınamadı.");
        setLoading(false);
        return;
      }

      const isCurrentAdmin = current.role === "ADMIN" || current.role === "ADMIN_DOCTOR" || current.role === "SUPER_ADMIN";
      setIsAdmin(isCurrentAdmin);
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email ?? "");
      setSelfNewEmail(user.email ?? "");

      if (!isCurrentAdmin) {
        // Admin olmayan kullanıcılar için liste yükleme.
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message || "Kullanıcı listesi alınamadı.");
        setLoading(false);
        return;
      }

      setUsers(data || []);
      setLoading(false);

      // SUPER_ADMIN ise klinik listesini yükle
      if (current.role === "SUPER_ADMIN") {
        const { data: clinicData } = await supabase
          .from("clinics")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true });
        setClinics(clinicData || []);
      }
    };

    loadUsers();
  }, []);

  const refreshUsers = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message || "Kullanıcı listesi alınamadı.");
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: newEmail,
        fullName: newFullName,
        password: newPassword,
        role: newRole,
        ...(clinic.isSuperAdmin && newRole !== "SUPER_ADMIN" && newClinicId
          ? { clinicId: newClinicId }
          : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Kullanıcı oluşturulamadı.");
      setSaving(false);
      return;
    }

    setNewEmail("");
    setNewFullName("");
    setNewPassword("");
    setNewRole("ASSISTANT");
    setNewClinicId("");
    setSaving(false);
    await refreshUsers();
    setShowCreateModal(false);
  };

  const handleRoleChange = async (id: string, role: string) => {
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Rol güncellenemedi.");
      return;
    }

    await refreshUsers();
  };

  const openDeleteModal = (user: UserRow) => {
    const isProtected = user.role === "ADMIN" || user.role === "ADMIN_DOCTOR";
    setDeleteTarget(user);
    setDeleteProtected(isProtected);
  };

  const executeDeleteUser = async () => {
    if (!deleteTarget) return;

    const token = await getAccessToken();
    if (!token) throw new Error("Oturum bulunamadı.");

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: deleteTarget.id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kullanıcı silinemedi.");

    setShowEditModal(false);
    setSelectedUser(null);
    await refreshUsers();
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) return;

    setResetError(null);
    setResetSaving(true);

    const token = await getAccessToken();
    if (!token) {
      setResetError("Oturum bulunamadı.");
      setResetSaving(false);
      return;
    }

    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: resetUserId, password: resetPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error || "Şifre güncellenemedi.");
      setResetSaving(false);
      return;
    }

    setResetSuccess(true);
    setResetSaving(false);
  };

  const openCreateModal = () => {
    setNewEmail("");
    setNewFullName("");
    setNewPassword("");
    setNewRole("ASSISTANT");
    setNewClinicId(clinics.length > 0 ? clinics[0].id : "");
    setShowCreateModal(true);
  };

  const openEditModal = (user: UserRow) => {
    if (!isAdmin) return;
    setSelectedUser(user);
    setEditFullName(user.full_name ?? "");
    setEditRole(user.role);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditSaving(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      setEditSaving(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: selectedUser.id,
        fullName: editFullName,
        role: editRole,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Kullanıcı güncellenemedi.");
      setEditSaving(false);
      return;
    }

    setEditSaving(false);
    setShowEditModal(false);
    setSelectedUser(null);
    await refreshUsers();
  };

  const handleSelfUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfSaving(true);
    setSelfMessage(null);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!user) {
      setError("Oturum bulunamadı.");
      setSelfSaving(false);
      return;
    }

    const wantPasswordChange = selfNewPassword.length > 0;
    if (wantPasswordChange) {
      if (!selfOldPassword.trim()) {
        setError("Şifre değiştirmek için mevcut şifrenizi girin.");
        setSelfSaving(false);
        return;
      }
      if (selfNewPassword.length < 6) {
        setError("Yeni şifre en az 6 karakter olmalıdır.");
        setSelfSaving(false);
        return;
      }
      if (selfNewPassword !== selfNewPasswordRepeat) {
        setError("Yeni şifre ve tekrar alanı eşleşmiyor.");
        setSelfSaving(false);
        return;
      }
    }

    if (wantPasswordChange) {
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("Oturum bilgisi alınamadı.");
        setSelfSaving(false);
        return;
      }
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: selfOldPassword, newPassword: selfNewPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Şifre güncellenemedi.");
        setSelfSaving(false);
        return;
      }
      setSelfOldPassword("");
      setSelfNewPassword("");
      setSelfNewPasswordRepeat("");
    }

    const updates: { email?: string } = {};
    if (selfNewEmail && selfNewEmail !== currentUserEmail) {
      updates.email = selfNewEmail;
    }

    if (Object.keys(updates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) {
        setError(authError.message || "E-posta güncellenemedi.");
        setSelfSaving(false);
        return;
      }
      if (updates.email) {
        await supabase.from("users").update({ email: updates.email }).eq("id", user.id);
        setCurrentUserEmail(updates.email);
      }
    }

    setSelfMessage(wantPasswordChange || Object.keys(updates).length > 0 ? "Bilgileriniz güncellendi." : "Güncellenecek bir bilgi bulunmuyor.");
    setSelfSaving(false);
  };

  const roleBadgeColors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
    ADMIN: "bg-teal-100 text-teal-700 border-teal-200",
    ADMIN_DOCTOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
    DOCTOR: "bg-blue-100 text-blue-700 border-blue-200",
    ASSISTANT: "bg-amber-100 text-amber-700 border-amber-200",
    RECEPTION: "bg-orange-100 text-orange-700 border-orange-200",
    FINANCE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const roleAvatarColors: Record<string, string> = {
    SUPER_ADMIN: "from-purple-500 to-violet-500",
    ADMIN: "from-teal-500 to-emerald-500",
    ADMIN_DOCTOR: "from-indigo-500 to-violet-500",
    DOCTOR: "from-blue-500 to-cyan-500",
    ASSISTANT: "from-amber-500 to-orange-500",
    RECEPTION: "from-orange-500 to-red-400",
    FINANCE: "from-emerald-500 to-green-500",
  };

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Hesap Bilgilerim</h1>
                <p className="text-xs text-slate-200">Kişisel bilgilerinizi yönetin</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSelfUpdate} className="px-6 py-5 space-y-4">
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{error}</p>
            )}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">E-posta</label>
              <input
                type="email"
                value={selfNewEmail}
                onChange={(e) => setSelfNewEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
              />
              <p className="text-[10px] text-slate-400">Gerekirse giriş e-posta adresinizi buradan güncelleyebilirsiniz.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Mevcut şifre</label>
              <input
                type="password"
                value={selfOldPassword}
                onChange={(e) => setSelfOldPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                placeholder="Şifre değiştirmek için mevcut şifrenizi girin"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Yeni şifre</label>
              <input
                type="password"
                value={selfNewPassword}
                onChange={(e) => setSelfNewPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                placeholder="En az 6 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">Yeni şifre (tekrar)</label>
              <input
                type="password"
                value={selfNewPasswordRepeat}
                onChange={(e) => setSelfNewPasswordRepeat(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                placeholder="Yeni şifrenizi tekrar girin"
                autoComplete="new-password"
              />
            </div>
            {selfMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                <p className="text-xs text-emerald-700 font-medium">{selfMessage}</p>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={selfSaving}
                className="rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-slate-800 hover:to-slate-700 transition-all"
              >
                {selfSaving ? "Kaydediliyor..." : "Bilgilerimi Güncelle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const adminCount = users.filter(u => u.role === "ADMIN" || u.role === "ADMIN_DOCTOR" || u.role === "SUPER_ADMIN").length;
  const doctorCount = users.filter(u => u.role === "DOCTOR" || u.role === "ADMIN_DOCTOR").length;

  return (
    <div className="space-y-5">
      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Toplam Ekip</p>
              <p className="text-lg font-bold text-slate-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Yönetici</p>
              <p className="text-lg font-bold text-indigo-700">{adminCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Doktor</p>
              <p className="text-lg font-bold text-blue-700">{doctorCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-center">
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-600 transition-all flex items-center gap-1.5 w-full justify-center"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 20a6 6 0 0 1 12 0v1H3v-1Z" /></svg>
              Yeni Kullanıcı Ekle
            </button>
          )}
        </div>
      </div>

      <section className="space-y-5">
        {/* Ekip Üyeleri */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
                <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Ekip Üyeleri</h2>
                {!loading && <p className="text-[11px] text-slate-400">Toplam {users.length} kullanıcı</p>}
              </div>
            </div>
          </div>

          {error && (
            <div className="px-5">
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{error}</p>
            </div>
          )}

          {loading && (
            <div className="px-5 pb-5 py-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Kullanıcılar yükleniyor...
              </div>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-5 pb-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-2">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              </div>
              <p className="text-sm text-slate-500">Henüz kullanıcı yok</p>
              <p className="text-xs text-slate-400 mt-0.5">Yeni kullanıcı ekleyerek başlayın</p>
            </div>
          )}

          <div className="px-5 pb-5 grid gap-2 md:grid-cols-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => openEditModal(user)}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${roleAvatarColors[user.role] ?? "from-slate-500 to-slate-600"} text-[11px] font-bold text-white shadow-sm shrink-0`}>
                    {user.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                      {user.full_name || "-"}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {user.email || "-"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span className={["inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold border", roleBadgeColors[user.role] ?? "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>
                    {user.role}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(user.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Rol Tanımları */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/60">
                <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Rol Tanımları</h2>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { role: "ADMIN", desc: "Klinik yöneticisi: kullanıcı ekleme, silme, rol atama" },
              { role: "ADMIN_DOCTOR", desc: "Hem yönetici hem doktor: tüm yetkiler + doktor işlemleri" },
              { role: "DOCTOR", desc: "Kendi randevuları ve hastaları odaklı kullanım" },
              { role: "ASSISTANT", desc: "Randevu ve hasta kayıt işlemleri" },
              { role: "RECEPTION", desc: "Resepsiyon: randevu ve kayıt yönetimi" },
              { role: "FINANCE", desc: "Finans ve raporlama modülleri" },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-2.5">
                <span className={["inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border shrink-0 mt-0.5", roleBadgeColors[r.role] ?? "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>{r.role}</span>
                <span className="text-[11px] text-slate-600 leading-relaxed">{r.desc}</span>
              </div>
            ))}
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-[10px] text-amber-700 leading-relaxed">
                <span className="font-semibold">Not:</span> ADMIN ve ADMIN_DOCTOR rolleri kullanıcı yönetimi yapabilir. Diğer roller listeyi görüntüleyebilir ancak değişiklik yapamaz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isAdmin && showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Yeni Kullanıcı Oluştur</h3>
                  <p className="text-teal-100 text-xs mt-0.5">Ekibinize yeni bir üye ekleyin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">E-posta</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="ornek@nextgency.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">İsim</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {clinic.isSuperAdmin && (
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  )}
                  <option value="ADMIN">ADMIN</option>
                  <option value="ADMIN_DOCTOR">ADMIN_DOCTOR</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="RECEPTION">RECEPTION</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </div>
              {clinic.isSuperAdmin && newRole !== "SUPER_ADMIN" && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Klinik</label>
                  <select
                    value={newClinicId}
                    onChange={(e) => setNewClinicId(e.target.value)}
                    required
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">Klinik seçin...</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Geçici Şifre</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Geçici şifre"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-teal-800 hover:to-emerald-700 transition-all"
                >
                  {saving ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Kullanıcıyı Düzenle</h3>
                  <p className="text-slate-200 text-xs mt-0.5">{selectedUser.email || "Kullanıcı bilgilerini güncelleyin"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">E-posta</label>
                <input
                  type="email"
                  value={selectedUser.email ?? ""}
                  disabled
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">İsim</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="ADMIN_DOCTOR">ADMIN_DOCTOR</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="RECEPTION">RECEPTION</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <div className="flex gap-2">
                  {selectedUser.id === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Şifre Değiştir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResetUserId(selectedUser.id);
                        setResetPassword("");
                        setResetError(null);
                        setResetSuccess(false);
                        setShowResetModal(true);
                      }}
                      className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Şifre Sıfırla
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openDeleteModal(selectedUser)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Kullanıcıyı Sil
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-slate-800 hover:to-slate-700 transition-all"
                  >
                    {editSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setShowResetModal(false);
            setResetUserId(null);
            setResetPassword("");
            setResetError(null);
            setResetSuccess(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Şifre Sıfırla</h3>
                  <p className="text-amber-100 text-xs mt-0.5">Kullanıcı için yeni bir şifre belirleyin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetUserId(null);
                  setResetPassword("");
                  setResetError(null);
                  setResetSuccess(false);
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resetSuccess ? (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">Şifre başarıyla sıfırlandı!</p>
                <p className="text-xs text-slate-500 mt-1">Kullanıcı yeni şifresiyle giriş yapabilir.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetUserId(null);
                    setResetPassword("");
                    setResetError(null);
                    setResetSuccess(false);
                  }}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Kapat
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword();
                }}
                className="px-6 py-5 space-y-4"
              >
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Yeni Şifre</label>
                  <input
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Yeni şifreyi girin"
                  />
                  <p className="text-[11px] text-slate-400">Sadece admin görecek, kullanıcı girişte kendi değiştirir.</p>
                </div>

                {resetError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    {resetError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetUserId(null);
                      setResetPassword("");
                      setResetError(null);
                      setResetSuccess(false);
                    }}
                    className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSaving}
                    className="rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-amber-700 hover:to-yellow-600 transition-all"
                  >
                    {resetSaving ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <DeleteUserModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDeleteUser}
        userName={deleteTarget?.full_name ?? null}
        userEmail={deleteTarget?.email ?? null}
        isProtected={deleteProtected}
      />
    </div>
  );
}

