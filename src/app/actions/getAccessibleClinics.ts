"use server";

import { createClient } from "@supabase/supabase-js";

export async function getAccessibleClinics(allClinicIds: string[]) {
  if (!allClinicIds || allClinicIds.length === 0) return [];

  // Superadmin haklarıyla (RLS bypass) kliniğin isimlerini getir
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("id, name, slug")
    .in("id", allClinicIds);

  if (error) {
    console.error("Error fetching accessible clinics:", error);
    return [];
  }

  return data || [];
}

export async function getClinicById(clinicId: string) {
  if (!clinicId) return null;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .single();

  if (error) {
    console.error("Error fetching clinic by id:", error);
    return null;
  }

  return data;
}
