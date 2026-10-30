import "server-only";
import { createClient } from "@supabase/supabase-js";
import { truncationGuardFetch } from "@/lib/supabase/fetch-all";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseSecretKey, {
    global: { fetch: truncationGuardFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
