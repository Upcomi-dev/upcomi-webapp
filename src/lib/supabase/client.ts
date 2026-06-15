import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import {
  PASSWORD_RECOVERY_CODE_VERIFIER_SUFFIX,
  PASSWORD_RECOVERY_PENDING_KEY,
} from "@/lib/auth/recovery";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  rememberPasswordRecoveryCallback();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createBrowserClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      encode: "tokens-only",
      getAll() {
        return parseCookieHeader(document.cookie).map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeCookieHeader(name, value, options);
        });
      },
    },
  });

  return client;
}

function rememberPasswordRecoveryCallback() {
  if (
    typeof window === "undefined" ||
    window.location.pathname !== "/reset-password"
  ) {
    return;
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.endsWith("-code-verifier")) continue;

      const value = window.localStorage.getItem(key);
      if (value?.endsWith(PASSWORD_RECOVERY_CODE_VERIFIER_SUFFIX)) {
        window.sessionStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, "true");
        return;
      }
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
