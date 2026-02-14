"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { ClinicContext, type ClinicContextValue } from "../context/ClinicContext";
import type { UserRole, WorkingHours } from "../types/database";
import { DEFAULT_WORKING_HOURS } from "../types/database";

type Props = {
  children: React.ReactNode;
};

type LoadingStep = "auth" | "profile" | "clinic" | "ready";

const STEP_LABELS: Record<LoadingStep, string> = {
  auth: "Oturum doğrulanıyor...",
  profile: "Kullanıcı bilgileri yükleniyor...",
  clinic: "Klinik verileri hazırlanıyor...",
  ready: "Panel hazırlanıyor...",
};

function LoadingScreen({ step }: { step: LoadingStep }) {
  const steps: LoadingStep[] = ["auth", "profile", "clinic", "ready"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="flex flex-col items-center gap-6 px-6">
        {/* Logo / Spinner */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {/* Dönen halka */}
          <div className="absolute -inset-2">
            <div className="h-20 w-20 rounded-2xl border-2 border-teal-200/50 border-t-teal-500 animate-spin" style={{ animationDuration: "1.5s" }} />
          </div>
        </div>

        {/* Başlık */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-900">Klinik Yönetim Paneli</h2>
          <p className="mt-0.5 text-xs text-slate-500">Panele erişim kontrol ediliyor</p>
        </div>

        {/* Aşamalar */}
        <div className="w-64 space-y-2">
          {steps.map((s, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={s} className="flex items-center gap-3">
                {/* İkon */}
                <div className={[
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  isDone ? "bg-emerald-100" : isCurrent ? "bg-teal-100" : "bg-slate-100",
                ].join(" ")}>
                  {isDone ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                {/* Label */}
                <span className={[
                  "text-xs transition-all duration-300",
                  isDone ? "text-emerald-600 font-medium" : isCurrent ? "text-teal-700 font-medium" : "text-slate-400",
                ].join(" ")}>
                  {STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("auth");
  const [clinicCtx, setClinicCtx] = useState<ClinicContextValue>({
    clinicId: null,
    clinicName: null,
    clinicSlug: null,
    userRole: null,
    isSuperAdmin: false,
    isAdmin: false,
    userId: null,
    userName: null,
    userEmail: null,
    workingHours: DEFAULT_WORKING_HOURS,
  });

  useEffect(() => {
    // Ana sayfa (giriş ekranı) için guard devre dışı
    if (pathname === "/") {
      setAllowed(true);
      setChecking(false);
      return;
    }

    const checkAuth = async () => {
      setLoadingStep("auth");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      // Kullanıcının panelde kaydı var mı kontrol et + clinic bilgisi
      setLoadingStep("profile");
      const { data: appUser, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !appUser) {
        await supabase.auth.signOut();
        router.replace("/?error=unauthorized");
        return;
      }

      const role = appUser.role as UserRole;
      const isSuperAdmin = role === "SUPER_ADMIN";
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

      setLoadingStep("clinic");

      // SUPER_ADMIN olmayan kullanıcılar için klinik aktifliği ve slug kontrolü
      if (!isSuperAdmin && appUser.clinic_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("id, name, slug, is_active, working_hours")
          .eq("id", appUser.clinic_id)
          .maybeSingle();

        if (!clinic || !clinic.is_active) {
          await supabase.auth.signOut();
          router.replace("/?error=inactive");
          return;
        }

        setClinicCtx({
          clinicId: clinic.id,
          clinicName: clinic.name,
          clinicSlug: clinic.slug,
          userRole: role,
          isSuperAdmin,
          isAdmin,
          userId: appUser.id,
          userName: appUser.full_name,
          userEmail: appUser.email,
          workingHours: (clinic.working_hours as WorkingHours) || DEFAULT_WORKING_HOURS,
        });

        // URL'deki slug kontrolü: klinik kullanıcıları doğru slug altında olmalı
        const urlSlug = pathname.split("/")[1]; // /{slug}/...
        if (urlSlug !== clinic.slug && pathname !== "/") {
          // Yanlış slug veya slug olmayan bir yolda → doğru slug'a yönlendir
          router.replace(`/${clinic.slug}`);
          return;
        }
      } else if (isSuperAdmin) {
        // SUPER_ADMIN: klinik bilgisi yok
        setClinicCtx({
          clinicId: null,
          clinicName: null,
          clinicSlug: null,
          userRole: role,
          isSuperAdmin: true,
          isAdmin: true,
          userId: appUser.id,
          userName: appUser.full_name,
          userEmail: appUser.email,
          workingHours: DEFAULT_WORKING_HOURS,
        });

        // SUPER_ADMIN /platform dışında bir sayfaya girerse platforme yönlendir
        if (!pathname.startsWith("/platform") && pathname !== "/") {
          router.replace("/platform/clinics");
          return;
        }
      } else {
        // Klinik atanmamış, SUPER_ADMIN değil -> yetkisiz
        await supabase.auth.signOut();
        router.replace("/?error=unauthorized");
        return;
      }

      setLoadingStep("ready");
      setAllowed(true);
      setChecking(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (checking) {
    return <LoadingScreen step={loadingStep} />;
  }

  if (!allowed) {
    return null;
  }

  return (
    <ClinicContext.Provider value={clinicCtx}>
      {children}
    </ClinicContext.Provider>
  );
}
