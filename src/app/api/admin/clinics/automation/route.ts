import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Bu API route sadece SERVER SIDE çalışmalı (Admin yetkisi kontrolü için)
export async function POST(req: Request) {
    try {
        const { clinicId, enabled, workflowId } = await req.json();

        if (!clinicId) {
            return NextResponse.json({ error: "ClinicId is required" }, { status: 400 });
        }

        // 1. Supabase Admin Client oluştur (RLS'i aşmak için gerekebilir veya normal yetki ile)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Mevcut klinikteki n8n_workflows verisini çek ve güncelle
        const { data: clinic, error: fetchError } = await supabaseAdmin
            .from("clinics")
            .select("n8n_workflows")
            .eq("id", clinicId)
            .single();

        if (fetchError) throw fetchError;

        const currentWorkflows = clinic.n8n_workflows || [];
        const updatedWorkflows = currentWorkflows.map((wf: any) =>
            wf.id === workflowId ? { ...wf, enabled } : wf
        );

        // Veritabanını güncelle
        const { error: dbError } = await supabaseAdmin
            .from("clinics")
            .update({
                automations_enabled: enabled,
                n8n_workflow_id: workflowId,
                n8n_workflows: updatedWorkflows
            })
            .eq("id", clinicId);

        if (dbError) throw dbError;

        // 3. n8n API'sini çağır (Eğer workflowId varsa)
        // n8n'de workflow açıp kapatmak için: POST /workflows/:id/activate veya /deactivate
        if (workflowId && process.env.N8N_API_URL && process.env.N8N_API_KEY) {
            const action = enabled ? "activate" : "deactivate";
            const n8nUrl = `${process.env.N8N_API_URL}/workflows/${workflowId}/${action}`;

            try {
                const n8nRes = await fetch(n8nUrl, {
                    method: "POST",
                    headers: {
                        "X-N8N-API-KEY": process.env.N8N_API_KEY,
                    },
                });

                if (!n8nRes.ok) {
                    console.error("n8n API Error:", await n8nRes.text());
                    // Opsiyonel: n8n hatası olsa bile DB güncellendiği için devam edebiliriz 
                    // veya kullanıcıya hata dönebiliriz.
                }
            } catch (n8nErr) {
                console.error("n8n Fetch Error:", n8nErr);
            }
        }

        return NextResponse.json({ success: true, enabled });
    } catch (error: any) {
        console.error("Automation Toggle Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
