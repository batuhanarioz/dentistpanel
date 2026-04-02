"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/app/components/AppShell").then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => {
      // Bu sayfa Client Component olduğu için localStorage'dan tercih edilen renkleri çekebiliriz
      // Eğer yoksa varsayılan platform rengini kullanacağız
      const isSuper = typeof window !== 'undefined' ? localStorage.getItem("userRole") === "super_admin" : false;
      const storedFrom = typeof window !== 'undefined' ? localStorage.getItem("themeColorFrom") : null;
      const storedTo = typeof window !== 'undefined' ? localStorage.getItem("themeColorTo") : null;

      const from = isSuper ? "#0d9488" : (storedFrom || "#f43f5e");
      const to = isSuper ? "#10b981" : (storedTo || "#8b5cf6");

      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div 
            className="fixed inset-0 pointer-events-none opacity-[0.03]"
            style={{ background: `radial-gradient(circle at center, ${from}, transparent)` }}
          />
          <div className="flex flex-col items-center gap-6 relative z-10">
            <div 
              className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl shadow-black/5"
              style={{ background: `linear-gradient(to bottom right, ${from}, ${to})` }}
            >
              <svg className="h-7 w-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div 
              className="h-8 w-8 rounded-full border-2 border-transparent animate-spin" 
              style={{ borderTopColor: from, borderLeftColor: `${from}30` }}
            />
          </div>
        </div>
      );
    },
  }
);

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
