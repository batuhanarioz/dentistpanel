"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types/database";
import { PricingModal } from "@/app/components/PricingModal";
import nextgencyLogo from "./nextgency-logo-yatay.png";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const isDemoMode = searchParams.get("demo") === "true";

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

  const handleDemoLogin = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: "izmirdis@gmail.com",
      password: "izmir123",
    });

    if (signInError) {
      setError("Demo girişi başarısız oldu: " + signInError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();

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
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (isDemoMode) {
      // Demo modundaysa ve henüz login değilse otomatik girişi tetikle? 
      // Veya sadece butonu vurgula. Kullanıcı butona tıklasın istiyor ("Bu butona tıklayan kullanıcı...").
    }
  }, [isDemoMode]);

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left Column - Branding (Desktop), NextGency Logo is prominent here */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between overflow-hidden bg-black p-12 xl:p-20 shadow-2xl">
        {/* Dynamic Abstract Background for Left Side */}
        <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-teal-500/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000"></div>
        <div className="absolute bottom-0 -right-1/4 w-[120%] h-[120%] bg-emerald-400/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-full h-[50%] bg-cyan-600/10 rounded-full mix-blend-screen filter blur-[120px]"></div>

        <div className="relative z-10 w-full max-w-lg mb-16 lg:mb-0">
          <div className="mb-12 block">
            <a href="https://nextgency360.com" target="_blank" rel="noopener noreferrer" className="inline-block transition-transform hover:scale-105 active:scale-95">
              <Image
                src={nextgencyLogo}
                alt="NextGency Logo"
                height={52}
                className="w-auto object-contain opacity-100"
                priority
              />
            </a>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.15]">
            Diş Klinikleri Yönetim<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-200">
              Merkezine Hoş Geldiniz
            </span>
          </h1>
          <p className="text-lg text-teal-100/70 max-w-md leading-relaxed font-light">
            Kliniğinizin tüm süreçlerini tek bir platformdan, en modern teknoloji ile güvenle ve hızla yönetin.
          </p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-hidden bg-slate-50">
        {/* Mobile Premium Dark Top Background */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-[45%] md:h-[50%] bg-black rounded-b-[2.5rem] shadow-xl"></div>

        {/* Mobile Header (Floating outside card) */}
        <div className="lg:hidden w-full max-w-[420px] relative z-10 flex flex-col items-center mt-2 mb-8">
          <a href="https://nextgency360.com" target="_blank" rel="noopener noreferrer" className="inline-block transition-transform hover:scale-105 active:scale-95">
            <Image
              src={nextgencyLogo}
              alt="NextGency Logo"
              height={44}
              className="w-auto opacity-100 object-contain mb-5"
              priority
            />
          </a>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 drop-shadow-md">
            Diş Klinikleri Yönetim
            Merkezi
          </h2>
          <p className="text-sm text-slate-300 font-light drop-shadow-sm">Yetkilendirilmiş personel girişi</p>
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          <div className="rounded-3xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Desktop Form Header */}
            <div className="hidden lg:block px-8 pt-10 pb-2 text-center">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Giriş Yap</h2>
              <p className="mt-2 text-sm text-slate-500">Hesabınıza erişmek için bilgilerinizi girin</p>
            </div>

            <div className="p-6 sm:p-8 pt-8 lg:pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    E-posta
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
                    placeholder="ornek@klinik.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
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
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 animate-in fade-in slide-in-from-top-1">
                    <p className="text-sm font-medium text-rose-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_16px_-6px_rgba(13,148,136,0.4)] transition-all hover:from-teal-800 hover:via-teal-700 hover:to-emerald-700 hover:shadow-[0_12px_20px_-8px_rgba(13,148,136,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:-translate-y-0"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş yap"
                  )}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-amber-400/80 text-amber-600 px-4 py-3 text-sm font-bold shadow-sm transition-all hover:bg-amber-50 active:scale-[0.98] disabled:opacity-60"
                  >
                    🧪 Canlı Demo
                  </button>
                  <p className="mt-2 text-[10px] text-center text-slate-400 font-medium italic">
                    Bilgi girmeden sistemi hemen deneyimleyin
                  </p>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPricingOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
                >
                  <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  Paketleri ve Fiyatları Gör
                </button>
                <p className="mt-5 text-center text-[11px] text-slate-500 leading-relaxed font-medium">
                  Giriş yapamıyorsanız, klinik yöneticinizden panel hesabınızın oluşturulmasını isteyin.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />
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
