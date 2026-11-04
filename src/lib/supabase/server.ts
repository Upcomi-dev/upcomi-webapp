import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { truncationGuardFetch } from "@/lib/supabase/fetch-all";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      global: {
        fetch: truncationGuardFetch,
        // La RLS ne laisse lire le catalogue qu'aux requêtes portant cette clé
        // (cf. public.is_upcomi_web_server) : la clé publique seule ne suffit
        // plus à aspirer la base. Ne jamais l'envoyer au navigateur.
        headers: {
          "x-upcomi-server-key": process.env.SUPABASE_SERVER_READ_KEY ?? "",
        },
      },
      cookies: {
        encode: "tokens-only",
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
