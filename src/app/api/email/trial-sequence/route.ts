import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTrialDay3Email, sendTrialEndingSoonEmail } from "@/lib/email";

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

  const now = new Date();
  let day3Count = 0;
  let day6Count = 0;

  // ── Day 3 emails ──────────────────────────────────────────────────────────
  const day3Start = new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString();
  const day3End = new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: day3Clinics } = await supabaseAdmin
    .from("clinics")
    .select("id, name, email")
    .eq("subscription_status", "trialing")
    .gte("created_at", day3Start)
    .lte("created_at", day3End);

  for (const clinic of day3Clinics ?? []) {
    if (!clinic.email) continue;
    // Check if already sent
    const { data: existing } = await supabaseAdmin
      .from("email_logs")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("email_type", "trial_day3")
      .maybeSingle();

    if (existing) continue;

    try {
      await sendTrialDay3Email(clinic.email, clinic.name);
      await supabaseAdmin.from("email_logs").insert({
        clinic_id: clinic.id,
        email_type: "trial_day3",
        recipient_email: clinic.email,
      });
      day3Count++;
    } catch {
      // log silently, don't fail cron
    }
  }

  // ── Day 6 / ending soon emails ────────────────────────────────────────────
  const endIn48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const endIn24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: endingSoonClinics } = await supabaseAdmin
    .from("clinics")
    .select("id, name, email, current_period_end")
    .eq("subscription_status", "trialing")
    .gte("current_period_end", endIn24h)
    .lte("current_period_end", endIn48h);

  for (const clinic of endingSoonClinics ?? []) {
    if (!clinic.email) continue;
    const { data: existing } = await supabaseAdmin
      .from("email_logs")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("email_type", "trial_ending_soon")
      .maybeSingle();

    if (existing) continue;

    const daysLeft = Math.ceil(
      (new Date(clinic.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    try {
      await sendTrialEndingSoonEmail(clinic.email, clinic.name, daysLeft);
      await supabaseAdmin.from("email_logs").insert({
        clinic_id: clinic.id,
        email_type: "trial_ending_soon",
        recipient_email: clinic.email,
      });
      day6Count++;
    } catch {
      // log silently
    }
  }

  return NextResponse.json({ ok: true, day3: day3Count, endingSoon: day6Count });
}
