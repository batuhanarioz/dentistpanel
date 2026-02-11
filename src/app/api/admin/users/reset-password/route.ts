import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/lib/supabaseAdminClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "unauthorized" as const };
  }

  const token = authHeader.slice("Bearer ".length);

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return { error: "unauthorized" as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "ADMIN") {
    return { error: "forbidden" as const };
  }

  return { user };
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

