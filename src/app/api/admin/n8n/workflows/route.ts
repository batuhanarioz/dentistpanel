import { NextResponse } from "next/server";

export async function GET() {
    try {
        if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
            return NextResponse.json({ error: "n8n API credentials missing" }, { status: 500 });
        }

        const res = await fetch(`${process.env.N8N_API_URL}/workflows`, {
            headers: {
                "X-N8N-API-KEY": process.env.N8N_API_KEY,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("n8n API Error:", errorText);
            return NextResponse.json({ error: "n8n API request failed" }, { status: res.status });
        }

        const data = await res.json();

        // n8n returns { data: [ { id: string, name: string, active: boolean, ... } ] }
        const workflows = (data.data || []).map((wf: any) => ({
            id: wf.id,
            name: wf.name,
            active: wf.active
        }));

        return NextResponse.json(workflows);
    } catch (error: any) {
        console.error("Fetch Workflows Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
