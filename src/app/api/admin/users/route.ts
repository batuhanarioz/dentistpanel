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
  const isAdmin = profile.role === "ADMIN" || profile.role === "SUPER_ADMIN";

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
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const fullName = (body?.fullName as string | undefined) ?? null;
  const role = (body?.role as string | undefined) ?? "SEKRETER";
  // SUPER_ADMIN klinik belirtebilir; ADMIN kendi klinik ID'sini kullanır
  const clinicId = auth.isSuperAdmin
    ? (body?.clinicId as string | undefined) ?? auth.clinicId
    : auth.clinicId;

  if (!email || !password) {
    return NextResponse.json(
      { error: "email ve password zorunludur" },
      { status: 400 }
    );
  }

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "DOKTOR", "SEKRETER", "FINANS"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: "Geçersiz rol değeri" },
      { status: 400 }
    );
  }

  // Sadece SUPER_ADMIN, SUPER_ADMIN oluşturabilir
  if (role === "SUPER_ADMIN" && !auth.isSuperAdmin) {
    return NextResponse.json(
      { error: "SUPER_ADMIN rolünü yalnızca SUPER_ADMIN oluşturabilir" },
      { status: 403 }
    );
  }

  // SUPER_ADMIN olmayan roller için clinic_id zorunlu
  if (role !== "SUPER_ADMIN" && !clinicId) {
    return NextResponse.json(
      { error: "Klinik seçilmeden kullanıcı oluşturulamaz" },
      { status: 400 }
    );
  }

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Kullanıcı oluşturulamadı" },
      { status: 400 }
    );
  }

  const { error: insertError, data: appUser } = await supabaseAdmin
    .from("users")
    .insert({
      id: created.user.id,
      clinic_id: role === "SUPER_ADMIN" ? null : clinicId,
      full_name: fullName,
      email,
      role,
    })
    .select("id, full_name, email, role, clinic_id, created_at")
    .maybeSingle();

  if (insertError || !appUser) {
    return NextResponse.json(
      { error: insertError?.message ?? "Profil kaydı oluşturulamadı" },
      { status: 400 }
    );
  }

  return NextResponse.json({ user: appUser }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "unauthorized" ? 401 : 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const fullName = body?.fullName as string | undefined;
  const role = body?.role as string | undefined;

  if (!id) {
    return NextResponse.json(
      { error: "id zorunludur" },
      { status: 400 }
    );
  }

  // ADMIN yalnızca kendi klinik kullanıcılarını güncelleyebilir
  if (!auth.isSuperAdmin) {
    const { data: target } = await supabaseAdmin
      .from("users")
      .select("clinic_id")
      .eq("id", id)
      .maybeSingle();

    if (!target || target.clinic_id !== auth.clinicId) {
      return NextResponse.json(
        { error: "Bu kullanıcıyı güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (typeof fullName === "string") {
    updateData.full_name = fullName;
  }
  if (typeof role === "string") {
    const allowedRoles = [
      "SUPER_ADMIN",
      "ADMIN",
      "DOKTOR",
      "SEKRETER",
      "FINANS",
    ];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Geçersiz rol değeri" },
        { status: 400 }
      );
    }
    if (role === "SUPER_ADMIN" && !auth.isSuperAdmin) {
      return NextResponse.json(
        { error: "SUPER_ADMIN rolünü yalnızca SUPER_ADMIN atayabilir" },
        { status: 403 }
      );
    }
    updateData.role = role;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "Güncellenecek alan yok" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select("id, full_name, email, role, clinic_id, created_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Kullanıcı güncellenemedi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ user: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "unauthorized" ? 401 : 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;

  if (!id) {
    return NextResponse.json(
      { error: "id zorunludur" },
      { status: 400 }
    );
  }

  // ADMIN yalnızca kendi klinik kullanıcılarını silebilir
  const { data: target, error: targetError } = await supabaseAdmin
    .from("users")
    .select("role, clinic_id")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json(
      { error: targetError?.message ?? "Kullanıcı bulunamadı" },
      { status: 400 }
    );
  }

  if (!auth.isSuperAdmin && target.clinic_id !== auth.clinicId) {
    return NextResponse.json(
      { error: "Bu kullanıcıyı silme yetkiniz yok" },
      { status: 403 }
    );
  }

  // ADMIN ve SUPER_ADMIN hesaplar silinemez (SUPER_ADMIN hariç)
  if (target.role === "ADMIN" && !auth.isSuperAdmin) {
    return NextResponse.json(
      { error: "ADMIN rolüne sahip kullanıcıları yalnızca SUPER_ADMIN silebilir" },
      { status: 400 }
    );
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "SUPER_ADMIN rolüne sahip kullanıcılar silinemez" },
      { status: 400 }
    );
  }

  // Önce auth tarafında kullanıcıyı sil
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError) {
    return NextResponse.json(
      { error: authError.message ?? "Auth kullanıcısı silinemedi" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "Profil kaydı silinemedi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
