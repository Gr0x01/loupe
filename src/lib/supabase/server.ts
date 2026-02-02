import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role client for server-side operations (no RLS)
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
