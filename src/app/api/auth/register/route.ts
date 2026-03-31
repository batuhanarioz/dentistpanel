import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { UserRole } from "@/types/database";
import { createClinicSchema } from "@/lib/validations/clinic";
import { registerLimiter, getClientIp } from "@/lib/rateLimit";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const { success } = await registerLimiter.limit(ip);
    if (!success) {
        return NextResponse.json({ error: "Çok fazla kayıt denemesi. 15 dakika sonra tekrar deneyin." }, { status: 429 });
    }

    try {
        const body = await req.json().catch(() => ({}));

        // Use the existing schema but we might want to override some defaults for public registration
        const validation = createClinicSchema.safeParse({
            ...body,
            subscription_status: "trialing", // Always start with trial
            billing_cycle: "monthly",
            current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
        });

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
            adminPassword,
            subscription_status,
            billing_cycle,
            current_period_end
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

        // Check if slug exists
        const { data: existingClinic } = await supabaseAdmin
            .from("clinics")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (existingClinic) {
            return NextResponse.json(
                { error: "Bu klinik adresi (slug) zaten kullanımda." },
                { status: 400 }
            );
        }

        // Check if email already has an active clinic association
        const { data: existingProfile } = await supabaseAdmin
            .from("users")
            .select("id, clinic_id")
            .eq("email", email)
            .maybeSingle();

        if (existingProfile && existingProfile.clinic_id) {
            return NextResponse.json(
                { error: "Bu e-posta adresi ile zaten bir klinik kaydı bulunuyor. Lütfen giriş yapın." },
                { status: 400 }
            );
        }

        // 1. Create Clinic
        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from("clinics")
            .insert({
                name,
                slug,
                phone,
                email,
                address,
                subscription_status,
                billing_cycle,
                current_period_end,
                is_active: true
            })
            .select()
            .single();

        if (clinicError) {
            return NextResponse.json(
                { error: `Klinik oluşturulamadı: ${clinicError.message}` },
                { status: 500 }
            );
        }

        // 2. Create User in Supabase Auth (via anon signUp so confirmation email is sent)
        const supabaseAnon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: authUser, error: authError } = await supabaseAnon.auth.signUp({
            email,
            password: adminPassword,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://clinic.nextgency360.com"}/login`,
                data: { full_name: `${name} Yetkilisi` },
            },
        });

        // If identities is empty, email already exists in auth
        if (!authUser?.user?.id || (authUser.user.identities && authUser.user.identities.length === 0)) {
            await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
            return NextResponse.json(
                { error: "Bu e-posta adresi zaten kullanımda." },
                { status: 400 }
            );
        }

        if (authError) {
            // Rollback clinic creation
            await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
            return NextResponse.json(
                { error: `Kullanıcı oluşturulamadı: ${authError.message}` },
                { status: 500 }
            );
        }

        // 3. Create or update User in 'users' table (using upsert to handle potential triggers)
        const { error: userTableError } = await supabaseAdmin.from("users").upsert({
            id: authUser.user.id,
            clinic_id: clinic.id,
            full_name: `${name} Yetkilisi`,
            email: email,
            role: UserRole.ADMIN,
        });

        if (userTableError) {
            // Rollback Auth and Clinic
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);

            let message = "Profil oluşturulamadı.";
            if (userTableError.code === "23505") {
                if (userTableError.message.includes("email")) message = "Bu e-posta adresi zaten kullanımda.";
                else message = "Bu kayıt zaten mevcut.";
            } else {
                message = `Hata: ${userTableError.message}`;
            }

            return NextResponse.json(
                { error: message },
                { status: 500 }
            );
        }

        // 4. Create default settings for the clinic
        await supabaseAdmin.from("clinic_settings").insert({
            clinic_id: clinic.id,
            notification_settings: {
                is_reminder_enabled: true,
                is_satisfaction_enabled: false,
                is_payment_enabled: true
            }
        });

        // Referral kodu kullanıldıysa kontrol et (aktif + self-referral engeli)
        const referralCodeFromBody = (body.referral_code as string | undefined)?.toUpperCase().trim();
        const clinicUpdate: Record<string, unknown> = {};

        if (referralCodeFromBody) {
            const { data: referrer } = await supabaseAdmin
                .from("clinics")
                .select("id, email, referral_code_active")
                .eq("referral_code", referralCodeFromBody)
                .maybeSingle();

            const isSelfReferral = referrer?.id === clinic.id || referrer?.email === email;
            const isActive = referrer?.referral_code_active === true;

            if (referrer && isActive && !isSelfReferral) {
                clinicUpdate.referred_by = referrer.id;
                await supabaseAdmin.from("referral_conversions").insert({
                    referrer_clinic_id: referrer.id,
                    referred_clinic_id: clinic.id,
                    status: "pending",
                });
            }
        }

        if (Object.keys(clinicUpdate).length > 0) {
            await supabaseAdmin.from("clinics").update(clinicUpdate).eq("id", clinic.id);
        }

        // Fire-and-forget welcome email
        sendWelcomeEmail(email, name, 7).catch(() => {});

        return NextResponse.json({
            success: true,
            message: "Kayıt başarıyla tamamlandı. Artık giriş yapabilirsiniz.",
            clinicSlug: clinic.slug
        });

    } catch (error: unknown) {
        console.error("Registration Error:", error);
        return NextResponse.json(
            { error: "Sunucu tarafında bir hata oluştu." },
            { status: 500 }
        );
    }
}
