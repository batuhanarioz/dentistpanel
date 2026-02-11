"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

type HeaderState = {
  title: string;
  subtitle?: string | null;
};

type HeaderContextValue = {
  setHeader: (value: HeaderState) => void;
};

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function usePageHeader(title: string, subtitle?: string | null) {
  const ctx = useContext(HeaderContext);

  const headerValue = useMemo(
    () => ({ title, subtitle: subtitle ?? null }),
    [title, subtitle]
  );

  useEffect(() => {
    if (!ctx) return;
    ctx.setHeader(headerValue);
  }, [ctx, headerValue]);
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState<string>("Klinik Paneli");
  const [headerSubtitle, setHeaderSubtitle] = useState<string | null>(
    "Randevu, hasta ve görev yönetimi"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("full_name, role, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.full_name || profile.email || null);
        setDisplayRole(profile.role || null);
      } else {
        setDisplayName(user.email ?? null);
        setDisplayRole(null);
      }
    };

    loadUser();
  }, []);

  // Sayfaya göre üst bar başlığı
  useEffect(() => {
    switch (true) {
      case pathname === "/":
        setHeaderTitle("Klinik Genel Bakış");
        setHeaderSubtitle(
          "Bugünkü randevular, doluluk oranı ve kanal performansını tek ekrandan takip edin."
        );
        break;
      case pathname === "/appointments":
        setHeaderTitle("Randevu Yönetimi");
        setHeaderSubtitle(
          "Günlük takvim, doktor bazlı görünüm ve kanal dağılımı."
        );
        break;
      case pathname === "/appointments/calendar":
        setHeaderTitle("Randevu Takvimi");
        setHeaderSubtitle(
          "Gün boyu 09:00 - 19:00 arasındaki randevuları çizelge üzerinde görüntüleyip yönetebilirsiniz."
        );
        break;
      case pathname === "/payments":
        setHeaderTitle("Ödeme Takvimi");
        setHeaderSubtitle(
          "Hastalar için ödeme planlarını tarih bazlı olarak yönetin."
        );
        break;
      case pathname === "/patients":
        setHeaderTitle("Hastalar");
        setHeaderSubtitle(
          "Kliniğe kayıtlı tüm hastalar listelenir; takvimden açılan hastalar da burada görünür."
        );
        break;
      case pathname === "/reports":
        setHeaderTitle("Raporlar");
        setHeaderSubtitle(
          "Operasyonel durum, doluluk, kanal performansı ve aksiyon odaklı klinik metrikleri."
        );
        break;
      case pathname === "/admin/users":
        setHeaderTitle("Kullanıcı Yönetimi");
        setHeaderSubtitle(
          "Admin kullanıcılar, klinik personelini buradan ekleyip güncelleyebilir."
        );
        break;
      default:
        setHeaderTitle("Klinik Paneli");
        setHeaderSubtitle("Randevu, hasta ve görev yönetimi");
        break;
    }
  }, [pathname]);

  const isActive = (href: string) => {
    return pathname === href;
  };

  const linkClass = (href: string) =>
    [
      "flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all",
      isActive(href)
        ? "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 text-white shadow-sm"
        : "text-slate-700 bg-white/60 hover:bg-white hover:text-teal-900 hover:shadow-sm hover:ring-1 hover:ring-teal-100",
    ].join(" ");

  // Login sayfası tamamen yalın görünmeli, panel çerçevesi olmadan
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-64 flex-col border-r bg-white h-screen sticky top-0">
        <div className="h-20 flex items-center px-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 border-b border-teal-800 shadow-md rounded-br-2xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center text-[11px] font-semibold uppercase text-white">
              NG
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-white">
                NextGency Diş Kliniği
              </span>
              <span className="text-[11px] text-teal-50/90">
                Yönetim Paneli
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 text-sm flex flex-col min-h-0">
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            <a href="/" className={linkClass("/")}>
              <span>Genel Bakış</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a href="/appointments" className={linkClass("/appointments")}>
              <span>Randevular</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a href="/payments" className={linkClass("/payments")}>
              <span>Ödeme Takvimi</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a
              href="/appointments/calendar"
              className={linkClass("/appointments/calendar")}
            >
              <span>Randevu Takvimi</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a href="/patients" className={linkClass("/patients")}>
              <span>Hastalar</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a href="/reports" className={linkClass("/reports")}>
              <span>Raporlar</span>
            </a>
            <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
            <a href="/admin/users" className={linkClass("/admin/users")}>
              <span>Yönetim · Kullanıcılar</span>
            </a>
          </div>
          <div className="mt-auto pt-4 pb-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white px-3.5 py-2.5 text-[13px] font-semibold shadow-md hover:shadow-lg hover:from-red-700 hover:via-red-600 hover:to-rose-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-white relative z-10">
          {/* Marka satırı – sadece mobilde */}
          <div className="relative bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-4 md:px-6 py-3 flex items-center justify-between md:hidden">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-white">
                NextGency Diş Kliniği
              </span>
              <span className="text-[11px] text-teal-50/90">Yönetim Paneli</span>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-teal-200/60 bg-white/10 text-white transition-colors"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span className="sr-only">
                {mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}
              </span>
              <span className="relative flex flex-col items-center justify-center gap-1">
                <span
                  className={[
                    "block h-[2px] w-4 rounded-full bg-white transition-transform duration-200",
                    mobileNavOpen ? "translate-y-[3px] rotate-45" : "",
                  ].join(" ")}
                />
                <span
                  className={[
                    "block h-[2px] w-4 rounded-full bg-white transition-transform duration-200",
                    mobileNavOpen ? "-translate-y-[3px] -rotate-45" : "",
                  ].join(" ")}
                />
              </span>
            </button>

            {/* Üstten açılan menü – içerik üstüne biner, layout'u itmez (sadece mobil) */}
            {mobileNavOpen && (
              <div className="absolute inset-x-0 top-full z-20 pt-2 pb-3 bg-white shadow-lg border-b border-slate-200 md:hidden">
                <nav className="px-1 space-y-1.5 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/")}
                  >
                    <span>Genel Bakış</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/appointments");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/appointments")}
                  >
                    <span>Randevular</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/appointments/calendar");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/appointments/calendar")}
                  >
                    <span>Randevu Takvimi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/payments");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/payments")}
                  >
                    <span>Ödeme Takvimi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/patients");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/patients")}
                  >
                    <span>Hastalar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/reports");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/reports")}
                  >
                    <span>Raporlar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/admin/users");
                      setMobileNavOpen(false);
                    }}
                    className={linkClass("/admin/users")}
                  >
                    <span>Yönetim · Kullanıcılar</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleLogout();
                      setMobileNavOpen(false);
                    }}
                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white px-3.5 py-2.5 text-xs font-semibold shadow-md hover:shadow-lg hover:from-red-700 hover:via-red-600 hover:to-rose-700 transition-all duration-200 w-full"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Çıkış Yap</span>
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Sayfa başlığı satırı */}
          <div className="px-4 md:px-6 py-3 flex items-start justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                {headerTitle}
              </span>
              {headerSubtitle && (
                <span className="text-xs text-slate-700">
                  {headerSubtitle}
                </span>
              )}
            </div>

            {/* Desktop sağ blok: kullanıcı kartı */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white uppercase">
                  {(displayName || "K")[0]}
                </div>
                <div className="flex flex-col items-end text-right leading-tight">
                  <span className="font-medium text-slate-900">
                    {displayName ?? "Kullanıcı"}
                  </span>
                  {displayRole && (
                    <span className="text-[10px] tracking-[0.12em] uppercase text-slate-600">
                      {displayRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 bg-slate-50 px-4 py-4 md:px-6 md:py-6 min-w-0 overflow-x-hidden">
          <HeaderContext.Provider
            value={{
              setHeader: ({ title, subtitle }) => {
                setHeaderTitle(title);
                setHeaderSubtitle(subtitle ?? null);
              },
            }}
          >
            <AuthGuard>{children}</AuthGuard>
          </HeaderContext.Provider>
        </div>
      </main>
    </div>
  );
}

