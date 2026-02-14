import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { UserRole } from "@/types/database";
import { createClinicSchema, updateClinicSchema } from "@/lib/validations/clinic";
import { withAuth } from "@/lib/auth-middleware";

export const POST = withAuth(
    async (req) => {
        try {
            const validation = createClinicSchema.safeParse(
                await req.json().catch(() => ({}))
            );
            if (!validation.success) {
                return NextResponse.json(
                    { error: validation.error.issues[0].message },
                    { status: 400 }
                );
            }

            const {
                name,
                slug,
                phone,
                email,
                address,
                working_hours,
                plan_id,
                credits,
                trial_ends_at,
                automations_enabled,
                n8n_workflow_id,
                n8n_workflows,
                adminPassword,
            } = validation.data;

            // Initialize Supabase Admin Client
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                }
            );

            // 1. Create Clinic
            const { data: clinic, error: clinicError } = await supabaseAdmin
                .from("clinics")
                .insert({
                    name,
                    slug,
                    phone,
                    email,
                    address,
                    working_hours,
                    plan_id,
                    credits: credits || 0,
                    trial_ends_at,
                    automations_enabled: automations_enabled || false,
                    n8n_workflow_id,
                    n8n_workflows: n8n_workflows || [],
                })
                .select()
                .single();

            if (clinicError) {
                console.error("Clinic creation error:", clinicError);
                return NextResponse.json(
                    { error: `Klinik oluşturulamadı: ${clinicError.message}` },
                    { status: 500 }
                );
            }

            // 2. Create User in Supabase Auth
            const { data: authUser, error: authError } =
                await supabaseAdmin.auth.admin.createUser({
                    email,
                    password: adminPassword,
                    email_confirm: true, // Mark as confirmed immediately
                    user_metadata: { full_name: `${name} Admin` },
                });

            if (authError) {
                console.error("Auth creation error:", authError);
                // Rollback clinic creation
                await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
                return NextResponse.json(
                    { error: `Kullanıcı oluşturulamadı: ${authError.message}` },
                    { status: 500 }
                );
            }

            // 3. Create User in 'users' table
            const { error: userTableError } = await supabaseAdmin.from("users").insert({
                id: authUser.user.id,
                clinic_id: clinic.id,
                full_name: `${name} Admin`,
                email: email,
                role: UserRole.ADMIN,
            });

            if (userTableError) {
                console.error("Users table error:", userTableError);
                // Rollback Auth and Clinic
                await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
                await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
                return NextResponse.json(
                    { error: `Kullanıcı tablosuna eklenemedi: ${userTableError.message}` },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                clinicId: clinic.id,
                userId: authUser.user.id,
            });
        } catch (error: unknown) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Tanımlanamayan hata" },
                { status: 500 }
            );
        }
    },
    { requiredRole: [UserRole.SUPER_ADMIN] }
);

export const PATCH = withAuth(
    async (req, auth) => {
        try {
            const validation = updateClinicSchema.safeParse(
                await req.json().catch(() => ({}))
            );
            if (!validation.success) {
                return NextResponse.json(
                    { error: validation.error.issues[0].message },
                    { status: 400 }
                );
            }

            const { id, ...updateData } = validation.data;

            // Authorization: Only SUPER_ADMIN can update any clinic. 
            // Others can only update their own clinic.
            if (!auth.isSuperAdmin && id !== auth.clinicId) {
                return NextResponse.json({ error: "forbidden" }, { status: 403 });
            }

            // Initialize Supabase Admin Client
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: clinic, error: updateError } = await supabaseAdmin
                .from("clinics")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

            if (updateError) {
                return NextResponse.json(
                    { error: `Güncelleme başarısız: ${updateError.message}` },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true, clinic });
        } catch (error: unknown) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Tanımlanamayan hata" },
                { status: 500 }
            );
        }
    },
    { requiredRole: "ADMIN_OR_SUPER" }
);
