import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diş Kliniği Yönetim Paneli - NextGency",
  description: "NextGency ile diş kliniğinizi panelimiz ve otomasyonlarımızla kolayca yönetin.",
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

