import { redirect } from "next/navigation";
import { AppFooter } from "@/components/layout/app-footer";
import { TopNav } from "@/components/layout/top-nav";
import { MyProfile } from "@/components/social/my-profile";
import { buildInitialUserProfile, type UserProfileRow } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata = getPrivatePageMetadata("Mon profil", "/profil");

/**
 * Mon profil — la vitrine, pas le formulaire.
 *
 * L'éditeur n'a pas disparu : il s'ouvre en surimpression depuis « Modifier »
 * (voir `MyProfile`). La route interceptée `@profile/(.)profil`, qui ouvrait
 * l'éditeur en modale par-dessus la page courante, a été retirée : une même
 * URL ne peut pas montrer une vitrine en navigation directe et un formulaire
 * en navigation interne.
 *
 * MAQUETTE : identité réelle, tout le reste (abonné·es, abonnements, listes
 * d'évènements) est en dur — voir `lib/social/mock-social`.
 */
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
    .select("email, name, surname, ville, pref1, pref2, gender")
    .eq("uid", user.id)
    .maybeSingle();

  const initialValues = buildInitialUserProfile(user, profile as UserProfileRow | null);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <MyProfile initialValues={initialValues} />
      </main>
      <AppFooter />
    </div>
  );
}
