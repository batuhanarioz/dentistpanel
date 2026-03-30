"use server";

import { createClient } from "@supabase/supabase-js";

export async function switchClinic(userId: string, newClinicId: string) {
    if (!userId || !newClinicId) return { success: false, error: "Missing parameters" };

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Get the current user and their profile to validate access
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return { success: false, error: "User not found in Auth" };

    const { data: profile } = await supabaseAdmin
        .from("users")
        .select("clinic_id, role")
        .eq("id", userId)
        .single();
        
    if (!profile) return { success: false, error: "User profile not found" };

    const isSuperAdmin = profile.role === "SUPER_ADMIN";
    const additionalClinics = user.app_metadata?.additional_clinics || [];
    
    // Calculate the complete list of authorized clinics 
    // and remember the old primary clinic so it doesn't get lost
    let updatedAdditional = [...additionalClinics];
    if (profile.clinic_id && !updatedAdditional.includes(profile.clinic_id)) {
        updatedAdditional.push(profile.clinic_id);
    }
    
    // Authorization Check
    if (!isSuperAdmin && newClinicId !== profile.clinic_id && !updatedAdditional.includes(newClinicId)) {
        return { success: false, error: "Unauthorized: You don't have permission to access clinic " + newClinicId };
    }

    // 2. Update Auth Metadata (JWT Claims)
    // Both app_metadata and user_metadata can be targeted by RLS depending on how it was written
    await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { ...user.app_metadata, clinic_id: newClinicId, additional_clinics: updatedAdditional },
        user_metadata: { ...user.user_metadata, clinic_id: newClinicId }
    });

    // 3. Update public schema (Database Lookups)
    const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ clinic_id: newClinicId })
        .eq("id", userId);
    
    if (updateError) {
        console.error("Error updating public.users.clinic_id:", updateError);
        return { success: false, error: updateError.message };
    }

    return { success: true };
}
