"use client";

import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Beklenmedik bir hata oluştu</h2>
                        <p className="text-slate-600 mb-6 text-sm">Hata otomatik olarak geliştirici ekibimize raporlandı. Lütfen sayfayı yenilemeyi deneyin.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-teal-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
