"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState(UserRole.SEKRETER);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState(UserRole.SEKRETER);
  const [editSaving, setEditSaving] = useState(false);
  const [selfNewEmail, setSelfNewEmail] = useState("");
  const [selfNewPassword, setSelfNewPassword] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);
  const [selfMessage, setSelfMessage] = useState<string | null>(null);

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

      const isCurrentAdmin = current.role === UserRole.ADMIN;
      setIsAdmin(isCurrentAdmin);
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
    setNewRole(UserRole.SEKRETER);
    setSaving(false);
    await refreshUsers();
    setShowCreateModal(false);
  };



  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find((u) => u.id === id);
    if (userToDelete?.role === UserRole.ADMIN) {
      alert("ADMIN rolüne sahip kullanıcılar silinemez.");
      return;
    }
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      return;
    }

    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Kullanıcı silinemedi.");
      return;
    }

    await refreshUsers();
  };

  const handleResetPassword = async (id: string) => {
    const password = window.prompt(
      "Yeni şifreyi girin (sadece admin görecek, kullanıcı girişte kendi değiştirir):"
    );
    if (!password) return;

    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Şifre güncellenemedi.");
      return;
    }
  };

  const openCreateModal = () => {
    setNewEmail("");
    setNewFullName("");
    setNewPassword("");
    setNewRole(UserRole.SEKRETER);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Oturum bulunamadı.");
      setSelfSaving(false);
      return;
    }

    const updates: { email?: string; password?: string } = {};
    if (selfNewEmail && selfNewEmail !== currentUserEmail) {
      updates.email = selfNewEmail;
    }
    if (selfNewPassword) {
      updates.password = selfNewPassword;
    }

    if (!updates.email && !updates.password) {
      setSelfMessage("Güncellenecek bir bilgi bulunmuyor.");
      setSelfSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser(updates);
    if (authError) {
      setError(authError.message || "Bilgiler güncellenemedi.");
      setSelfSaving(false);
      return;
    }

    if (updates.email) {
      await supabase
        .from("users")
        .update({ email: updates.email })
        .eq("id", user.id);
      setCurrentUserEmail(updates.email);
    }

    setSelfNewPassword("");
    setSelfMessage("Bilgileriniz güncellendi.");
    setSelfSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-sm font-semibold text-slate-900">
          Hesap Bilgilerim
        </h1>
        {error && (
          <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        <form
          onSubmit={handleSelfUpdate}
          className="rounded-xl border bg-white p-4 space-y-3 text-xs"
        >
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-800">
              E-posta
            </label>
            <input
              type="email"
              value={selfNewEmail}
              onChange={(e) => setSelfNewEmail(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-xs"
            />
            <p className="text-[10px] text-slate-500">
              Gerekirse giriş e-posta adresinizi buradan güncelleyebilirsiniz.
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-800">
              Yeni şifre
            </label>
            <input
              type="password"
              value={selfNewPassword}
              onChange={(e) => setSelfNewPassword(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-xs"
              placeholder="Boş bırakırsanız şifre değişmez"
            />
          </div>
          {selfMessage && (
            <p className="text-[11px] text-emerald-700">{selfMessage}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={selfSaving}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {selfSaving ? "Kaydediliyor..." : "Bilgilerimi güncelle"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div />
        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-md border px-3 py-1.5 text-xs bg-teal-600 text-white"
          >
            Yeni kullanıcı +
          </button>
        )}
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <div className="rounded-xl border bg-white p-4 text-xs space-y-2">
          <h2 className="text-sm font-semibold mb-1 text-slate-900">
            Rol Tanımları
          </h2>
          <ul className="space-y-1 text-slate-800">
            <li>
              <span className="font-semibold">ADMIN</span> · Kullanıcı ekleme,
              silme, rol atama ve konfigürasyon.
            </li>
            <li>
              <span className="font-semibold">DOCTOR</span> · Kendi
              randevuları/hastaları odaklı kullanım.
            </li>
            <li>
              <span className="font-semibold">RECEPTION</span> ·
              Randevu ve hasta kayıt işlemleri.
            </li>
            <li>
              <span className="font-semibold">FINANCE</span> · Finans ve
              raporlama modülleri.
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-700">
            Not: Sadece ADMIN rolüne sahip kullanıcılar yeni kullanıcı
            oluşturabilir, rollerini değiştirebilir ve kayıt silebilir. Diğer
            roller listeyi görüntüleyebilir ancak değişiklik yapamaz.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Kullanıcılar
              </p>
              {!loading && (
                <p className="text-[11px] text-slate-600">
                  Toplam {users.length} ekip üyesi
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="mb-2 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          {!loading && users.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-slate-800 border rounded-lg bg-slate-50">
              Henüz kayıtlı kullanıcı yok. İlk admin kullanıcısını Supabase SQL
              üzerinden ekleyip, sonrasında buradan yönetebilirsiniz.
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => openEditModal(user)}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white">
                    {user.full_name?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      "U"}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-slate-900">
                      {user.full_name || "-"}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {user.email || "-"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-800">
                    {user.role}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(user.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-xs shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Yeni kullanıcı oluştur</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-800 hover:text-slate-900"
              >
                Kapat
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  E-posta
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="ornek@nextgency.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  İsim
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Rol
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value={UserRole.ADMIN}>ADMIN</option>
                  <option value={UserRole.DOKTOR}>DOKTOR</option>
                  <option value={UserRole.SEKRETER}>SEKRETER</option>
                  <option value={UserRole.FINANS}>FINANS</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Geçici şifre
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Geçici şifre"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showEditModal && selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-xs shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                Kullanıcıyı düzenle
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-slate-800 hover:text-slate-900"
              >
                Kapat
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  E-posta
                </label>
                <input
                  type="email"
                  value={selectedUser.email ?? ""}
                  disabled
                  className="w-full rounded-md border px-2 py-1 text-xs bg-slate-50 text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  İsim
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-800">
                  Rol
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                >
                  <option value={UserRole.ADMIN}>ADMIN</option>
                  <option value={UserRole.DOKTOR}>DOKTOR</option>
                  <option value={UserRole.SEKRETER}>SEKRETER</option>
                  <option value={UserRole.FINANS}>FINANS</option>
                </select>
              </div>
              <div className="mt-3 flex justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(selectedUser.id)}
                    className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Şifre sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteUser(selectedUser.id);
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50"
                  >
                    Kullanıcıyı sil
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="rounded-md border px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                  >
                    {editSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

