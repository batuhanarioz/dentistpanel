"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

/**
 * Root sayfa: Kullanıcıyı rolüne göre doğru slug'a veya platforma yönlendirir.
 * - SUPER_ADMIN → /platform/clinics
 * - Klinik kullanıcısı → /{clinic_slug}
 * - Giriş yapmamış → /login
 */
export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role, clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role === "SUPER_ADMIN") {
        router.replace("/platform/clinics");
        return;
      }

      if (profile.clinic_id) {
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

      // Fallback
      router.replace("/login");
    };

    redirect();
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-800">
      Yönlendiriliyor...
    </div>
  );
}
