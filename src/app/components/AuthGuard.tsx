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
    planId: null,
    credits: 0,
    trialEndsAt: null,
    automationsEnabled: false,
    n8nWorkflowId: null,
    n8nWorkflows: [],
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
        if (pathname !== "/") router.replace("/");
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
          router.replace("/?error=unauthorized");
          return;
        }

        const role = appUser.role as UserRole;
        const isSuperAdmin = role === UserRole.SUPER_ADMIN;
        const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

        setLoadingStep("clinic");
        let clinicData: Partial<Clinic> | null = null;

        if (!isSuperAdmin && appUser.clinic_id) {
          const [clinicRes, autoRes] = await Promise.all([
            supabase
              .from("clinics")
              .select("id, name, slug, is_active, working_hours, working_hours_overrides, plan_id, credits, trial_ends_at, automations_enabled, n8n_workflow_id")
              .eq("id", appUser.clinic_id)
              .maybeSingle(),
            supabase
              .from("clinic_automations")
              .select("*")
              .eq("clinic_id", appUser.clinic_id)
          ]);

          if (clinicRes.error || !clinicRes.data || !clinicRes.data.is_active) {
            await supabase.auth.signOut();
            router.replace(clinicRes.data?.is_active === false ? "/?error=inactive" : "/?error=unauthorized");
            return;
          }
          clinicData = clinicRes.data;

          if (!autoRes.error && autoRes.data) {
            // Map table data to context structure
            automationsRef.current = autoRes.data.map(a => ({
              id: a.automation_id,
              name: SYSTEM_AUTOMATIONS.find(s => s.id === a.automation_id)?.name || a.automation_id,
              visible: a.is_visible,
              enabled: a.is_enabled,
              time: a.schedule_time ? a.schedule_time.substring(0, 5) : "09:00",
              day: a.schedule_day
            }));
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
          planId: (clinicData as unknown as Clinic)?.plan_id || (isSuperAdmin ? "enterprise" : "starter"),
          credits: (clinicData as unknown as Clinic)?.credits ?? (isSuperAdmin ? 999999 : 0),
          trialEndsAt: (clinicData as unknown as Clinic)?.trial_ends_at || null,
          automationsEnabled: (clinicData as unknown as Clinic)?.automations_enabled ?? isSuperAdmin,
          n8nWorkflowId: (clinicData as unknown as Clinic)?.n8n_workflow_id || null,
          n8nWorkflows: automationsRef.current,
        });

        // Oturum Kaydı (Sadece ilk yüklemede ve sesssion varsa)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error: upsertError } = await supabase.from("active_sessions").upsert({
            user_id: user.id,
            session_id: session.access_token,
            created_at: new Date().toISOString(),
          }, { onConflict: 'user_id, session_id' });

          if (!upsertError) {
            const { data: sessions } = await supabase
              .from("active_sessions")
              .select("id")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false });

            if (sessions && sessions.length > 2) {
              const sessionsToDelete = sessions.slice(2).map(s => s.id);
              await supabase.from("active_sessions").delete().in("id", sessionsToDelete);
            }
          }
        }

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

  // 2. Aşama: URL ve Slug Kontrolü (Sayfa geçişlerinde çalışır, veritabanına gitmez)
  useEffect(() => {
    if (!allowed) return;

    if (pathname !== "/") {
      if (!clinicCtx.isSuperAdmin && clinicCtx.clinicSlug) {
        const urlSlug = pathname.split("/")[1];
        if (urlSlug !== clinicCtx.clinicSlug) {
          router.replace(`/${clinicCtx.clinicSlug}`);
        }
      } else if (clinicCtx.isSuperAdmin) {
        if (!pathname.startsWith("/platform")) {
          router.replace("/platform/clinics");
        }
      }
    }
  }, [pathname, allowed, clinicCtx.clinicSlug, clinicCtx.isSuperAdmin, router]);

  // 3. Aşama: Oturum Geçerlilik Kontrolü (Arka Planda)
  useEffect(() => {
    if (!allowed) return;

    const intervalId = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: exists, error } = await supabase
        .from("active_sessions")
        .select("id")
        .eq("session_id", session.access_token)
        .maybeSingle();

      // Sadece veri geldiyse ve oturum yoksa at (Ağ hatasında veya tablo yoksa atma)
      if (!error && !exists && allowed) {
        await supabase.auth.signOut();
        window.location.href = "/?error=session_expired";
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [allowed]);

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
