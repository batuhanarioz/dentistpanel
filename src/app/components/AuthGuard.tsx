"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ClinicContext, type ClinicContextValue } from "../context/ClinicContext";
import { UserRole, type WorkingHours, type Clinic } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";
import { SYSTEM_AUTOMATIONS, type ClinicAutomation } from "@/constants/automations";

type Props = {
  children: React.ReactNode;
};

type LoadingStep = "auth" | "profile" | "clinic" | "ready";

const STEP_LABELS: Record<LoadingStep, string> = {
  auth: "Oturum doğrulanıyor...",
  profile: "Kullanıcı bilgileri yükleniyor...",
  clinic: "Klinik verileri hazırlanıyor...",
  ready: "NextGency OS hazırlanıyor...",
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
  const automationsRef = useRef<ClinicAutomation[]>([]);
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
    workingHoursOverrides: [],
    subscriptionStatus: null,
    billingCycle: null,
    currentPeriodEnd: null,
    lastPaymentDate: null,
    n8nWorkflows: [],
    clinicSettings: null,
    planId: "starter",
  });

  // Sayfa değiştiğinde yükleme ekranını otomatik kapat
  useEffect(() => {
    if (allowed && clinicCtx.userId) {
      setChecking(false);
    }
  }, [pathname, allowed, clinicCtx.userId]);

  // 1. Aşama: Veri Getirme ve Güvenlik Kontrolü (Sadece Başlangıçta veya Oturum Değiştiğinde)
  useEffect(() => {
    const initAuth = async () => {
      setLoadingStep("auth");
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (pathname !== "/login" && pathname !== "/") {
          router.replace("/login");
        }
        setChecking(false);
        return;
      }

      // Veriler zaten varsa (refresh değilse) ve kullanıcı aynıysa tekrar çekme
      if (clinicCtx.userId === user.id) {
        setChecking(false);
        return;
      }

      try {
        setLoadingStep("profile");
        const { data: appUser, error: userError } = await supabase
          .from("users")
          .select("id, full_name, email, role, clinic_id")
          .eq("id", user.id)
          .maybeSingle();

        if (userError || !appUser) {
          await supabase.auth.signOut();
          router.replace("/login?error=unauthorized");
          return;
        }

        const role = appUser.role as UserRole;
        const isSuperAdmin = role === UserRole.SUPER_ADMIN;
        const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

        setLoadingStep("clinic");
        let clinicData: Partial<Clinic> | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let clinicSettingsData: any = null; // To hold clinic settings
        let automationsData: ClinicAutomation[] = []; // To hold automations

        if (!isSuperAdmin && appUser.clinic_id) {
          const [
            { data: clinicResData, error: clinicResError },
            { data: autoResData, error: autoResError },
            { data: settingsResData, error: settingsResError }
          ] = await Promise.all([
            supabase
              .from("clinics")
              .select("id, name, slug, is_active, working_hours, working_hours_overrides, subscription_status, billing_cycle, current_period_end, last_payment_date")
              .eq("id", appUser.clinic_id)
              .maybeSingle(),
            supabase
              .from("clinic_automations")
              .select("automation_id, is_visible, is_enabled, schedule_time, schedule_day")
              .eq("clinic_id", appUser.clinic_id),
            supabase
              .from("clinic_settings")
              .select("id, clinic_id, message_templates, notification_settings, assistant_timings, appointment_channels, created_at, updated_at")
              .eq("clinic_id", appUser.clinic_id)
              .maybeSingle()
          ]);

          if (clinicResError || !clinicResData || !clinicResData.is_active) {
            await supabase.auth.signOut();
            router.replace(clinicResData?.is_active === false ? "/login?error=inactive" : "/login?error=unauthorized");
            return;
          }
          clinicData = clinicResData;

          if (!autoResError && autoResData) {
            // Map table data to context structure
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            automationsData = autoResData.map((a: any) => ({
              id: a.automation_id,
              name: SYSTEM_AUTOMATIONS.find(s => s.id === a.automation_id)?.name || a.automation_id,
              visible: a.is_visible,
              enabled: a.is_enabled,
              time: a.schedule_time ? a.schedule_time.substring(0, 5) : "09:00",
              day: a.schedule_day
            }));
            automationsRef.current = automationsData;
          }

          if (!settingsResError && settingsResData) {
            clinicSettingsData = settingsResData;
          }
        }

        setClinicCtx({
          clinicId: clinicData?.id || null,
          clinicName: clinicData?.name || null,
          clinicSlug: clinicData?.slug || null,
          userRole: role,
          isSuperAdmin,
          isAdmin,
          userId: appUser.id,
          userName: appUser.full_name,
          userEmail: appUser.email,
          workingHours: (clinicData?.working_hours as WorkingHours) || DEFAULT_WORKING_HOURS,
          workingHoursOverrides: clinicData?.working_hours_overrides || [],
          subscriptionStatus: (clinicData as unknown as Clinic)?.subscription_status || (isSuperAdmin ? "active" : "trialing"),
          billingCycle: (clinicData as unknown as Clinic)?.billing_cycle || (isSuperAdmin ? "annual" : "monthly"),
          currentPeriodEnd: (clinicData as unknown as Clinic)?.current_period_end || null,
          lastPaymentDate: (clinicData as unknown as Clinic)?.last_payment_date || null,
          n8nWorkflows: automationsRef.current,
          clinicSettings: clinicSettingsData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          planId: (clinicData as any)?.planId || "starter",
        });

        setLoadingStep("ready");
        setAllowed(true);
      } catch (err) {
        console.error("AuthGuard initialization error:", err);
      } finally {
        setChecking(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece mount anında çalışır

  // 1.5. Aşama: Super Admin Klinik Değişimi (Pathname veya Allowed değiştikçe çalışır)
  useEffect(() => {
    // allowed check is critical as initAuth must be done
    if (!allowed || !clinicCtx.isSuperAdmin) return;

    const parts = pathname.split("/");
    const urlSlug = parts[1];

    // Platform veya login dışı bir slug varsa ve context'teki slug farklıysa güncelle
    const isSpecialPath = ["platform", "login", ""].includes(urlSlug);

    if (!isSpecialPath && urlSlug !== clinicCtx.clinicSlug) {
      const updateClinicContext = async () => {
        try {
          const { data: clinicData, error: clinicError } = await supabase
            .from("clinics")
            .select("id, name, slug, is_active, working_hours, working_hours_overrides, subscription_status, billing_cycle, current_period_end, last_payment_date")
            .eq("slug", urlSlug)
            .maybeSingle();

          if (clinicError || !clinicData) {
            console.error("Clinic not found for slug:", urlSlug);
            return;
          }

          const [autoResData, settingsResData] = await Promise.all([
            supabase
              .from("clinic_automations")
              .select("automation_id, is_visible, is_enabled, schedule_time, schedule_day")
              .eq("clinic_id", clinicData.id),
            supabase
              .from("clinic_settings")
              .select("id, clinic_id, message_templates, notification_settings, assistant_timings, appointment_channels, created_at, updated_at")
              .eq("clinic_id", clinicData.id)
              .maybeSingle()
          ]);

          let automations: ClinicAutomation[] = [];
          if (autoResData?.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            automations = autoResData.data.map((a: any) => ({
              id: a.automation_id,
              name: SYSTEM_AUTOMATIONS.find(s => s.id === a.automation_id)?.name || a.automation_id,
              visible: a.is_visible,
              enabled: a.is_enabled,
              time: a.schedule_time ? a.schedule_time.substring(0, 5) : "09:00",
              day: a.schedule_day
            }));
          }

          setClinicCtx(prev => ({
            ...prev,
            clinicId: clinicData.id,
            clinicName: clinicData.name,
            clinicSlug: clinicData.slug,
            workingHours: (clinicData.working_hours as WorkingHours) || DEFAULT_WORKING_HOURS,
            workingHoursOverrides: clinicData.working_hours_overrides || [],
            subscriptionStatus: (clinicData as unknown as Clinic).subscription_status || "active",
            billingCycle: (clinicData as unknown as Clinic).billing_cycle || "annual",
            currentPeriodEnd: clinicData.current_period_end || null,
            lastPaymentDate: clinicData.last_payment_date || null,
            n8nWorkflows: automations,
            clinicSettings: settingsResData.data,
            isAdmin: true, // Super admin kliniğin içindeyken klinikte de admin sayılır
          }));
        } catch (err) {
          console.error("Error switching clinic context for superadmin:", err);
        }
      };
      updateClinicContext();
    }
    // Eğer platform sayfalarına döndüyse ve context'te bir klinik varsa temizle
    else if (isSpecialPath && clinicCtx.clinicId !== null) {
      setClinicCtx(prev => ({
        ...prev,
        clinicId: null,
        clinicName: null,
        clinicSlug: null,
        workingHours: DEFAULT_WORKING_HOURS,
        workingHoursOverrides: [],
        subscriptionStatus: "active",
        billingCycle: "annual",
        currentPeriodEnd: null,
        lastPaymentDate: null,
        n8nWorkflows: [],
        clinicSettings: null,
        isAdmin: true,
      }));
    }
  }, [pathname, allowed, clinicCtx.isSuperAdmin, clinicCtx.clinicSlug, clinicCtx.clinicId]);

  // 2. Aşama: URL ve Slug Kontrolü (Sayfa geçişlerinde çalışır, veritabanına gitmez)
  useEffect(() => {
    if (!allowed) return;

    if (pathname !== "/") {
      const urlSlug = pathname.split("/")[1];

      if (!clinicCtx.isSuperAdmin && clinicCtx.clinicSlug) {
        if (urlSlug !== clinicCtx.clinicSlug) {
          router.replace(`/${clinicCtx.clinicSlug}`);
        }
      } else if (clinicCtx.isSuperAdmin) {
        // Super Admin checks
        if (!pathname.startsWith("/platform") && !pathname.startsWith("/login")) {
          // If at root or unknown path, redirect to platform
          if (urlSlug === "") {
            router.replace("/platform/clinics/activity");
          }
          // Otherwise allow visit (Effect 1.5 will load context)
        }
      }
    }
  }, [pathname, allowed, clinicCtx.clinicSlug, clinicCtx.isSuperAdmin, router]);

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
