import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextGency OS | Diş Kliniği Yönetim Sistemi & Dental CRM Paneli",
  description: "Diş kliniği yönetim merkezi: Hasta takibi, operasyon yönetimi ve akıllı dental CRM çözümleri. Diş hekimleri için en gelişmiş yönetim paneli.",
  keywords: ["diş kliniği", "dental crm", "diş hekimi paneli", "klinik yönetim merkezi", "operasyon yönetimi", "hasta yönetimi", "diş kliniği yazılımı", "dental otomasyon"],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
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

