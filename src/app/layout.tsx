import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klinik Yönetim Paneli",
  description: "Multi-tenant diş klinik yönetim paneli.",
};

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
        {children}
      </body>
    </html>
  );
}
