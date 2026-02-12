import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdminClient";

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
  const body = await req.json().catch(() => null);
  const oldPassword = body?.oldPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;

  if (!oldPassword || !newPassword) {
    return NextResponse.json(
      { error: "Eski şifre ve yeni şifre zorunludur" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Yeni şifre en az 6 karakter olmalıdır" },
      { status: 400 }
    );
  }

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
