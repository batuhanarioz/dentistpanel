import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(
    async () => {
        try {
            if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
                return NextResponse.json(
                    { error: "n8n API credentials missing" },
                    { status: 500 }
                );
            }

            const res = await fetch(`${process.env.N8N_API_URL}/workflows`, {
                headers: {
                    "X-N8N-API-KEY": process.env.N8N_API_KEY,
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("n8n API Error:", errorText);
                return NextResponse.json(
                    { error: "n8n API request failed" },
                    { status: res.status }
                );
            }

            const data = await res.json();

            // n8n returns { data: [ { id: string, name: string, active: boolean, ... } ] }
            const workflows = (
                (data.data as { id: string; name: string; active: boolean }[]) || []
            ).map((wf) => ({
                id: wf.id,
                name: wf.name,
                active: wf.active,
            }));

            return NextResponse.json(workflows);
        } catch (error: unknown) {
            console.error("Fetch Workflows Error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Tanımlanamayan hata" },
                { status: 500 }
            );
        }
    },
    { requiredRole: "ADMIN_OR_SUPER" }
);
