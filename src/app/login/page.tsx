"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  const urlError = searchParams.get("error");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Kullanıcı rolü ve klinik bilgisine göre yönlendir
        const { data: profile } = await supabase
          .from("users")
          .select("role, clinic_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "SUPER_ADMIN") {
          router.replace("/platform/clinics");
        } else if (profile?.clinic_id) {
          // Klinik slug'ını al ve oraya yönlendir
          const { data: clinic } = await supabase
            .from("clinics")
            .select("slug")
            .eq("id", profile.clinic_id)
            .maybeSingle();
          router.replace(clinic?.slug ? `/${clinic.slug}` : "/login");
        } else {
          router.replace("/login");
        }
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    if (urlError === "unauthorized") {
      setError(
        "Bu e-posta ile kayıtlı bir panel kullanıcısı bulunamadı. Lütfen yetkili ile iletişime geçin."
      );
    } else if (urlError === "inactive") {
      setError(
        "Kliniğiniz şu anda aktif değil. Lütfen platform yöneticisi ile iletişime geçin."
      );
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message || "Giriş yapılamadı.");
      return;
    }

    // Kullanıcı rolü ve klinik bilgisine göre yönlendir
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "SUPER_ADMIN") {
        router.replace("/platform/clinics");
        return;
      }

      if (profile?.clinic_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("slug")
          .eq("id", profile.clinic_id)
          .maybeSingle();
        if (clinic?.slug) {
          router.replace(`/${clinic.slug}`);
          return;
        }
      }
    }

    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Klinik Yönetim Paneli
          </h1>
          <p className="mt-1 text-xs text-slate-800">
            Sadece yetkilendirilmiş klinik personeli giriş yapabilir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="ornek@klinik.com"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.7 11.7 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.656 4.656l2.829 2.829M3 3l18 18M9.878 9.878a3 3 0 104.243 4.243" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-slate-700 text-center">
          Giriş yapamıyorsanız, klinik yöneticinizden panel hesabınızın
          oluşturulmasını isteyin.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-sm text-slate-400">Yükleniyor...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
