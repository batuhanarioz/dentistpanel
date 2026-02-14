"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";

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
        const { data: profile } = await supabase
          .from("users")
          .select("role, clinic_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === UserRole.SUPER_ADMIN) {
          router.replace("/platform/clinics");
        } else if (profile?.clinic_id) {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("slug")
            .eq("id", profile.clinic_id)
            .maybeSingle();
          router.replace(clinic?.slug ? `/${clinic.slug}` : "/");
        } else {
          router.replace("/");
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === UserRole.SUPER_ADMIN) {
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

    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-8 py-8 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-inner mb-4">
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Klinik Yönetim Paneli
              </h1>
              <p className="mt-1.5 text-sm text-teal-100/90">
                Yetkilendirilmiş personel girişi
              </p>
            </div>

            <div className="p-8 pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    E-posta
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
                    placeholder="ornek@klinik.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={togglePassword}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-teal-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-sm text-rose-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:from-teal-800 hover:via-teal-700 hover:to-emerald-600 hover:shadow-teal-500/30 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş yap"
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-500 leading-relaxed">
                Giriş yapamıyorsanız, klinik yöneticinizden panel hesabınızın
                oluşturulmasını isteyin.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-sm font-medium text-slate-400">
          Developed by{" "}
          <span className="text-teal-600 font-semibold">NextGency</span>
        </p>
      </footer>
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg">
            <svg
              className="h-6 w-6 text-white animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm text-slate-400">Yükleniyor...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
