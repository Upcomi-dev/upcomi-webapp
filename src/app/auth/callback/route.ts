import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/profile";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next") ?? undefined);
  const authMode = searchParams.get("mode");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (authMode === "signup") {
        await supabase.auth.updateUser({
          data: {
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_url: "https://www.upcomi.cc/conditions-generales-dutilisation-cgu",
            privacy_policy_accepted: true,
            privacy_policy_accepted_at: new Date().toISOString(),
            privacy_policy_url: "https://www.upcomi.cc/politique-de-confidentialite",
          },
        });
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?authError=google`);
}
