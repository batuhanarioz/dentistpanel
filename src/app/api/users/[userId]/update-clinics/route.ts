import { withAuth } from "@/lib/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { UserRole } from "@/types/database";

// Bu endpoint, SUPER_ADMIN'in bir kullanıcının erişebildiği klinikleri tek seferde güncellemesini sağlar.
// Gönderilen klinik dizisi (additional_clinics), kullanıcının ap_metadata'sındaki mevcut dizinin üzerine yazılır.
export const POST = withAuth(async (req, auth) => {
  // Next.js dynamic params withAuth tarafından ezildiği için path üzerinden alıyoruz
  const urlParts = req.nextUrl.pathname.split("/");
  const userId = urlParts[urlParts.length - 2];
  
  const body = await req.json().catch(() => ({}));
  const { additional_clinics } = body;

  // additional_clinics'in mutlak suretle string UUID'lerden oluşan bir dizi olmasını şart koşuyoruz.
  if (!userId || !Array.isArray(additional_clinics)) {
    return NextResponse.json({ error: "Kullanıcı ID ve klinik ID dizisi (array olarak additional_clinics) gereklidir." }, { status: 400 });
  }

  // Her eleman UUID formatında string olmalı
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalidItems = (additional_clinics as unknown[]).filter(
    (id) => typeof id !== "string" || !UUID_REGEX.test(id)
  );
  if (invalidItems.length > 0) {
    return NextResponse.json({ error: "Geçersiz klinik ID formatı. Tüm elemanlar UUID olmalıdır." }, { status: 400 });
  }

  // Sadece SUPER_ADMIN bu işlemi yapabilir (withAuth tarafından zorunlu kılınır)

  // Supabase Admin Client'ı oluştur
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 0. Gönderilen clinic_id'lerin gerçekten DB'de var olduğunu doğrula
    if ((additional_clinics as string[]).length > 0) {
      const { data: existingClinics } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .in("id", additional_clinics as string[]);

      const foundIds = new Set((existingClinics ?? []).map((c: { id: string }) => c.id));
      const missingIds = (additional_clinics as string[]).filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Şu klinikler bulunamadı: ${missingIds.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // 1. Mevcut kullanıcı verilerini al (Doğrulama ve mevcut app_metadata'yı bozmamak için)
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError) throw getUserError;
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

    // 2. Kullanıcının app_metadata'sını sadece yeni gönderilen dizi ile güncelle.
    // Gönderilen dizi boş [] ise, kullanıcının tüm ek yetkilerini sıfırlamış/almış oluruz.
    const currentMetadata = user.app_metadata || {};
    const { data: updateData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { app_metadata: { ...currentMetadata, additional_clinics: additional_clinics } }
    );

    if (updateUserError || !updateData?.user) throw updateUserError || new Error("Kullanıcı güncellenemedi.");
    const updatedUser = updateData.user;

    return NextResponse.json({
      success: true,
      assignedClinics: updatedUser.app_metadata?.additional_clinics || [],
      message: "Klinik yetkileri başarıyla güncellendi."
    });
  } catch (err: unknown) {
    console.error("Klinik yetkileri güncellenirken hata:", err);
    return NextResponse.json({ error: "Klinik yetkileri güncellenirken bir hata oluştu." }, { status: 500 });
  }
}, { requiredRole: [UserRole.SUPER_ADMIN] });
