"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
        <html lang="tr">
            <body className="antialiased">
                <main className="min-h-screen w-full flex items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
                    {/* Background Decorative Gradients */}
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-200/20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-200/20 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />

                    <div className="relative w-full max-w-xl text-center">
                        <div className="inline-flex items-center justify-center h-24 w-24 rounded-[2.5rem] bg-white shadow-2xl shadow-slate-200/50 mb-10 relative group">
                            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-white animate-pulse" />
                            <svg className="h-10 w-10 text-slate-800 relative z-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        </div>

                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                            Sistemde bir aksama oldu
                        </h1>
                        
                        <p className="text-slate-500 font-medium text-lg max-w-md mx-auto mb-10 leading-relaxed">
                            Beklenmedik bir durumla karşılaştık ve teknik ekibimizi bilgilendirdik. Panel verileriniz güvende, sadece sayfayı yenilememiz gerekiyor.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="group relative h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Yenile ve Devam Et
                                </span>
                            </button>
                            
                            <a 
                                href="mailto:destek@nextgency360.com"
                                className="h-14 px-8 rounded-2xl bg-white text-slate-600 font-black text-sm hover:bg-slate-50 transition-all border border-slate-200 flex items-center justify-center gap-2"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785 0.534 0.534 0 0 0 .416.858 6.603 6.603 0 0 0 2.988-1.042c.548-.173 1.159-.115 1.714.105A8.998 8.998 0 0 0 12 20.25Z" />
                                </svg>
                                Destek Al
                            </a>
                        </div>

                        <div className="mt-16 pt-8 border-t border-slate-200/50">
                            <div className="inline-flex items-center gap-2 bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                    Hata Kodu: {error.digest || 'ERR_UNEXPECTED'}
                                </span>
                            </div>
                        </div>
                    </div>
                </main>
            </body>
        </html>
    );
}
