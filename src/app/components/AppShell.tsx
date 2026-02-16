"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import { useClinic } from "../context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";

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

/* ─── Klinik menüsü – SUPER_ADMIN navigasyonu ─── */
function SuperAdminNav({
  linkClass,
  onNav,
}: {
  linkClass: (href: string) => string;
  onNav?: () => void;
}) {
  const handleNav = (href: string) => {
    if (onNav) onNav();
    window.location.href = href;
  };

  return (
    <>
      <div className="px-2 pt-3 pb-1">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-teal-300/80">
          Platform
        </span>
      </div>
      <button type="button" onClick={() => handleNav("/platform/clinics")} className={linkClass("/platform/clinics")}>
        <span>Klinik Yönetimi</span>
      </button>
    </>
  );
}

/* ─── Normal klinik menüsü ─── */
function ClinicNav({
  linkClass,
  onNav,
  slug,
  isAdmin,
}: {
  linkClass: (href: string) => string;
  onNav?: () => void;
  slug: string;
  isAdmin: boolean;
}) {
  const base = `/${slug}`;

  const handleClick = () => {
    if (onNav) onNav();
  };

  return (
    <>
      <a href={base} className={linkClass(base)} onClick={handleClick}>
        <span>Genel Bakış</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/appointment-management`} className={linkClass(`${base}/appointment-management`)} onClick={handleClick}>
        <span>Randevu Yönetimi</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/payment-management`} className={linkClass(`${base}/payment-management`)} onClick={handleClick}>
        <span>Ödeme Yönetimi</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/patients`} className={linkClass(`${base}/patients`)} onClick={handleClick}>
        <span>Hasta Kayıtları</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/appointments`} className={linkClass(`${base}/appointments`)} onClick={handleClick}>
        <span>Yoğunluk Ajandası</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/reports`} className={linkClass(`${base}/reports`)} onClick={handleClick}>
        <span>Raporlar</span>
      </a>
      <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
      <a href={`${base}/admin/users`} className={linkClass(`${base}/admin/users`)} onClick={handleClick}>
        <span>Ekip ve Yetkiler</span>
      </a>
      {isAdmin && (
        <>
          <div className="h-px mx-2 rounded-full bg-gradient-to-r from-teal-800/70 via-teal-700/70 to-emerald-500/70" />
          <a href={`${base}/admin/subscription`} className={linkClass(`${base}/admin/subscription`)} onClick={handleClick}>
            <span>Abonelik & Kullanım</span>
          </a>
        </>
      )}
    </>
  );
}

function ShellInner({ children }: Props) {
  const clinic = useClinic();
  const pathname = usePathname();
  const router = useRouter();
  const [headerTitle, setHeaderTitle] = useState<string>("Klinik Paneli");
  const [headerSubtitle, setHeaderSubtitle] = useState<string | null>(
    "Randevu, hasta ve görev yönetimi"
  );
  // Mobil menü animasyon state'i: "closed" | "opening" | "open" | "closing"
  const [mobileNavState, setMobileNavState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const mobileNavOpen = mobileNavState === "open" || mobileNavState === "opening";
  const mobileMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMobileNav = useCallback(() => {
    if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    setMobileNavState("opening");
    // requestAnimationFrame ile CSS transition tetikle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileNavState("open"));
    });
  }, []);

  const closeMobileNav = useCallback(() => {
    if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    setMobileNavState("closing");
    mobileMenuTimerRef.current = setTimeout(() => setMobileNavState("closed"), 300);
  }, []);

  const toggleMobileNav = useCallback(() => {
    if (mobileNavState === "closed" || mobileNavState === "closing") {
      openMobileNav();
    } else {
      closeMobileNav();
    }
  }, [mobileNavState, openMobileNav, closeMobileNav]);

  // Cleanup
  useEffect(() => {
    return () => { if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current); };
  }, []);

  const displayName = clinic.userName || clinic.userEmail || "Kullanıcı";
  const displayRole = clinic.userRole || null;
  const brandName = clinic.isSuperAdmin
    ? "NextGency"
    : clinic.clinicName || "Klinik Paneli";
  const brandSubtitle = clinic.isSuperAdmin
    ? "Diş Klinikleri Platform Yönetim Paneli"
    : "Yönetim Paneli";
  const brandInitials = clinic.isSuperAdmin
    ? "NG"
    : (clinic.clinicName || "KP")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  const userInitials = (displayName || "K")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    SUPER_ADMIN: { bg: "bg-gradient-to-r from-violet-500 to-purple-500", text: "text-white", label: "Super Admin" },
    ADMIN: { bg: "bg-gradient-to-r from-indigo-500 to-blue-500", text: "text-white", label: "Yönetici" },
    DOCTOR: { bg: "bg-gradient-to-r from-sky-500 to-cyan-500", text: "text-white", label: "Doktor" },
    RECEPTION: { bg: "bg-gradient-to-r from-amber-400 to-orange-400", text: "text-white", label: "Sekreter" },
    FINANCE: { bg: "bg-gradient-to-r from-emerald-400 to-green-400", text: "text-white", label: "Finans" },
  };
  const roleStyle = displayRole ? ROLE_STYLES[displayRole] || { bg: "bg-slate-100", text: "text-slate-600", label: displayRole } : null;

  const homeHref = clinic.isSuperAdmin ? "/platform/clinics" : `/${clinic.clinicSlug || ""}`;
  const isOnHome = pathname === homeHref || pathname === homeHref + "/";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // Sayfaya göre üst bar başlığı
  // Slug bazlı yolları da destekle: /{slug}/appointments gibi
  useEffect(() => {
    // Slug'ı pathname'den çıkar: /slug/subpath → subpath
    const slug = clinic.clinicSlug;
    const subPath = slug && pathname.startsWith(`/${slug}`)
      ? pathname.slice(`/${slug}`.length) || "/"
      : pathname;

    switch (true) {
      case subPath === "/":
        setHeaderTitle("Klinik Genel Bakış");
        setHeaderSubtitle(
          "Bugünkü randevular, doluluk oranı ve kanal performansını tek ekrandan takip edin."
        );
        break;
      case subPath === "/appointment-management":
        setHeaderTitle("Randevu Yönetimi");
        setHeaderSubtitle(
          "İstediğiniz tarih aralığında randevuları çizelge üzerinde ekleyin, düzenleyin ve silin."
        );
        break;
      case subPath === "/payment-management":
        setHeaderTitle("Ödeme Yönetimi");
        setHeaderSubtitle(
          "Randevuya ait ödeme planlarını tarih bazlı olarak yönetin."
        );
        break;
      case subPath === "/patients":
        setHeaderTitle("Hasta Kayıtları");
        setHeaderSubtitle(
          "Kliniğe kayıtlı tüm hastalar listelenir; takvimden açılan hastalar da burada görünür."
        );
        break;
      case subPath === "/appointments":
        setHeaderTitle("Yoğunluk Ajandası");
        setHeaderSubtitle(
          "Randevuları tarih ve doktor bazlı olarak görüntüleyin ve boşluklarınızı görün."
        );
        break;
      case subPath === "/reports":
        setHeaderTitle("Raporlar");
        setHeaderSubtitle(
          "Operasyonel durum, doluluk, kanal performansı ve aksiyon odaklı klinik metrikleri."
        );
        break;
      case subPath === "/admin/users":
        setHeaderTitle("Ekip ve Yetkiler");
        setHeaderSubtitle(
          "Admin kullanıcılar, klinik personelini buradan ekleyip güncelleyebilir."
        );
        break;
      case pathname === "/platform/clinics":
        setHeaderTitle("Klinik Yönetimi");
        setHeaderSubtitle(
          "Tüm klinikleri yönetin: klinik oluşturun, düzenleyin veya pasife alın."
        );
        break;
      default:
        setHeaderTitle("Klinik Paneli");
        setHeaderSubtitle("Randevu, hasta ve görev yönetimi");
        break;
    }
  }, [pathname, clinic.clinicSlug]);

  const isActive = (href: string) => {
    return pathname === href || pathname === href + "/";
  };

  const linkClass = (href: string) =>
    [
      "flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all",
      isActive(href)
        ? "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 text-white shadow-sm"
        : "text-slate-700 bg-white/60 hover:bg-white hover:text-teal-900 hover:shadow-sm hover:ring-1 hover:ring-teal-100",
    ].join(" ");

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-64 flex-col border-r bg-white h-screen sticky top-0">
        <a
          href={homeHref}
          className={`h-20 flex items-center px-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 border-b border-teal-800 shadow-md rounded-br-2xl transition-opacity hover:opacity-95 active:opacity-90 ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center text-[11px] font-semibold uppercase text-white">
              {brandInitials}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-white">
                {brandName}
              </span>
              <span className="text-[11px] text-teal-50/90 leading-tight">
                {brandSubtitle}
              </span>
            </div>
          </div>
        </a>
        <nav className="flex-1 px-4 py-4 text-sm flex flex-col min-h-0">
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {clinic.isSuperAdmin ? (
              <SuperAdminNav linkClass={linkClass} />
            ) : (
              <ClinicNav linkClass={linkClass} slug={clinic.clinicSlug || ""} isAdmin={clinic.isAdmin} />
            )}
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
        <header className="border-b bg-white relative z-50">
          {/* Marka satırı – sadece mobilde */}
          <div className="relative bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-4 md:px-6 py-3 flex items-center justify-between md:hidden">
            <a
              href={homeHref}
              className={`flex items-center gap-3 min-w-0 flex-1 mr-2 transition-opacity hover:opacity-90 active:opacity-80 ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center text-[11px] font-semibold uppercase text-white">
                {brandInitials}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-sm font-semibold tracking-tight text-white truncate">
                  {brandName}
                </span>
                <span className="text-[11px] text-teal-50/90 leading-tight">{brandSubtitle}</span>
              </div>
            </a>
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 active:scale-90"
              onClick={toggleMobileNav}
            >
              <span className="sr-only">{mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}</span>
              <span className="relative flex h-4 w-5 flex-col items-center justify-center">
                <span className={["absolute block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ease-out", mobileNavState === "open" || mobileNavState === "closing" ? "rotate-45 translate-y-0" : "-translate-y-[5px]"].join(" ")} />
                <span className={["absolute block h-[2px] w-5 rounded-full bg-white transition-all duration-200", mobileNavState === "open" || mobileNavState === "closing" ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"].join(" ")} />
                <span className={["absolute block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ease-out", mobileNavState === "open" || mobileNavState === "closing" ? "-rotate-45 translate-y-0" : "translate-y-[5px]"].join(" ")} />
              </span>
            </button>
          </div>

          {/* Mobil menü overlay + panel */}
          {mobileNavState !== "closed" && (
            <>
              {/* Karartma overlay */}
              <div
                className={["fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden", mobileNavState === "open" ? "opacity-100" : "opacity-0"].join(" ")}
                onClick={closeMobileNav}
              />

              {/* Menü paneli */}
              <div
                className={[
                  "fixed inset-x-0 top-0 z-40 md:hidden transition-all duration-300 ease-out",
                  mobileNavState === "open" ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
                ].join(" ")}
              >
                <div className="bg-white rounded-b-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
                  {/* Menü üst bar */}
                  <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-5 py-4 flex items-center justify-between">
                    <a
                      href={homeHref}
                      onClick={() => { if (!isOnHome) closeMobileNav(); }}
                      className={`flex items-center gap-3 min-w-0 flex-1 mr-2 transition-opacity hover:opacity-90 active:opacity-80 ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center text-[11px] font-semibold uppercase text-white shrink-0">
                        {brandInitials}
                      </div>
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-sm font-semibold tracking-tight text-white truncate">{brandName}</span>
                        <span className="text-[11px] text-teal-50/80 leading-tight">{brandSubtitle}</span>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={closeMobileNav}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-200 active:scale-90"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Nav linkleri */}
                  <nav className="px-3 py-3 space-y-1 text-sm">
                    {clinic.isSuperAdmin ? (
                      <SuperAdminNav linkClass={linkClass} onNav={closeMobileNav} />
                    ) : (
                      <ClinicNav
                        linkClass={linkClass}
                        onNav={closeMobileNav}
                        slug={clinic.clinicSlug || ""}
                        isAdmin={clinic.isAdmin}
                      />
                    )}
                  </nav>

                  {/* Alt bölüm: kullanıcı + çıkış */}
                  <div className="px-4 pb-4">
                    <div className="h-px w-full bg-slate-100 mb-3" />
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3 mb-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-xs font-bold text-white tracking-wider shadow-sm">
                        {userInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                        {roleStyle && (
                          <span className={`inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide ${roleStyle.bg} ${roleStyle.text} shadow-sm`}>
                            {roleStyle.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => { await handleLogout(); closeMobileNav(); }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white px-3.5 py-2.5 text-xs font-semibold shadow-md hover:shadow-lg hover:from-red-700 hover:via-red-600 hover:to-rose-700 transition-all duration-200 active:scale-[0.98]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sayfa başlığı satırı */}
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 md:gap-4 border-t border-slate-100 bg-gradient-to-r from-white via-white to-slate-50/80">
            <div className="flex items-center gap-3 md:gap-3.5 min-w-0 flex-1">
              <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/80 shadow-sm">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
                  {headerTitle}
                </h1>
                {headerSubtitle && (
                  <p className="hidden md:block text-[11px] text-slate-400 mt-0.5 truncate leading-relaxed">
                    {headerSubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop sağ blok: kullanıcı kartı */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white pl-1.5 pr-4 py-1.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-[11px] font-bold text-white tracking-wider shadow-sm">
                  {userInitials}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-slate-800">
                    {displayName ?? "Kullanıcı"}
                  </span>
                  {roleStyle && (
                    <span className={`inline-flex items-center mt-0.5 rounded-full px-2 py-[1px] text-[9px] font-semibold tracking-wide ${roleStyle.bg} ${roleStyle.text} shadow-sm`}>
                      {roleStyle.label}
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
            {children}
          </HeaderContext.Provider>
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();

  // Login ve root yönlendirme sayfaları çerçevesiz
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <ShellInner>{children}</ShellInner>
    </AuthGuard>
  );
}
