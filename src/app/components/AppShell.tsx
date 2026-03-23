"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import { useClinic } from "../context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { NotificationDropdown } from "./dashboard/NotificationDropdown";
import { GlobalPatientSearch } from "./GlobalPatientSearch";
import { AnnouncementBanner } from "./dashboard/AnnouncementBanner";
import { SupportModal } from "./dashboard/SupportModal";
import { Toaster } from "react-hot-toast";

type Props = {
  children: React.ReactNode;
};

type HeaderState = {
  title: string;
  subtitle?: string;
};

type HeaderContextValue = {
  setHeader: (value: HeaderState) => void;
};

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function usePageHeader(title: string, subtitle?: string) {
  const ctx = useContext(HeaderContext);

  const headerValue = useMemo(
    () => ({ title, subtitle }),
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
        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400/80">
          Platform
        </span>
      </div>
      <button type="button" onClick={() => handleNav("/platform/clinics/monitoring")} className={linkClass("/platform/clinics/monitoring")}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3m16.5 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0h1.5m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3M18.497 19.795l-.75-1.3m-11.5-14.99.75 1.3m11.499-1.3-.75 1.3M7.5 4.205l-.75 1.3m11.499-1.3-.75 1.3M2.25 8.25l1.41.513m16.879 6.514 1.41.513M3.659 5.173l1.15.964m13.532 11.57 1.15.964" /></svg>
        <span>USS Monitoring</span>
      </button>
      <button type="button" onClick={() => handleNav("/platform/clinics/activity")} className={linkClass("/platform/clinics/activity")}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
        <span>Aktivite & Bildirimler</span>
      </button>
      <button type="button" onClick={() => handleNav("/platform/clinics/manage")} className={linkClass("/platform/clinics/manage")}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125-1.125V21" /></svg>
        <span>Klinik Yönetimi</span>
      </button>
      <button type="button" onClick={() => handleNav("/platform/clinics")} className={linkClass("/platform/clinics")}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        <span>Sistem Ayarları</span>
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
      <a id="tour-dashboard" href={base} className={linkClass(base)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
        <span>Genel Bakış</span>
      </a>
      <a id="tour-appointment-management" href={`${base}/appointment-management`} className={linkClass(`${base}/appointment-management`)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>
        <span>Randevu Yönetimi</span>
      </a>
      <a id="tour-payment-management" href={`${base}/payment-management`} className={linkClass(`${base}/payment-management`)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
        <span>Ödeme Yönetimi</span>
      </a>
      <a id="tour-patients" href={`${base}/patients`} className={linkClass(`${base}/patients`)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
        <span>Hasta Kayıtları</span>
      </a>
      <a href={`${base}/treatment-plans`} className={linkClass(`${base}/treatment-plans`)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
        <span>Tedavi Planları</span>
      </a>
      {isAdmin && (
        <a id="tour-reports" href={`${base}/reports`} className={linkClass(`${base}/reports`)} onClick={handleClick}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
          <span>Raporlar</span>
        </a>
      )}
      <a href={`${base}/admin/users`} className={linkClass(`${base}/admin/users`)} onClick={handleClick}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
        <span>Ekip ve Yetkiler</span>
      </a>
      {isAdmin && (
        <a id="tour-subscription" href={`${base}/admin/subscription`} className={linkClass(`${base}/admin/subscription`)} onClick={handleClick}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
          <span>Abonelik</span>
        </a>
      )}
    </>
  );
}

function ShellInner({ children }: Props) {
  const clinic = useClinic();
  const pathname = usePathname();
  const router = useRouter();
  const [headerTitle, setHeaderTitle] = useState<string>("Klinik Paneli");
  const [headerSubtitle, setHeaderSubtitle] = useState<string | undefined>(undefined);
  const [headerIconPath, setHeaderIconPath] = useState<string>(
    "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
  );
  const isPlatform = pathname.startsWith("/platform");
  const isClinicEnv = !!(clinic.clinicSlug && pathname.startsWith(`/${clinic.clinicSlug}`));

  // Mobil menü animasyon state'i: "closed" | "opening" | "open" | "closing"
  const [mobileNavState, setMobileNavState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const mobileNavOpen = mobileNavState === "open" || mobileNavState === "opening";
  const mobileMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Update last_active_at only once per session
  useEffect(() => {
    if (clinic.clinicId) {
      const updateActivity = async () => {
        await supabase.from("clinics").update({ last_active_at: new Date().toISOString() }).eq("id", clinic.clinicId);
      };
      updateActivity();
    }
  }, [clinic.clinicId]);

  // Expose openSupportModal to the nav buttons
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).openSupportModal = () => setSupportModalOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).openSupportModal; };
  }, []);

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
  const brandName = isClinicEnv ? (clinic.clinicName || "Klinik Paneli") : (clinic.isSuperAdmin ? "NextGency OS" : (clinic.clinicName || "Klinik Paneli"));
  const brandSubtitle = isClinicEnv ? "Klinik Yönetimi" : (clinic.isSuperAdmin ? "Platform Kontrol Paneli" : "Yönetim Paneli");
  const brandInitials = isClinicEnv
    ? (clinic.clinicName || "KP")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase()
    : (clinic.isSuperAdmin ? "NG" : (clinic.clinicName || "KP").trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase());
  const userInitials = (displayName || "K")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    SUPER_ADMIN: { bg: "bg-gradient-to-r from-violet-500 to-purple-500", text: "text-white", label: "Super Admin" },
    ADMIN: { bg: "bg-gradient-to-r from-indigo-500 to-blue-500", text: "text-white", label: "Yönetici" },
    DOCTOR: { bg: "bg-gradient-to-r from-sky-500 to-cyan-500", text: "text-white", label: "Hekim" },
    RECEPTION: { bg: "bg-gradient-to-r from-amber-400 to-orange-400", text: "text-white", label: "Sekreter" },
    FINANCE: { bg: "bg-gradient-to-r from-emerald-400 to-green-400", text: "text-white", label: "Finans" },
  };
  const roleStyle = displayRole ? ROLE_STYLES[displayRole] || { bg: "bg-slate-100", text: "text-slate-600", label: displayRole } : null;

  const homeHref = clinic.isSuperAdmin ? "/platform/clinics/activity" : `/${clinic.clinicSlug || ""}`;
  const isOnHome = pathname === homeHref || pathname === homeHref + "/";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
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
        setHeaderIconPath("m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25");
        break;
      case subPath === "/appointment-management":
        setHeaderTitle("Randevu Yönetimi");
        setHeaderIconPath("M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z");
        break;
      case subPath === "/payment-management":
        setHeaderTitle("Ödeme Yönetimi");
        setHeaderIconPath("M2.25 8.25v8.25a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V8.25m-19.5 0A2.25 2.25 0 0 1 4.5 6h15a2.25 2.25 0 0 1 2.25 2.25m-19.5 0v.243a2.25 2.25 0 0 0 1.518 2.144l8.5 2.833a2.25 2.25 0 0 0 1.464 0l8.5-2.833A2.25 2.25 0 0 0 21.75 8.493V8.25");
        break;
      case subPath === "/patients":
        setHeaderTitle("Hasta Kayıtları");
        setHeaderIconPath("M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z");
        break;
      case subPath === "/appointments":
        setHeaderTitle("Randevular");
        setHeaderIconPath("M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5");
        break;
      case subPath === "/treatment-plans":
        setHeaderTitle("Tedavi Planları");
        setHeaderIconPath("M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z");
        break;
      case subPath === "/reports":
        setHeaderTitle("Raporlar");
        setHeaderIconPath("M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z");
        break;
      case subPath === "/admin/users":
        setHeaderTitle("Ekip ve Yetkiler");
        setHeaderIconPath("M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z");
        break;
      case subPath === "/admin/subscription":
        setHeaderTitle("Abonelik");
        setHeaderIconPath("M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z");
        break;
      case pathname === "/platform/clinics/monitoring":
        setHeaderTitle("USS Monitoring");
        setHeaderIconPath("M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3m16.5 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0h1.5m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3M18.497 19.795l-.75-1.3m-11.5-14.99.75 1.3m11.5 14.99-.75-1.3M7.5 4.205l-.75 1.3m11.499-1.3-.75 1.3M2.25 8.25l1.41.513m16.879 6.514 1.41.513M3.659 5.173l1.15.964m13.532 11.57 1.15.964");
        break;
      case pathname === "/platform/clinics/activity":
        setHeaderTitle("Aktivite & Bildirimler");
        setHeaderIconPath("M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0");
        break;
      case pathname === "/platform/clinics":
        setHeaderTitle("Sistem Ayarları");
        setHeaderIconPath("M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z");
        break;
      case pathname === "/platform/clinics/manage":
        setHeaderTitle("Klinik Yönetimi");
        setHeaderIconPath("M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21");
        break;
      default:
        setHeaderTitle("Klinik Paneli");
        setHeaderIconPath("m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25");
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
        ? (isPlatform && clinic.isSuperAdmin)
          ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
          : "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 text-white shadow-sm"
        : "text-slate-700 bg-white/60 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-100",
    ].join(" ");

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            fontWeight: 600,
            fontSize: "13px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            padding: "12px 16px",
            maxWidth: "360px",
          },
          success: {
            style: {
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
            },
            iconTheme: { primary: "#22c55e", secondary: "#f0fdf4" },
          },
          error: {
            style: {
              background: "#fff1f2",
              color: "#9f1239",
              border: "1px solid #fecdd3",
            },
            iconTheme: { primary: "#f43f5e", secondary: "#fff1f2" },
          },
        }}
      />
      <AnnouncementBanner />
      <div className="flex-1 flex w-full">
        <aside className="hidden md:flex w-64 flex-col border-r border-r-slate-100 bg-white h-screen sticky top-0">
          <a
            href={homeHref}
            className={`h-20 flex items-center px-5 border-b shadow-md rounded-br-2xl transition-opacity hover:opacity-95 active:opacity-90 ${isPlatform && clinic.isSuperAdmin
              ? "bg-slate-900 border-slate-800"
              : "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 border-teal-800"
              } ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl border flex items-center justify-center text-[11px] font-semibold uppercase text-white ${isPlatform && clinic.isSuperAdmin ? "bg-white/5 border-white/10" : "bg-white/10 border-white/25"
                }`}>
                {brandInitials}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-white">
                  {brandName}
                </span>
                <span className={`text-[11px] leading-tight ${isPlatform && clinic.isSuperAdmin ? "text-slate-400" : "text-teal-50/90"
                  }`}>
                  {brandSubtitle}
                </span>
              </div>
            </div>
          </a>
          <nav className="flex-1 px-4 py-4 text-sm flex flex-col min-h-0">
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {(clinic.isSuperAdmin && isPlatform) ? (
                <SuperAdminNav linkClass={linkClass} />
              ) : (
                <ClinicNav linkClass={linkClass} slug={clinic.clinicSlug || ""} isAdmin={clinic.isAdmin || clinic.isSuperAdmin} />
              )}
            </div>
            <div className="mt-auto pt-4 pb-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 px-3.5 py-2.5 text-[13px] font-semibold hover:bg-rose-100 hover:border-rose-200 hover:text-rose-700 transition-all duration-200 active:scale-[0.98]"
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Çıkış Yap</span>
              </button>
            </div>
          </nav>
        </aside>
        <main className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-b-slate-100/80 bg-white relative z-50">
            {/* Marka satırı – sadece mobilde */}
            <div className={`relative px-4 md:px-6 py-3 flex items-center justify-between md:hidden ${isPlatform && clinic.isSuperAdmin
              ? "bg-slate-900"
              : "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500"
              }`}>
              <a
                href={homeHref}
                className={`flex items-center gap-3 min-w-0 flex-1 mr-2 transition-opacity hover:opacity-90 active:opacity-80 ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center text-[11px] font-semibold uppercase text-white ${isPlatform && clinic.isSuperAdmin ? "bg-white/5 border-white/10" : "bg-white/10 border-white/25"
                  }`}>
                  {brandInitials}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-sm font-semibold tracking-tight text-white truncate">
                    {brandName}
                  </span>
                  <span className={`text-[11px] leading-tight ${isPlatform && clinic.isSuperAdmin ? "text-slate-400" : "text-teal-50/90"
                    }`}>{brandSubtitle}</span>
                </div>
              </a>
              <div className="flex items-center gap-3 shrink-0">
                {isClinicEnv && <GlobalPatientSearch />}
                <NotificationDropdown />
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
                    <div className={`px-5 py-4 flex items-center justify-between ${isPlatform && clinic.isSuperAdmin
                      ? "bg-slate-900"
                      : "bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500"
                      }`}>
                      <a
                        href={homeHref}
                        onClick={() => { if (!isOnHome) closeMobileNav(); }}
                        className={`flex items-center gap-3 min-w-0 flex-1 mr-2 transition-opacity hover:opacity-90 active:opacity-80 ${isOnHome ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center text-[11px] font-semibold uppercase text-white shrink-0 ${isPlatform && clinic.isSuperAdmin ? "bg-white/5 border-white/10" : "bg-white/10 border-white/25"
                          }`}>
                          {brandInitials}
                        </div>
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-sm font-semibold tracking-tight text-white truncate">{brandName}</span>
                          <span className={`text-[11px] leading-tight ${isPlatform && clinic.isSuperAdmin ? "text-slate-400" : "text-teal-50/80"
                            }`}>{brandSubtitle}</span>
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
                      {(clinic.isSuperAdmin && isPlatform) ? (
                        <SuperAdminNav linkClass={linkClass} onNav={closeMobileNav} />
                      ) : (
                        <ClinicNav
                          linkClass={linkClass}
                          onNav={closeMobileNav}
                          slug={clinic.clinicSlug || ""}
                          isAdmin={clinic.isAdmin || clinic.isSuperAdmin}
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
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 px-3.5 py-2.5 text-xs font-semibold hover:bg-rose-100 hover:border-rose-200 hover:text-rose-700 transition-all duration-200 active:scale-[0.98]"
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
                <div className={`hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${isPlatform && clinic.isSuperAdmin ? "bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-300/60" : "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-200/60"}`}>
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={headerIconPath} /></svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight truncate">
                    {headerTitle}
                  </h1>
                  {headerSubtitle && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{headerSubtitle}</p>
                  )}
                </div>
              </div>

              {/* Desktop sağ blok: kullanıcı kartı */}
              <div className="hidden md:flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-1 py-1">
                  {isClinicEnv && <GlobalPatientSearch variant="dark" />}
                  <NotificationDropdown />
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white pl-1.5 pr-4 py-1.5 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold text-white tracking-wider shadow-sm ${isPlatform && clinic.isSuperAdmin ? "bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" : "bg-gradient-to-br from-teal-500 via-teal-400 to-emerald-500 shadow-teal-200/60"}`}>
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
                  setHeaderSubtitle(subtitle);
                },
              }}
            >
              {children}
            </HeaderContext.Provider>
          </div>
        </main>
      </div>

      {/* Support Modal */}
      {clinic.clinicId && (
        <SupportModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          clinicId={clinic.clinicId}
        />
      )}
    </div>
  );
}

export function AppShell({ children }: Props) {
  const pathname = usePathname();

  // Login ve root sayfaları çerçevesiz
  if (pathname === "/" || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <ShellInner>{children}</ShellInner>
    </AuthGuard>
  );
}
