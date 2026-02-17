// src/app/lib/supabaseAdminClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — build sırasında env var'lar mevcut olmayabilir,
// bu yüzden client yalnızca ilk çağrıda oluşturulur.
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variable'ları tanımlanmalıdır."
      );
    }

    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  }
  return _supabaseAdmin;
}

// Bu client YALNIZCA server tarafında (API route, server action vs.) kullanılmalı.
// Proxy ile lazy erişim — modül değerlendirilirken client yaratılmaz.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
