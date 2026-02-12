import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdminClient";

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "unauthorized" as const };
  }

  const token = authHeader.slice("Bearer ".length);

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return { error: "unauthorized" as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role, clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "forbidden" as const };
  }

  const isSuperAdmin = profile.role === "SUPER_ADMIN";
  const isAdmin = profile.role === "ADMIN" || profile.role === "ADMIN_DOCTOR" || isSuperAdmin;

  if (!isAdmin) {
    return { error: "forbidden" as const };
  }

  return { user, clinicId: profile.clinic_id as string | null, isSuperAdmin };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "unauthorized" ? 401 : 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const newPassword = body?.password as string | undefined;

  if (!id || !newPassword) {
    return NextResponse.json(
      { error: "id ve password zorunludur" },
      { status: 400 }
    );
  }

  // ADMIN yalnızca kendi klinik kullanıcılarının şifresini sıfırlayabilir
  if (!auth.isSuperAdmin) {
    const { data: target } = await supabaseAdmin
      .from("users")
      .select("clinic_id")
      .eq("id", id)
      .maybeSingle();

    if (!target || target.clinic_id !== auth.clinicId) {
      return NextResponse.json(
        { error: "Bu kullanıcının şifresini sıfırlama yetkiniz yok" },
        { status: 403 }
      );
    }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Şifre güncellenemedi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
