import { withAuth } from "@/lib/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Bu endpoint, SUPER_ADMIN'in bir kullanıcının erişebildiği klinikleri tek seferde güncellemesini sağlar.
// Gönderilen klinik dizisi (additional_clinics), kullanıcının ap_metadata'sındaki mevcut dizinin üzerine yazılır.
export const POST = withAuth(async (req, auth) => {
  // Next.js dynamic params withAuth tarafından ezildiği için path üzerinden alıyoruz
  const urlParts = req.nextUrl.pathname.split("/");
  const userId = urlParts[urlParts.length - 2];
  
  const body = await req.json().catch(() => ({}));
  const { additional_clinics } = body;

  // additional_clinics'in mutlak suretle bir dizi (array) olmasını şart koşuyoruz.
  if (!userId || !Array.isArray(additional_clinics)) {
    return NextResponse.json({ error: "Kullanıcı ID ve klinik ID dizisi (array olarak additional_clinics) gereklidir." }, { status: 400 });
  }

  // Sadece SUPER_ADMIN bu işlemi yapabilir (withAuth tarafından zorunlu kılınır)

  // Supabase Admin Client'ı oluştur
  // DİKKAT: environment değişkenleri sunucuda olmalıdır.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Mevcut kullanıcı verilerini al (Doğrulama ve mevcut app_metadata'yı bozmamak için)
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError) throw getUserError;
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

    // 2. Kullanıcının app_metadata'sını sadece yeni gönderilen dizi ile güncelle.
    // Gönderilen dizi boş [] ise, kullanıcının tüm ek yetkilerini sıfırlamış/almış oluruz.
    const currentMetadata = user.app_metadata || {};
    const { data: { user: updatedUser }, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { app_metadata: { ...currentMetadata, additional_clinics: additional_clinics } }
    );

    if (updateUserError) throw updateUserError;

    return NextResponse.json({
      success: true,
      assignedClinics: (updatedUser as any).app_metadata?.additional_clinics || [],
      message: "Klinik yetkileri başarıyla güncellendi."
    });
  } catch (error: any) {
    console.error("Klinik yetkileri güncellenirken hata:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen bir sunucu hatası oluştu." }, { status: 500 });
  }
}, { requiredRole: "ADMIN_OR_SUPER" });
