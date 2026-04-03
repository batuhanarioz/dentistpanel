"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/app/components/AppShell").then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    ),
  }
);

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
