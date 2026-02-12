"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
};

function EyeIcon({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
      tabIndex={-1}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.7 11.7 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.656 4.656l2.829 2.829M3 3l18 18M9.878 9.878a3 3 0 104.243 4.243" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setError(null);
    setSuccess(false);
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (oldPassword === newPassword) {
      setError("Yeni şifre eski şifre ile aynı olamaz.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Şifre değiştirilemedi.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">Şifre Değiştir</h3>
            <p className="text-teal-100 text-xs mt-0.5">
              Güvenliğiniz için şifrenizi düzenli olarak değiştirin
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900">
              Şifreniz başarıyla değiştirildi!
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Bir sonraki girişinizde yeni şifrenizi kullanın.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Mevcut Şifre
              </label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Mevcut şifreniz"
                />
                <EyeIcon show={showOld} toggle={() => setShowOld((v) => !v)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="En az 6 karakter"
                />
                <EyeIcon show={showNew} toggle={() => setShowNew((v) => !v)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="Yeni şifrenizi tekrar girin"
                />
                <EyeIcon
                  show={showConfirm}
                  toggle={() => setShowConfirm((v) => !v)}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400 max-w-[55%]">
                Şifrenizi hatırlamıyorsanız panel yöneticinize başvurun.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-teal-800 hover:to-emerald-700 transition-all"
                >
                  {loading ? "Kaydediliyor..." : "Şifreyi Değiştir"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
