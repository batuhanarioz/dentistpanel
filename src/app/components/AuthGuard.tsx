"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Login sayfası ve public rotalar için guard devre dışı
    if (pathname === "/login") {
      setAllowed(true);
      setChecking(false);
      return;
    }

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Kullanıcının panelde kaydı var mı kontrol et
      const { data: appUser, error } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !appUser) {
        await supabase.auth.signOut();
        router.replace("/login?error=unauthorized");
        return;
      }

      setAllowed(true);
      setChecking(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-800">
        Panele erişim kontrol ediliyor...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

