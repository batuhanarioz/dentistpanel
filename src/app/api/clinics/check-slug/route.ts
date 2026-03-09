import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");

        if (!slug || slug.length < 3) {
            return NextResponse.json({ available: false, error: "Geçersiz slug" }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabaseAdmin
            .from("clinics")
            .select("id")
            .eq("slug", slug.toLowerCase().trim())
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({
            available: !data,
            message: data ? "Bu adres zaten kullanımda" : "Bu adres müsait"
        });

    } catch (error) {
        return NextResponse.json({ available: false, error: "Sunucu hatası" }, { status: 500 });
    }
}
