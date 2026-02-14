import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { resetPasswordSchema } from "@/lib/validations/user";
import { withAuth } from "@/lib/auth-middleware";

export const POST = withAuth(
  async (req, auth) => {
    const validation = resetPasswordSchema.safeParse(
      await req.json().catch(() => ({}))
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id, password: newPassword } = validation.data;

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
  },
  { requiredRole: "ADMIN_OR_SUPER" }
);
