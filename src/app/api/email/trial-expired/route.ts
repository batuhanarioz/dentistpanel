import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTrialExpiredEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: expiredClinics } = await supabaseAdmin
    .from("clinics")
    .select("id, name, email")
    .eq("subscription_status", "trialing")
    .lt("current_period_end", new Date().toISOString());

  let count = 0;
  for (const clinic of expiredClinics ?? []) {
    if (!clinic.email) continue;

    const { data: existing } = await supabaseAdmin
      .from("email_logs")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("email_type", "trial_expired")
      .maybeSingle();

    if (!existing) {
      try {
        await sendTrialExpiredEmail(clinic.email, clinic.name);
        await supabaseAdmin.from("email_logs").insert({
          clinic_id: clinic.id,
          email_type: "trial_expired",
          recipient_email: clinic.email,
        });
        count++;
      } catch {
        // log silently
      }
    }

    // Mark as canceled
    await supabaseAdmin
      .from("clinics")
      .update({ subscription_status: "canceled" })
      .eq("id", clinic.id);
  }

  return NextResponse.json({ ok: true, expired: count });
}
