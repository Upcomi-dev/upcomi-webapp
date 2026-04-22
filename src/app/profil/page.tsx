import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { buildInitialUserProfile, type UserProfileRow } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fprofil");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email, name, surname, ville, pref1, pref2")
    .eq("uid", user.id)
    .maybeSingle();

  const initialValues = buildInitialUserProfile(user, profile as UserProfileRow | null);

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto flex w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full rounded-[30px] border border-white/65 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(250,242,232,0.98)_52%,rgba(247,237,221,0.98))] p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="border-b border-foreground/8 pb-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Mon profil
              </p>
              <h1 className="font-serif text-[32px] leading-none tracking-tight text-foreground">
                Mes informations
              </h1>
              <p className="max-w-[48ch] text-[14px] leading-6 text-foreground/62">
                Mets à jour tes informations personnelles et ton type de pratique quand tu veux.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <UserProfileForm mode="profile" initialValues={initialValues} />
          </div>
        </section>
      </main>
    </div>
  );
}
