
import React, { useState } from 'react';
import type { Clinic } from "@/types/database";

interface AssignAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: Clinic | null;
  onSubmit: (email: string) => void;
  saving: boolean;
  error: string | null;
}

export function AssignAdminModal({ isOpen, onClose, clinic, onSubmit, saving, error }: AssignAdminModalProps) {
  const [email, setEmail] = useState('');

  if (!isOpen || !clinic) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onSubmit(email.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-slate-900">Yönetici Ata</h2>
          <p className="text-sm text-slate-500 mt-1"><b>{clinic.name}</b> kliniğine ek bir yönetici yetkisi ver.</p>

          {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs font-bold text-rose-700">
                  {error}
              </div>
          )}

          <div className="mt-6">
            <label htmlFor="admin-email" className="block text-xs font-medium text-slate-700 mb-1">Yöneticinin E-posta Adresi</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yonetici@eposta.com"
              required
              className="w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
            />
            <p className="text-xs text-slate-400 mt-2">Bu kullanıcıya, mevcut şifresiyle bu kliniğe erişim yetkisi verilecektir. Eğer kullanıcı sistemde yoksa, işlem başarısız olur.</p>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || !email}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {saving ? "YETKİ VERİLİYOR..." : "Yetki Ver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
