// src/app/lib/supabaseAdminClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Bu client YALNIZCA server tarafında (API route, server action vs.) kullanılmalı.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);