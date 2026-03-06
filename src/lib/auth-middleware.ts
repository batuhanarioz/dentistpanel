import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { UserRole } from "@/types/database";

export type AuthContext = {
    user: { id: string; email?: string };
    clinicId: string | null;
    role: UserRole;
    isSuperAdmin: boolean;
    isAdmin: boolean;
};

type ApiHandler = (req: NextRequest, context: AuthContext) => Promise<NextResponse>;

export function withAuth(
    handler: ApiHandler,
    options?: { requiredRole?: UserRole[] | "ADMIN_OR_SUPER" }
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        try {
            const authHeader = req.headers.get("authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return NextResponse.json({ error: "unauthorized" }, { status: 401 });
            }

            const token = authHeader.slice("Bearer ".length);
            const authClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const {
                data: { user },
                error,
            } = await authClient.auth.getUser(token);
            if (error || !user) {
                return NextResponse.json({ error: "unauthorized" }, { status: 401 });
            }

            const { data: profile, error: profileError } = await supabaseAdmin
                .from("users")
                .select("role, clinic_id")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError || !profile) {
                return NextResponse.json({ error: "forbidden" }, { status: 403 });
            }

            const role = profile.role as UserRole;
            const isSuperAdmin = role === UserRole.SUPER_ADMIN;
            const isAdmin = role === UserRole.ADMIN || isSuperAdmin;

            // Role Check Logic
            if (options?.requiredRole) {
                if (options.requiredRole === "ADMIN_OR_SUPER") {
                    if (!isAdmin) {
                        return NextResponse.json({ error: "forbidden" }, { status: 403 });
                    }
                } else if (Array.isArray(options.requiredRole)) {
                    if (!options.requiredRole.includes(role)) {
                        return NextResponse.json({ error: "forbidden" }, { status: 403 });
                    }
                }
            }

            const context: AuthContext = {
                user: { id: user.id, email: user.email },
                clinicId: profile.clinic_id,
                role,
                isSuperAdmin,
                isAdmin,
            };

            return await handler(req, context);
        } catch (err) {
            console.error("Auth Middleware Error:", err);
            return NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500 }
            );
        }
    };
}
