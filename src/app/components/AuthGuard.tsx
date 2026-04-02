"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ClinicIdentityContext, ClinicDataContext, UIContext, type ClinicContextValue } from "../context/ClinicContext";
import * as Sentry from "@sentry/nextjs";
import { UserRole, type WorkingHours, type Clinic, type ClinicAddon, type ClinicSettings } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";
import { SYSTEM_AUTOMATIONS, type ClinicAutomation } from "@/constants/automations";
import { getAccessibleClinics, getClinicById } from "@/app/actions/getAccessibleClinics";
import { switchClinic } from "@/app/actions/switchClinic";

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

function LoadingScreen({ step, colors }: { step: LoadingStep, colors?: { from: string, to: string } }) {
  const steps: LoadingStep[] = ["auth", "profile", "clinic", "ready"];
  const currentIndex = steps.indexOf(step);

  const from = colors?.from || "#0d9488";
  const to = colors?.to || "#10b981";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ background: `radial-gradient(circle at center, ${from}, transparent)` }}
      />
      <div className="flex flex-col items-center gap-6 px-6 relative z-10">
        {/* Logo / Spinner */}
        <div className="relative">
          <div 
            className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5"
            style={{ background: `linear-gradient(to bottom right, ${from}, ${to})` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {/* Dönen halka */}
          <div className="absolute -inset-2">
            <div 
                className="h-20 w-20 rounded-2xl border-2 border-transparent animate-spin" 
                style={{ 
                    animationDuration: "1.5s",
                    borderTopColor: from,
                    borderLeftColor: `${from}30`
                }} 
            />
          </div>
        </div>

        {/* Başlık */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-900">NextGency OS</h2>
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
                <div 
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
                    style={{
                        backgroundColor: isDone ? `${from}15` : isCurrent ? `${from}10` : "#f1f5f9"
                    }}
                >
                  {isDone ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" style={{ color: from }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: from }} />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                {/* Label */}
                <span className={[
                  "text-xs transition-all duration-300",
                  isDone ? "font-bold" : isCurrent ? "font-bold" : "text-slate-400",
                ].join(" ")}
                style={{ color: isDone || isCurrent ? from : undefined }}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ 
                width: `${((currentIndex + 1) / steps.length) * 100}%`,
                background: `linear-gradient(to right, ${from}, ${to})`
            }}
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
    is_clinical_provider: false,
    workingHours: DEFAULT_WORKING_HOURS,
    workingHoursOverrides: [],
    subscriptionStatus: null,
    billingCycle: null,
    currentPeriodEnd: null,
    lastPaymentDate: null,
    n8nWorkflows: [],
    clinicSettings: null,
    clinicAddons: [],
    planId: "starter",
    themeColorFrom: undefined,
    themeColorTo: undefined,
  });

  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [isFullOverlay, setIsFullOverlay] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // İnternet bağlantısını izle
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setOverlayActive = (active: boolean, full?: boolean) => {
    setIsOverlayActive(active);
    setIsFullOverlay(active ? !!full : false);
  };

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
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Geçersiz/süresi dolmuş refresh token — stale session'ı temizle
        if (authError?.message?.includes("Refresh Token")) {
          await supabase.auth.signOut();
        }
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
        // 1. Kullanıcı profilini ve ana kliniğini çek (Tekrar deneme mekanizmalı)
        let appUser = null;
        let userError = null;
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
          const { data, error } = await supabase
            .from("users")
            .select("id, full_name, email, role, clinic_id, is_clinical_provider, theme_color_from, theme_color_to")
            .eq("id", user.id)
            .single();
          
          if (data) {
            appUser = data;
            break;
          }
          
          userError = error;
          console.warn(`Profil çekme denemesi ${retries + 1} başarısız...`);
          retries++;
          if (retries <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 sn bekle ve tekrar dene
          }
        }

        if (userError || !appUser) {
          console.error("AuthGuard initialization error (Final):", userError);
          Sentry.captureException(userError || new Error("Profile not found after retries"));
          await supabase.auth.signOut();
          router.replace("/login?error=unauthorized");
          return;
        }

        const role = appUser.role as UserRole;
        localStorage.setItem("userRole", role);
        const isSuperAdmin = role === UserRole.SUPER_ADMIN;
        const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
        
        if (appUser.theme_color_from) localStorage.setItem("themeColorFrom", appUser.theme_color_from);
        if (appUser.theme_color_to) localStorage.setItem("themeColorTo", appUser.theme_color_to);

        // 2. Ek klinikleri metadata'dan al ve birleştir
        const additionalClinicIds = user.app_metadata?.additional_clinics as string[] || [];
        const allClinicIds = [...new Set([appUser.clinic_id, ...additionalClinicIds].filter(Boolean))];

        // 3. Klinik seçimi mantığı
        let targetClinicId: string | null = null;
        if (isSuperAdmin) {
            // Super adminler belirli bir klinik context'inde başlamaz, slug'a göre çalışırlar
        } else if (allClinicIds.length > 1) {
          // Birden fazla kliniği varsa her halükarda klinik listesini çekip kaydet (AppShell "Klinik Değiştir" butonu için)
          // RLS (Güvenlik Kuralı) engellemesini aşmak için Server Action kullanıyoruz.
          const accessibleClinics = await getAccessibleClinics(allClinicIds);
            
          if (accessibleClinics && accessibleClinics.length > 0) {
            localStorage.setItem("userAccessibleClinics", JSON.stringify(accessibleClinics));
          }

          const activeClinicId = localStorage.getItem("activeClinicId");
          if (activeClinicId && allClinicIds.includes(activeClinicId)) {
            targetClinicId = activeClinicId;
          } else {
            // Klinik seçimi yapılmamışsa, seçim sayfasına yönlendir.
            router.replace("/select-clinic");
            return; // Yönlendirme sonrası bu render'ı durdur
          }
        } else if (allClinicIds.length === 1) {
          targetClinicId = allClinicIds[0];
          // Tek klinik varsa da kaydet ki sonradan 2. klinik eklenince temiz bi array olsun (opsiyonel)
          const accessibleClinics = await getAccessibleClinics(allClinicIds);
          if (accessibleClinics && accessibleClinics.length > 0) {
            localStorage.setItem("userAccessibleClinics", JSON.stringify(accessibleClinics));
          }
        }

        // 4. Aktif kliniğe ait verileri çek
        setLoadingStep("clinic");

        // RLS ve JWT katmanlarını eşitlemek için Klinik Değişikliğini veritabanına ve Auth Metadatasına kaydet.
        // Bunu yapmazsak RLS eski (birincil) kliniğin verilerini getirmeye çalışıyor ve kullanıcı geçiş yapsa bile veriler boş geliyor!
        if (targetClinicId && appUser.clinic_id !== targetClinicId) {
          console.log("Klinik geçişi tespit edildi. Yetkiler ve session güncelleniyor...");
          const res = await switchClinic(user.id, targetClinicId);
          if (res.success) {
            await supabase.auth.refreshSession(); // Yeni session bilgilerini (JWT) istemciye yükle.
          } else {
            console.error("Klinik geçiş yetkilendirmesi başarısız:", res.error);
          }
        }

        let clinicData: Partial<Clinic> | null = null;
        let clinicSettingsData: ClinicSettings | null = null;
        let automationsData: ClinicAutomation[] = [];
        let clinicAddonsData: ClinicAddon[] = [];

        if (targetClinicId) {
          // Paralel sorgularla hedef kliniğin tüm verilerini çek
          // RLS (Güvenlik Kuralı) hatasını (invalid_clinic) aşmak için kliniğin ana verisini Server Action üzerinden çekiyoruz.
          const [
            cData,
            { data: autoResData, error: autoResError },
            { data: settingsResData, error: settingsResError },
            { data: addonsResData, error: addonsResError }
          ] = await Promise.all([
            getClinicById(targetClinicId),
            supabase.from("clinic_automations").select("automation_id, is_visible, is_enabled, schedule_time, schedule_day").eq("clinic_id", targetClinicId),
            supabase.from("clinic_settings").select("*").eq("clinic_id", targetClinicId).maybeSingle(),
            supabase.from("clinic_addons").select("*, addon_products(*)").eq("clinic_id", targetClinicId).eq("is_visible", true).order("created_at", { ascending: true })
          ]);

          if (!cData) {
            // Seçilen klinik bulunamazsa veya inaktifse, seçimi temizle ve başa dön
            localStorage.removeItem("activeClinicId");
            router.replace("/select-clinic?error=invalid_clinic");
            return;
          }
          clinicData = cData;

          if (!cData.is_active) {
            await supabase.auth.signOut();
            router.replace("/login?error=inactive");
            return;
          }

          if (!autoResError && autoResData) {
            automationsData = (autoResData as unknown as Array<{ automation_id: string; is_visible: boolean; is_enabled: boolean; schedule_time: string | null; schedule_day: string | null }>).map((a) => ({
              id: a.automation_id,
              name: SYSTEM_AUTOMATIONS.find(s => s.id === a.automation_id)?.name || a.automation_id,
              visible: a.is_visible,
              enabled: a.is_enabled,
              time: a.schedule_time ? a.schedule_time.substring(0, 5) : "09:00",
              day: a.schedule_day ?? undefined
            }));
            automationsRef.current = automationsData;
          }
          if (!settingsResError && settingsResData) clinicSettingsData = settingsResData;
          if (!addonsResError && addonsResData) clinicAddonsData = addonsResData as ClinicAddon[];
        }

        // 5. ClinicContext'i doldur
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
          is_clinical_provider: appUser.is_clinical_provider,
          workingHours: (clinicData?.working_hours as WorkingHours) || DEFAULT_WORKING_HOURS,
          workingHoursOverrides: clinicData?.working_hours_overrides || [],
          subscriptionStatus: (clinicData as unknown as Clinic)?.subscription_status || (isSuperAdmin ? "active" : "trialing"),
          billingCycle: (clinicData as unknown as Clinic)?.billing_cycle || (isSuperAdmin ? "annual" : "monthly"),
          currentPeriodEnd: (clinicData as unknown as Clinic)?.current_period_end || null,
          lastPaymentDate: (clinicData as unknown as Clinic)?.last_payment_date || null,
          n8nWorkflows: automationsRef.current,
          clinicSettings: clinicSettingsData,
          clinicAddons: clinicAddonsData,
          planId: (clinicData as unknown as { planId?: string })?.planId || "starter",
          themeColorFrom: appUser.theme_color_from || (clinicData as any)?.theme_color_from,
          themeColorTo: appUser.theme_color_to || (clinicData as any)?.theme_color_to,
        });

        setLoadingStep("ready");
        setAllowed(true);
      } catch (err) {
        console.error("AuthGuard initialization error:", err);
        // Hata durumunda kullanıcıyı güvenli bir şekilde dışarı at
        await supabase.auth.signOut();
        router.replace("/login?error=auth_error");
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
      void updateClinicContext();
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
    const isSuper = localStorage.getItem("userRole") === "super_admin";
    const storedFrom = localStorage.getItem("themeColorFrom");
    const storedTo = localStorage.getItem("themeColorTo");

    return <LoadingScreen 
        step={loadingStep} 
        colors={isSuper 
          ? { from: "#0d9488", to: "#10b981" } 
          : (clinicCtx.themeColorFrom && clinicCtx.themeColorTo ? { from: clinicCtx.themeColorFrom, to: clinicCtx.themeColorTo } 
            : (storedFrom && storedTo ? { from: storedFrom, to: storedTo } 
              : { from: "#f43f5e", to: "#8b5cf6" }))} 
    />;
  }

  if (!allowed) {
    return null;
  }

  return (
    <ClinicIdentityContext.Provider value={{
      clinicId: clinicCtx.clinicId,
      clinicName: clinicCtx.clinicName,
      clinicSlug: clinicCtx.clinicSlug,
      userRole: clinicCtx.userRole,
      isSuperAdmin: clinicCtx.isSuperAdmin,
      isAdmin: clinicCtx.isAdmin,
      userId: clinicCtx.userId,
      userName: clinicCtx.userName,
      userEmail: clinicCtx.userEmail,
      is_clinical_provider: clinicCtx.is_clinical_provider,
      planId: clinicCtx.planId,
      themeColorFrom: clinicCtx.isSuperAdmin ? "#0d9488" : (clinicCtx.themeColorFrom || "#f43f5e"), 
      themeColorTo: clinicCtx.isSuperAdmin ? "#10b981" : (clinicCtx.themeColorTo || "#8b5cf6"),
    }}>
      {isOffline && (
        <div 
          className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-center gap-3 h-8 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl animate-in slide-in-from-top duration-500"
          style={{ background: `linear-gradient(to right, ${clinicCtx.themeColorFrom || "#f43f5e"}, ${clinicCtx.themeColorTo || "#8b5cf6"})` }}
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Bağlantı bekleniyor...
        </div>
      )}
      <ClinicDataContext.Provider value={{
        workingHours: clinicCtx.workingHours,
        workingHoursOverrides: clinicCtx.workingHoursOverrides,
        subscriptionStatus: clinicCtx.subscriptionStatus,
        billingCycle: clinicCtx.billingCycle,
        currentPeriodEnd: clinicCtx.currentPeriodEnd,
        lastPaymentDate: clinicCtx.lastPaymentDate,
        n8nWorkflows: clinicCtx.n8nWorkflows,
        clinicSettings: clinicCtx.clinicSettings,
        clinicAddons: clinicCtx.clinicAddons,
      }}>
        <UIContext.Provider value={{ isOverlayActive, isFullOverlay, setOverlayActive }}>
          {children}
        </UIContext.Provider>
      </ClinicDataContext.Provider>
    </ClinicIdentityContext.Provider>
  );
}
