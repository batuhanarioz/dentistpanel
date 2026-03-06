import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { changePasswordSchema } from "@/lib/validations/auth";

/**
 * Kullanıcının kendi şifresini değiştirmesi.
 * Body: { oldPassword, newPassword }
 *
 * Eski şifre doğrulanır (kullanıcı e-posta + eski şifre ile giriş denenir).
 * Doğruysa yeni şifre supabaseAdmin ile güncellenir.
 */
export async function POST(req: NextRequest) {
  // 1) Bearer token ile oturum doğrula
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) Body'den eski ve yeni şifreyi al
  const validation = changePasswordSchema.safeParse(await req.json().catch(() => ({})));
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { oldPassword, newPassword } = validation.data;

  // 3) Eski şifreyi doğrulamak için kullanıcıyı tekrar giriş yaptır
  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Mevcut şifreniz hatalı. Şifrenizi hatırlamıyorsanız panel yöneticinize başvurun." },
      { status: 400 }
    );
  }

  // 4) Yeni şifreyi admin client ile güncelle
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? "Şifre güncellenemedi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
