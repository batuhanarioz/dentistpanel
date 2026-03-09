import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // 'slug', 'email', or 'phone'
        const value = searchParams.get("value");

        if (!type || !value || value.length < 3) {
            return NextResponse.json({ available: false, error: "Geçersiz parametre" }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query;
        let isAvailable = true;

        switch (type) {
            case "slug":
                query = supabaseAdmin.from("clinics").select("id").eq("slug", value.toLowerCase().trim());
                break;
            case "email":
                // Check both auth and users table? Usually auth is enough for uniqueness 
                // but let's check users table since it's easier with service role and clinic data
                query = supabaseAdmin.from("users").select("id").eq("email", value.toLowerCase().trim());
                break;
            case "phone":
                query = supabaseAdmin.from("clinics").select("id").eq("phone", value.trim());
                break;
            default:
                return NextResponse.json({ available: false, error: "Geçersiz tip" }, { status: 400 });
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        isAvailable = !data;

        return NextResponse.json({
            available: isAvailable,
            message: isAvailable ? "Müsait" : "Zaten kullanımda"
        });

    } catch (error) {
        console.error("Availability check error:", error);
        return NextResponse.json({ available: false, error: "Sunucu hatası" }, { status: 500 });
    }
}
