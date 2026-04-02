"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "./AuthGuard";
import { useClinic, UIContext, useUI } from "../context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { NotificationDropdown } from "./dashboard/NotificationDropdown";
import { GlobalPatientSearch } from "./GlobalPatientSearch";
import { AnnouncementBanner } from "./dashboard/AnnouncementBanner";
import { PastDueBanner } from "./subscription/PastDueBanner";
import { SupportModal } from "./dashboard/SupportModal";
import { ThemeSettingsModal } from "./ThemeSettingsModal";
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
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname === href + "/";
  const handleClick = () => { if (onNav) onNav(); };

  return (
    <>
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
          PLATFORM YÖNETİMİ
        </span>
      </div>
      <div className="space-y-1">
        <Link href="/platform/clinics/monitoring" className={linkClass("/platform/clinics/monitoring")} onClick={handleClick} style={isActive("/platform/clinics/monitoring") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/clinics/monitoring") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/clinics/monitoring") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3m16.5 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0h1.5m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3M18.497 19.795l-.75-1.3m-11.5-14.99.75 1.3m11.499-1.3-.75 1.3M7.5 4.205l-.75 1.3m11.499-1.3-.75 1.3M2.25 8.25l1.41.513m16.879 6.514 1.41.513M3.659 5.173l1.15.964m13.532 11.57 1.15.964" /></svg>
          <span>USS Monitoring</span>
        </Link>
        <Link href="/platform/clinics/activity" className={linkClass("/platform/clinics/activity")} onClick={handleClick} style={isActive("/platform/clinics/activity") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/clinics/activity") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/clinics/activity") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
          <span>Aktivite & Bildirimler</span>
        </Link>
        <Link href="/platform/clinics/manage" className={linkClass("/platform/clinics/manage")} onClick={handleClick} style={isActive("/platform/clinics/manage") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/clinics/manage") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/clinics/manage") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125-1.125V21" /></svg>
          <span>Klinik Yönetimi</span>
        </Link>
        <Link href="/platform/users" className={linkClass("/platform/users")} onClick={handleClick} style={isActive("/platform/users") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/users") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/users") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125-1.125V21" /></svg>
          <span>Kullanıcı Yönetimi</span>
        </Link>
        <Link href="/platform/clinics/addons" className={linkClass("/platform/clinics/addons")} onClick={handleClick} style={isActive("/platform/clinics/addons") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/clinics/addons") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/clinics/addons") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" /></svg>
          <span>Eklentiler</span>
        </Link>
        <Link href="/platform/clinics" className={linkClass("/platform/clinics")} onClick={handleClick} style={isActive("/platform/clinics") ? { backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' } : {}}>
          {isActive("/platform/clinics") && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
          <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive("/platform/clinics") ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
          <span>Sistem Ayarları</span>
        </Link>
      </div>
    </>
  );
}

/* ─── Normal klinik menüsü ─── */
function ClinicNav({
  linkClass,
  onNav,
  slug,
  isAdmin,
  userRole,
}: {
  linkClass: (href: string) => string;
  onNav?: () => void;
  slug: string;
  isAdmin: boolean;
  userRole?: string;
}) {
  const clinic = useClinic();
  const pathname = usePathname();
  const base = `/${slug}`;
  
  const isActive = (href: string) => {
    return pathname === href || pathname === href + "/";
  };

  const canSeeFinance = isAdmin || userRole === "FINANS" || userRole === "DOKTOR" || clinic.is_clinical_provider;
  const handleClick = () => {
    if (onNav) onNav();
  };

  const NavHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 pt-3 pb-1.5 first:pt-1">
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400/90">
        {children}
      </span>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* GRUP: KLİNİK OPERASYON */}
        <div>
          <NavHeader>Klinik Operasyon</NavHeader>
          <div className="space-y-1 mt-1">
            <Link id="tour-dashboard" href={base} className={linkClass(base)} style={isActive(base) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(base) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(base) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              <span>Genel Bakış</span>
            </Link>
            <Link id="tour-appointment-management" href={`${base}/appointment-management`} className={linkClass(`${base}/appointment-management`)} style={isActive(`${base}/appointment-management`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/appointment-management`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/appointment-management`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>
              <span>Randevu Yönetimi</span>
            </Link>
            <Link id="tour-payment-management" href={`${base}/payment-management`} className={linkClass(`${base}/payment-management`)} style={isActive(`${base}/payment-management`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/payment-management`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/payment-management`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
              <span>Ödeme Yönetimi</span>
            </Link>
          </div>
        </div>

        {/* GRUP: HASTA VE TEDAVİ */}
        <div>
          <NavHeader>Hasta ve Tedavi</NavHeader>
          <div className="space-y-1 mt-1">
            <Link id="tour-patients" href={`${base}/patients`} className={linkClass(`${base}/patients`)} style={isActive(`${base}/patients`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/patients`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/patients`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              <span>Hasta Kayıtları</span>
            </Link>
            <Link href={`${base}/lab-management`} className={linkClass(`${base}/lab-management`)} style={isActive(`${base}/lab-management`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/lab-management`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/lab-management`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1 1 .03 2.798-1.328 2.798H6.126c-1.358 0-2.329-1.798-1.328-2.798L5 14.5" /></svg>
              <span>Laboratuvar</span>
            </Link>
            <Link href={`${base}/treatment-plans`} className={linkClass(`${base}/treatment-plans`)} style={isActive(`${base}/treatment-plans`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/treatment-plans`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/treatment-plans`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
              <span>Tedavi Planları</span>
            </Link>
          </div>
        </div>

        {/* GRUP: İLETİŞİM VE SÜREÇLER */}
        <div>
          <NavHeader>İletişim ve Süreçler</NavHeader>
          <div className="space-y-1 mt-1">
            <Link href={`${base}/communication`} className={linkClass(`${base}/communication`)} style={isActive(`${base}/communication`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/communication`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/communication`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.213c-.079-.335.215-.632.557-.59 1.094.135 2.212.217 3.34.246Zm0-9.18c.253-.962.584-1.892.985-2.783.247-.55.06-1.21-.463-1.511l-.657-.38c-.551-.318-1.26-.117-1.527.461a20.845 20.845 0 0 0-1.44 4.213c-.079.335.215.632.557.59 1.094-.135 2.212-.217 3.34-.246Zm0 9.18c.954.025 1.914.037 2.88.037 1.477 0 2.927-.03 4.35-.088m-7.23-.013V6.66m7.23 9.18c.551.021 1.103.03 1.656.028a.75.75 0 0 0 .736-.827 45.046 45.046 0 0 0-1.123-7.514.75.75 0 0 0-.736-.827c-.553-.002-1.105.007-1.656.028m0 9.18V6.674" /></svg>
              <span>Hasta İletişimi</span>
            </Link>
            <Link href={`${base}/guide`} className={linkClass(`${base}/guide`)} style={isActive(`${base}/guide`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/guide`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/guide`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
              <span>Klinik Kılavuzu</span>
            </Link>
          </div>
        </div>

        {/* GRUP: SİSTEM VE RAPOR */}
        {(isAdmin || canSeeFinance) && (
          <div>
            <NavHeader>Sistem ve Rapor</NavHeader>
            <div className="space-y-1 mt-1">
              {isAdmin && (
                <Link id="tour-reports" href={`${base}/reports`} className={linkClass(`${base}/reports`)} style={isActive(`${base}/reports`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
                  {isActive(`${base}/reports`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
                  <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/reports`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                  <span>Raporlar</span>
                </Link>
              )}
              {canSeeFinance && (
                <Link href={`${base}/finance`} className={linkClass(`${base}/finance`)} style={isActive(`${base}/finance`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
                  {isActive(`${base}/finance`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
                  <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/finance`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <span>Karlılık & Hak Ediş</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* GRUP: YÖNETİM */}
        <div>
          <NavHeader>Yönetim</NavHeader>
          <div className="space-y-1 mt-1">
            <Link href={`${base}/admin/users`} className={linkClass(`${base}/admin/users`)} style={isActive(`${base}/admin/users`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/admin/users`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/admin/users`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
              <span>Ekip ve Yetkiler</span>
            </Link>
            <Link id="tour-subscription" href={`${base}/admin/subscription`} className={linkClass(`${base}/admin/subscription`)} style={isActive(`${base}/admin/subscription`) ? { backgroundColor: 'var(--brand-from)', color: '#fff', boxShadow: `0 10px 20px -5px ${clinic.themeColorFrom}40` } : {}} onClick={handleClick}>
              {isActive(`${base}/admin/subscription`) && <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-white/40" />}
              <svg className={`h-4 w-4 shrink-0 transition-colors ${isActive(`${base}/admin/subscription`) ? "text-white" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
              <span>Abonelik & Destek</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function ShellInner({ children }: Props) {
  const clinic = useClinic();
  const { isOverlayActive, isFullOverlay, setOverlayActive } = useUI();
  const pathname = usePathname();
  const router = useRouter();
  const [canSwitchClinics, setCanSwitchClinics] = useState(false);

  useEffect(() => {
    // Bu kod sadece client'da çalışır
    const clinicsRaw = localStorage.getItem("userAccessibleClinics");
    if (clinicsRaw) {
      try {
        const clinics = JSON.parse(clinicsRaw);
        if (Array.isArray(clinics) && clinics.length > 1) {
          setCanSwitchClinics(true);
        }
      } catch (e) {
        console.error("Klinik listesi parse edilemedi:", e);
      }
    }
  }, []);
  const [headerTitle, setHeaderTitle] = useState<string>("Klinik Paneli");
  const [headerSubtitle, setHeaderSubtitle] = useState<string | undefined>(undefined);
  const [headerHideMobile, setHeaderHideMobile] = useState(false);
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
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);

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

  const closeMobileNav = useCallback(() => {
    if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    setMobileNavState("closing");
    setOverlayActive(false);
    mobileMenuTimerRef.current = setTimeout(() => setMobileNavState("closed"), 300);
  }, [setOverlayActive]);

  const openMobileNav = useCallback(() => {
    if (mobileMenuTimerRef.current) clearTimeout(mobileMenuTimerRef.current);
    setMobileNavState("opening");
    setOverlayActive(true);
    // requestAnimationFrame ile CSS transition tetikle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileNavState("open"));
    });
  }, [setOverlayActive]);

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
    DOKTOR: { bg: "bg-gradient-to-r from-sky-500 to-cyan-500", text: "text-white", label: "Hekim" },
    SEKRETER: { bg: "bg-gradient-to-r from-amber-400 to-orange-400", text: "text-white", label: "Sekreter" },
    FINANS: { bg: "bg-gradient-to-r from-emerald-400 to-green-400", text: "text-white", label: "Finans" },
  };
  const roleStyle = displayRole ? ROLE_STYLES[displayRole] || { bg: "bg-slate-100", text: "text-slate-600", label: displayRole } : null;

  const homeHref = clinic.isSuperAdmin ? "/platform/clinics/activity" : `/${clinic.clinicSlug || ""}`;
  const isOnHome = pathname === homeHref || pathname === homeHref + "/";

  const handleSwitchClinic = () => {
    localStorage.removeItem("activeClinicId");
    router.push("/select-clinic");
  };

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
      case subPath === "/finance":
        setHeaderTitle("Karlılık ve Hak Ediş");
        setHeaderIconPath("M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z");
        break;
      case subPath === "/communication":
        setHeaderTitle("Hasta İletişim Merkezi");
        setHeaderIconPath("M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.213c-.079-.335.215-.632.557-.59 1.094.135 2.212.217 3.34.246Zm0-9.18c.253-.962.584-1.892.985-2.783.247-.55.06-1.21-.463-1.511l-.657-.38c-.551-.318-1.26-.117-1.527.461a20.845 20.845 0 0 0-1.44 4.213c-.079.335.215.632.557.59 1.094-.135 2.212-.217 3.34-.246Zm0 9.18c.954.025 1.914.037 2.88.037 1.477 0 2.927-.03 4.35-.088m-7.23-.013V6.66m7.23 9.18c.551.021 1.103.03 1.656.028a.75.75 0 0 0 .736-.827 45.046 45.046 0 0 0-1.123-7.514.75.75 0 0 0-.736-.827c-.553-.002-1.105.007-1.656.028m0 9.18V6.674");
        break;
      case subPath === "/recall":
        setHeaderTitle("Recall Çağrı Listesi");
        setHeaderIconPath("M20.25 3.75v4.5m0-4.5h-4.5m4.5 0-6 6m3 12c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z");
        break;
      case subPath === "/lab-management":
        setHeaderTitle("Laboratuvar Takibi");
        setHeaderIconPath("M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1 1 .03 2.798-1.328 2.798H6.126c-1.358 0-2.329-1.798-1.328-2.798L5 14.5");
        break;
      case subPath === "/treatment-plans":
        setHeaderTitle("Tedavi Planları");
        setHeaderIconPath("M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z");
        break;
      case subPath === "/guide":
        setHeaderTitle("Klinik Kılavuzu");
        setHeaderIconPath("M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25");
        break;
      case subPath === "/reports":
        setHeaderTitle("Raporlar");
        setHeaderIconPath("M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z");
        break;
      case subPath === "/admin/users":
        setHeaderTitle("Ekip ve Yetkiler");
        setHeaderIconPath("M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z");
        setHeaderHideMobile(true);
        break;
      case subPath === "/admin/subscription":
        setHeaderTitle("Abonelik & Destek");
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
      case pathname === "/platform/clinics/addons":
        setHeaderTitle("Eklenti Yönetimi");
        setHeaderIconPath("M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25");
        break;
      default:
        setHeaderTitle("Klinik Paneli");
        setHeaderHideMobile(false);
        setHeaderIconPath("m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25");
        break;
    }
  }, [pathname, clinic.clinicSlug]);

  const isActive = (href: string) => {
    return pathname === href || pathname === href + "/";
  };

  const themeFrom = clinic.themeColorFrom || "#0d9488";
  const themeTo = clinic.themeColorTo || "#10b981";

  const linkClass = useCallback((href: string) =>
    [
      "group relative flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-bold rounded-2xl transition-all duration-300 overflow-hidden",
      isActive(href)
        ? (isPlatform && clinic.isSuperAdmin)
          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
          : "text-white scale-[1.02] translate-x-1"
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50 hover:translate-x-1",
    ].join(" "), [isActive, isPlatform, clinic.isSuperAdmin]);

  return (
    <div
      className="min-h-screen flex flex-col w-full"
      style={{
        // @ts-ignore
        "--brand-from": themeFrom,
        // @ts-ignore
        "--brand-to": themeTo
      }}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "2rem",
            fontWeight: 700,
            fontSize: "12px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            padding: "10px 20px",
            maxWidth: "400px",
            background: "#0f172a", // slate-900 match
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
          success: {
            style: {
              background: "#0f172a",
              color: "#fff",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            },
            iconTheme: { primary: "#10b981", secondary: "#0f172a" },
          },
          error: {
            style: {
              background: "#0f172a",
              color: "#fff",
              border: "1px solid rgba(244, 63, 94, 0.2)",
            },
            iconTheme: { primary: "#f43f5e", secondary: "#0f172a" },
          },
        }}
      />
      <PastDueBanner />
      <AnnouncementBanner />
      <div className="flex-1 flex w-full transition-all duration-500 ease-in-out">
        <aside className={`hidden md:flex w-64 flex-col border-r border-r-slate-100 bg-white h-screen sticky top-0 z-50 transition-all duration-500 ${isFullOverlay ? "scale-[0.99] grayscale-[0.05] pointer-events-none" : ""}`}>
          <Link
            href={homeHref}
            className={`group mx-3 my-4 p-3 rounded-2xl border transition-all duration-300 ${isPlatform && clinic.isSuperAdmin
              ? "bg-slate-900 border-slate-800 shadow-xl shadow-slate-900/20"
              : "bg-white border-slate-100 shadow-sm hover:shadow-md active:scale-[0.98]"
              }`}
          >
            <div className="flex items-center gap-3">
              <div 
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-[13px] font-[900] text-white shadow-lg transition-transform group-hover:scale-105 ${isPlatform && clinic.isSuperAdmin ? "bg-white/10" : ""}`}
                style={!(isPlatform && clinic.isSuperAdmin) ? { background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` } : {}}
              >
                {brandInitials}
              </div>
              <div className="flex flex-col leading-[1.2] min-w-0">
                <span className={`text-[14px] font-[900] tracking-tight ${isPlatform && clinic.isSuperAdmin ? "text-white" : "text-slate-900"}`}>
                  {brandName}
                </span>
              </div>
            </div>
          </Link>

          <nav className="flex-1 px-4 text-sm flex flex-col min-h-0 overflow-y-auto custom-scrollbar pt-2">
            <div className="space-y-4 flex-1 pb-8">
              {(clinic.isSuperAdmin && isPlatform) ? (
                <div className="space-y-1">
                  <SuperAdminNav linkClass={linkClass} />
                </div>
              ) : (
                <ClinicNav linkClass={linkClass} slug={clinic.clinicSlug || ""} isAdmin={clinic.isAdmin || clinic.isSuperAdmin} userRole={clinic.userRole ?? undefined} />
              )}
            </div>
            <div className="mt-auto pt-4 pb-2 flex-shrink-0 space-y-1.5">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setThemeSettingsOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-white hover:text-slate-900 h-10 text-[11px] font-black transition-all shadow-sm"
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.903a9.2 9.2 0 0 1 2.34-5.23L17.117 4.01a3.003 3.003 0 0 1 4.246 4.246L10.686 18.913a9.2 9.2 0 0 1-5.23 2.34l-2.072.31a.301.301 0 0 1-.343-.343l.31-2.072ZM4.098 19.903a9.2 9.2 0 0 0 1.636 1.637m0 0a9.2 9.2 0 0 1-2.312-5.467M16.14 6.39l3.473 3.473" />
                  </svg>
                  <span>Görünüm</span>
                </button>
                {canSwitchClinics && (
                  <button
                    type="button"
                    onClick={handleSwitchClinic}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-white hover:text-slate-900 h-10 text-[11px] font-black transition-all shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                    <span>Şube</span>
                  </button>
                )}
              </div>
              
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-50/50 text-rose-500 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-black transition-all"
              >
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Çıkış Yap</span>
              </button>
            </div>
          </nav>
        </aside>
        <main className={`flex-1 flex flex-col min-w-0 bg-slate-50 transition-all duration-500 ${isOverlayActive || isFullOverlay ? "scale-[0.995] grayscale-[0.05] pointer-events-none select-none" : ""}`}>
          <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 transition-all">
            <div className="mx-auto flex h-14 md:h-16 items-center justify-between px-4 md:px-6 gap-3">

              {/* Left: Branding & Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 md:hidden min-w-0">
                  <Link
                    href={homeHref}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-[10px] text-white shadow-lg ${isPlatform && clinic.isSuperAdmin
                      ? "bg-slate-900 shadow-slate-900/20"
                      : "shadow-black/10"
                      }`}
                    style={!(isPlatform && clinic.isSuperAdmin) ? { background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` } : {}}
                  >
                    {brandInitials}
                  </Link>
                  <div className="h-4 w-[1px] bg-slate-200 mx-0.5 shrink-0" />
                </div>

                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group/icon ${isPlatform && clinic.isSuperAdmin ? "bg-slate-100 text-slate-600" : "shadow-sm ring-1 ring-black/5"
                    }`}
                    style={!(isPlatform && clinic.isSuperAdmin) ? {
                      backgroundColor: `${clinic.themeColorFrom}15`,
                      color: 'var(--brand-from)'
                    } : {}}
                  >
                    <svg className="h-4.5 w-4.5 transition-transform duration-300 group-hover/icon:scale-110 group-active/icon:scale-95" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={headerIconPath} />
                    </svg>
                  </div>
                  <h1 className="text-[13px] md:text-[14px] font-[900] tracking-tight truncate uppercase"
                    style={!(isPlatform && clinic.isSuperAdmin) ? {
                      backgroundImage: `linear-gradient(to right, var(--brand-from), var(--brand-to))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    } : { color: '#0f172a' }}
                  >
                    {headerTitle}
                  </h1>
                </div>
              </div>

              {/* Right: Actions & User */}
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {/* Search & Notif */}
                <div className="flex items-center gap-1.5 bg-slate-50/80 p-1 rounded-xl ring-1 ring-slate-100">
                  {isClinicEnv && <GlobalPatientSearch variant="dark" />}
                  <NotificationDropdown />
                </div>

                <div className="hidden md:flex items-center gap-3 bg-slate-50/50 p-1.5 pr-2 rounded-2xl ring-1 ring-slate-100 hover:ring-slate-200 transition-all">
                  <div className="flex flex-col items-end leading-none pl-1">
                    <span className="text-[11px] font-black text-slate-900 truncate max-w-[120px]">
                      {displayName}
                    </span>
                    {roleStyle && (
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                        {roleStyle.label}
                      </span>
                    )}
                  </div>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                    style={{ background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` }}
                  >
                    {userInitials}
                  </div>
                </div>

                {/* Mobile Menu Trigger */}
                <button
                  type="button"
                  className="flex h-9 w-9 md:hidden items-center justify-center rounded-xl transition-all active:scale-95 shadow-sm border border-black/5"
                  style={{
                    backgroundColor: `${clinic.themeColorFrom}15`,
                    color: 'var(--brand-from)'
                  }}
                  onClick={toggleMobileNav}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* FİNE-TUNED MOBILE DRAWER */}
            {mobileNavState !== "closed" && (
              <>
                <div
                  className={`fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-xl transition-opacity duration-300 md:hidden ${mobileNavState === "open" ? "opacity-100" : "opacity-0"
                    }`}
                  onClick={closeMobileNav}
                />
                <div
                  className={`fixed inset-x-4 top-4 z-[510] md:hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${mobileNavState === "open" ? "translate-y-0 opacity-100 scale-100" : "-translate-y-8 opacity-0 scale-95"
                    }`}
                >
                  <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden ring-1 ring-white/20 border border-slate-100">
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-xl shadow-xl shadow-black/10 flex items-center justify-center text-white font-black text-xs border border-white/20"
                            style={{ background: `linear-gradient(to bottom right, var(--brand-from), var(--brand-to))` }}
                          >
                            {brandInitials}
                          </div>
                          <div className="flex flex-col leading-[1.2] min-w-0">
                            <span className="text-[14px] font-[900] text-slate-900 tracking-tight">{brandName}</span>
                          </div>
                        </div>
                        <button
                          onClick={closeMobileNav}
                          className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Navigation */}
                      <nav className="space-y-1 max-h-[55vh] overflow-y-auto px-1 pr-2 custom-scrollbar">
                        {(clinic.isSuperAdmin && isPlatform) ? (
                          <SuperAdminNav linkClass={linkClass} onNav={closeMobileNav} />
                        ) : (
                          <ClinicNav
                            linkClass={linkClass}
                            onNav={closeMobileNav}
                            slug={clinic.clinicSlug || ""}
                            isAdmin={clinic.isAdmin || clinic.isSuperAdmin}
                            userRole={clinic.userRole ?? undefined}
                          />
                        )}
                      </nav>

                      {/* Footer Actions */}
                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                        <button
                          onClick={() => { setThemeSettingsOpen(true); closeMobileNav(); }}
                          className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-slate-50 text-slate-600 text-xs font-black hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0-2.25h.008v.008H12v-.008ZM14.25 10.5h.008v.008h-.008V10.5Zm2.25-2.25h.008v.008H16.5V8.25ZM18.75 6h.008v.008H18.75V6Zm2.25-2.25h.008v.008H21V3.75Z" />
                          </svg>
                          Görünüm Ayarları
                        </button>
                        <button
                          onClick={async () => { await handleLogout(); closeMobileNav(); }}
                          className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 active:scale-95 transition-all shadow-sm"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                          </svg>
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
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

      {/* Global Overlays & Modals (Outside the blur wrapper to remain interactive) */}
      {clinic.clinicId && (
        <SupportModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          clinicId={clinic.clinicId}
        />
      )}
      <ThemeSettingsModal 
        isOpen={themeSettingsOpen}
        onClose={() => setThemeSettingsOpen(false)}
      />
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
