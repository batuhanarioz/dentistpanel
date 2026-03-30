import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { UserRole } from "@/types/database";
import { createUserSchema, updateUserSchema, deleteUserSchema } from "@/lib/validations/user";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(
  async (_req, auth) => {
    if (!auth.clinicId) {
      return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 400 });
    }

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, role, created_at, is_active, is_clinical_provider, specialty_code, working_hours")
      .eq("clinic_id", auth.clinicId)
      .neq("role", UserRole.SUPER_ADMIN)
      .order("created_at", { ascending: true });

    if (error || !users) {
      return NextResponse.json({ error: error?.message ?? "Kullanıcılar alınamadı" }, { status: 400 });
    }

    // Enrich with last_sign_in_at from auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map((authData?.users ?? []).map(u => [u.id, u.last_sign_in_at ?? null]));

    const enriched = users.map(u => ({
      ...u,
      last_sign_in_at: authMap.get(u.id) ?? null,
    }));

    return NextResponse.json({ users: enriched });
  }
);

export const POST = withAuth(
  async (req, auth) => {
    const validation = createUserSchema.safeParse(
      await req.json().catch(() => ({}))
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, fullName, role, clinicId: bodyClinicId, invite, isClinicalProvider } = validation.data;

    const clinicId = auth.isSuperAdmin
      ? bodyClinicId ?? auth.clinicId
      : auth.clinicId;

    if (role === UserRole.SUPER_ADMIN && !auth.isSuperAdmin) {
      return NextResponse.json(
        { error: "SUPER_ADMIN rolünü yalnızca SUPER_ADMIN oluşturabilir" },
        { status: 403 }
      );
    }

    if (role !== UserRole.SUPER_ADMIN && !clinicId) {
      return NextResponse.json(
        { error: "Klinik seçilmeden kullanıcı oluşturulamaz" },
        { status: 400 }
      );
    }

    let userId: string;

    if (invite) {
      // Davet e-postası gönder
      const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/update-password`,
      });
      if (inviteError || !invited.user) {
        return NextResponse.json(
          { error: inviteError?.message ?? "Davet gönderilemedi" },
          { status: 400 }
        );
      }
      userId = invited.user.id;
    } else {
      if (!password) {
        return NextResponse.json({ error: "Şifre zorunludur" }, { status: 400 });
      }
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
      userId = created.user.id;
    }

    const { error: insertError, data: appUser } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        clinic_id: role === UserRole.SUPER_ADMIN ? null : clinicId,
        full_name: fullName,
        email,
        role,
        is_clinical_provider: isClinicalProvider,
      }, { onConflict: "id" })
      .select("id, full_name, email, role, clinic_id, created_at, is_active, is_clinical_provider, specialty_code")
      .maybeSingle();

    if (insertError || !appUser) {
      return NextResponse.json(
        { error: insertError?.message ?? "Profil kaydı oluşturulamadı" },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: appUser }, { status: 201 });
  },
  { requiredRole: "ADMIN_OR_SUPER" }
);

export const PATCH = withAuth(
  async (req, auth) => {
    const validation = updateUserSchema.safeParse(
      await req.json().catch(() => ({}))
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id, fullName, role, isActive, isClinicalProvider, specialtyCode, workingHours } = validation.data;

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
    if (typeof fullName === "string") updateData.full_name = fullName;
    if (role) {
      if (role === UserRole.SUPER_ADMIN && !auth.isSuperAdmin) {
        return NextResponse.json(
          { error: "SUPER_ADMIN rolünü yalnızca SUPER_ADMIN atayabilir" },
          { status: 403 }
        );
      }
      updateData.role = role;
    }
    if (typeof isActive === "boolean") updateData.is_active = isActive;
    if (typeof isClinicalProvider === "boolean") updateData.is_clinical_provider = isClinicalProvider;
    if (specialtyCode !== undefined) updateData.specialty_code = specialtyCode;
    if (workingHours !== undefined) updateData.working_hours = workingHours;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, full_name, email, role, clinic_id, created_at, is_active, is_clinical_provider, specialty_code, working_hours")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Kullanıcı güncellenemedi" },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: data });
  },
  { requiredRole: "ADMIN_OR_SUPER" }
);

export const DELETE = withAuth(
  async (req, auth) => {
    const validation = deleteUserSchema.safeParse(
      await req.json().catch(() => ({}))
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id } = validation.data;

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

    if (target.role === UserRole.ADMIN && !auth.isSuperAdmin) {
      return NextResponse.json(
        { error: "ADMIN rolüne sahip kullanıcıları yalnızca SUPER_ADMIN silebilir" },
        { status: 400 }
      );
    }

    if (target.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "SUPER_ADMIN rolüne sahip kullanıcılar silinemez" },
        { status: 400 }
      );
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json(
        { error: authError.message ?? "Auth kullanıcısı silinemedi" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message ?? "Profil kaydı silinemedi" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  },
  { requiredRole: "ADMIN_OR_SUPER" }
);
