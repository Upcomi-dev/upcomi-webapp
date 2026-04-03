import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        // Bypass navigator.locks which causes deadlocks
        lock: (async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
          return await fn();
        }) as never,
      },
    }
  );

  return client;
}
