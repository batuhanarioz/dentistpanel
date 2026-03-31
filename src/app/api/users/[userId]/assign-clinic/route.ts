
import { withAuth } from "@/lib/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { UserRole } from "@/types/database";

// Bu endpoint, SUPER_ADMIN'in bir kullanıcıya ek klinik erişimi vermesini sağlar.
// Supabase Admin Client kullanarak kullanıcının app_metadata'sını günceller.
export const POST = withAuth(async (req, ctx) => {
  const { userId } = ctx.params;
  const { clinicIdToAssign } = await req.json();

  if (!userId || !clinicIdToAssign) {
    return NextResponse.json({ error: "Kullanıcı ID ve atanacak klinik ID gereklidir." }, { status: 400 });
  }

  // Sadece SUPER_ADMIN bu işlemi yapabilir (withAuth tarafından zorunlu kılınır)

  // Supabase Admin Client'ı oluştur
  // DİKKAT: Bu bilgileri doğrudan koda yazmak yerine environment değişkenlerinden okumak en doğrusudur.
  // Bu, daha sonraki adımlarda düzeltilecektir.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Mevcut kullanıcı verilerini al
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError) throw getUserError;
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });


    // 2. Mevcut ek klinikleri al veya yeni bir dizi oluştur
    const existingClinics = user.app_metadata?.additional_clinics || [];

    // Eğer klinik zaten atanmışsa tekrar ekleme
    if (existingClinics.includes(clinicIdToAssign)) {
      return NextResponse.json({ message: "Bu klinik zaten kullanıcıya atanmış." });
    }

    // 3. Yeni kliniği diziye ekle
    const updatedClinics = [...existingClinics, clinicIdToAssign];

    // 4. Kullanıcının app_metadata'sını güncelle
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { app_metadata: { ...user.app_metadata, additional_clinics: updatedClinics } }
    );

    if (updateUserError) throw updateUserError;

    return NextResponse.json({ success: true, assignedClinics: updatedUser.user.app_metadata.additional_clinics });
  } catch (err: unknown) {
    console.error("Klinik atama hatası:", err);
    return NextResponse.json({ error: "Klinik atama sırasında bir hata oluştu." }, { status: 500 });
  }
}, { requiredRole: [UserRole.SUPER_ADMIN] });
