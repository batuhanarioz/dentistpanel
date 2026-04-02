"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

    if (newPassword.length < 8) {
      setError("Yeni şifre en az 8 karakter olmalıdır.");
      return;
    }
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9!@#$%^&*])/;
    if (!complexityRegex.test(newPassword)) {
      setError("Şifre en az bir büyük harf, bir küçük harf ve bir rakam/özel karakter içermelidir.");
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
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-600 px-8 py-7 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              </div>
              <div>
                <h3 className="text-white font-black text-lg tracking-tight leading-tight">Şifre Değiştir</h3>
                <p className="text-teal-100/70 text-[11px] font-medium mt-1 leading-tight">
                  Hesabınızın güvenliğini artırmak için<br />yeni bir şifre belirleyin.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="group p-2 rounded-xl hover:bg-white/10 transition-all active:scale-95"
            >
              <svg className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {success ? (
          <div className="px-8 py-10 text-center bg-emerald-50/30">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight">İşlem Başarılı!</h4>
            <p className="text-sm text-slate-500 mt-2 px-4 leading-relaxed font-medium">
              Şifreniz başarıyla güncellendi. Artık yeni şifrenizle devam edebilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-8 w-full rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all active:scale-95"
            >
              Tamam, Devam Et
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                Mevcut Şifre
              </label>
              <div className="relative group">
                <input
                  type={showOld ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 placeholder:text-slate-300"
                  placeholder="Eski şifreniz"
                />
                <EyeIcon show={showOld} toggle={() => setShowOld((v) => !v)} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Yeni Şifre Belirle
                </label>
                <div className="relative group">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 placeholder:text-slate-300"
                    placeholder="En az 8 karakter (A-z, 0-9)"
                  />
                  <EyeIcon show={showNew} toggle={() => setShowNew((v) => !v)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative group">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3.5 pr-11 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 placeholder:text-slate-300"
                    placeholder="Şifreyi onaylayın"
                  />
                  <EyeIcon
                    show={showConfirm}
                    toggle={() => setShowConfirm((v) => !v)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3.5 animate-in slide-in-from-top-1">
                <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                <p className="text-xs font-bold text-rose-700 leading-tight">
                  {error}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto order-2 sm:order-1 rounded-2xl border-2 border-slate-100 px-6 py-3.5 text-[11px] font-black uppercase tracking-tight text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
              >
                İptal Et
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 order-1 sm:order-2 relative group overflow-hidden rounded-2xl bg-slate-900 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                {loading ? "Giriş Yapılıyor..." : "Şifreyi Güncelle"}
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 font-medium px-4 leading-relaxed">
              Şifrenizi hatırlamıyorsanız, sıfırlama işlemi için lütfen klinik yöneticinizle iletişime geçin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
