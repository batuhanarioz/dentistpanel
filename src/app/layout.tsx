import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klinik Yönetim Paneli",
  description: "Multi-tenant diş klinik yönetim paneli.",
};

import * as Sentry from "@sentry/nextjs";
import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className="antialiased bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <Sentry.ErrorBoundary fallback={<p>Bir hata oluştu. Lütfen sayfayı yenileyiniz.</p>}>
          <Providers>{children}</Providers>
        </Sentry.ErrorBoundary>
      </body>
    </html>
  );
}

