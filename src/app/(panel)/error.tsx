"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px] p-6 lg:p-12">
      <div className="max-w-lg w-full bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 text-center animate-in zoom-in duration-300">
        <div className="h-20 w-20 mx-auto mb-8 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Bu sayfa şu an yüklenemedi</h2>
        <p className="text-slate-500 font-medium text-sm mb-10 px-4">
          Panelin bu bölümünde geçici bir sorun oluştu. Diğer bölümlere yan menüden erişebilirsiniz veya bu sayfayı tekrar denetebilirsiniz.
        </p>

        <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
          <button
            onClick={() => reset()}
            className="h-12 w-full rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            Sayfayı Tekrar Dene
          </button>
          
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
            Hata Kodu: {error.digest || 'PANEL_SEC_ERR'}
          </p>
        </div>
      </div>
    </div>
  );
}
