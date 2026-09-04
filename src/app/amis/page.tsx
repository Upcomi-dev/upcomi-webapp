import { redirect } from "next/navigation";
import { AppFooter } from "@/components/layout/app-footer";
import { TopNav } from "@/components/layout/top-nav";
import { FriendSearch } from "@/components/social/friend-search";
import { createClient } from "@/lib/supabase/server";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata = getPrivatePageMetadata("Recherche des ami·es", "/amis");

/**
 * « Recherche des ami·es », accessible depuis mon profil.
 *
 * ⚠️ Contrairement à `/profil*`, cette route **n'est pas** couverte par la
 * redirection de `src/proxy.ts` : la garde y est faite à la main. À reprendre
 * au branchement — soit en élargissant le proxy, soit en gardant la
 * vérification ici, mais pas les deux à moitié.
 */
export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Famis");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pt-8 pb-24 md:px-6">
        <h1 className="font-serif text-[30px] leading-tight text-foreground">
          Recherche des ami·es
        </h1>
        <p className="mt-1.5 mb-6 text-sm text-foreground/60">
          Retrouve quelqu&apos;un et suis ses prochaines sorties.
        </p>
        <FriendSearch />
      </main>
      <AppFooter />
    </div>
  );
}
