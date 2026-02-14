"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string | null;
  userEmail: string | null;
  /** true ise ADMIN rolü olduğu için silinemez uyarısı gösterilir */
  isProtected: boolean;
};

export function DeleteUserModal({
  open,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isProtected,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
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
        <div
          className={[
            "px-6 py-4 flex items-center justify-between",
            isProtected
              ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500"
              : "bg-gradient-to-r from-red-700 via-red-600 to-rose-500",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-xl",
                isProtected ? "bg-white/15" : "bg-white/15",
              ].join(" ")}
            >
              {isProtected ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {isProtected ? "İşlem Engellenmiştir" : "Kullanıcıyı Sil"}
              </h3>
              <p className="text-white/80 text-xs mt-0.5">
                {isProtected
                  ? "Bu kullanıcı korumalı role sahiptir"
                  : "Bu işlem geri alınamaz"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {isProtected ? (
            <>
              {/* Korumalı kullanıcı - silinemez */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Bu kullanıcı silinemez
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong>ADMIN</strong>{" "}
                    rolüne sahip kullanıcılar sistem güvenliği nedeniyle
                    silinemez. Önce rolünü değiştirmeniz gerekmektedir.
                  </p>
                </div>
              </div>

              {/* Kullanıcı bilgisi */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">
                    {userName?.[0]?.toUpperCase() ??
                      userEmail?.[0]?.toUpperCase() ??
                      "U"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {userName || "İsimsiz"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {userEmail || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Anladım
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Silme onayı */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Bu kullanıcıyı silmek istediğinize emin misiniz?
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Bu işlem geri alınamaz. Kullanıcının tüm panel erişimi
                    kaldırılacak ve hesabı kalıcı olarak silinecektir.
                  </p>
                </div>
              </div>

              {/* Kullanıcı bilgisi */}
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200 text-[11px] font-bold text-red-800">
                    {userName?.[0]?.toUpperCase() ??
                      userEmail?.[0]?.toUpperCase() ??
                      "U"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {userName || "İsimsiz"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {userEmail || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="rounded-lg bg-gradient-to-r from-red-600 to-rose-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 hover:from-red-700 hover:to-rose-600 transition-all"
                >
                  {loading ? "Siliniyor..." : "Evet, Sil"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
