import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(
  async (_req, auth) => {
    // Sadece SUPER_ADMIN yetkisiyle platformdaki tüm kullanıcılara erişilebilir
    if (!auth.isSuperAdmin) {
      return NextResponse.json({ error: "Bu sayfaya veya verilere yalnızca SUPER_ADMIN erişebilir." }, { status: 403 });
    }

    try {
      // 1. users tablosundaki tüm aktif/inaktif kullanıcıları ve onlara bağlı ana clinic_id'ye sahip kliniği çekiyoruz
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from("users")
        .select(`
          id, 
          full_name, 
          email, 
          role, 
          is_active,
          clinics (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // 2. Auth servisindeki kullanıcıları çekiyoruz (app_metadata içindeki additional_clinics bilgisine erişmek için)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (authError) throw authError;

      // Hızlı eşleşme için Auth datasını bir Map yapısına alıyoruz
      const authMap = new Map(
        (authData?.users || []).map((u) => [
          u.id,
          {
            additional_clinics: u.app_metadata?.additional_clinics || [],
            last_sign_in_at: u.last_sign_in_at || null
          }
        ])
      );

      // İki veriyi birleştiriyoruz (Enrich)
      const enrichedUsers = usersData?.map((u: any) => {
        const authInfo = authMap.get(u.id);
        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          is_active: u.is_active,
          primary_clinic: u.clinics, // Ana kliniği objesi (id, name)
          additional_clinics: authInfo?.additional_clinics || [], // Bu kullanıcının ekstra yetkili olduğu klinikler
          last_sign_in_at: authInfo?.last_sign_in_at || null,
        };
      }) || [];

      // 3. Sistemdeki Tüm Aktif Klinikleri çekiyoruz (Modal'daki çoklu seçim alanı için lazım)
      const { data: clinicsData } = await fallbackClinics();

      return NextResponse.json({ users: enrichedUsers, clinics: clinicsData });
    } catch (err: any) {
      console.error("Platform kullanıcıları getirilirken hata:", err);
      return NextResponse.json({ error: err.message || "Bilinmeyen bir hata oluştu" }, { status: 500 });
    }
  },
  { requiredRole: "ADMIN_OR_SUPER" }
);

// Fallback clinics checker
async function fallbackClinics() {
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Klinikler alınamadı", error);
    return { data: [] };
  }
  return { data };
}