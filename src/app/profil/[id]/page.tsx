import { notFound } from "next/navigation";
import { AppFooter } from "@/components/layout/app-footer";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileView } from "@/components/social/profile-view";
import { getMockPerson, getPersonFullName } from "@/lib/social/mock-social";
import { getPrivatePageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const person = getMockPerson(id);
  return getPrivatePageMetadata(
    person ? getPersonFullName(person) : "Profil",
    `/profil/${id}`
  );
}

/**
 * Le profil de quelqu'un d'autre.
 *
 * Réservé aux comptes connectés : `src/proxy.ts` redirige déjà tout `/profil*`
 * vers la connexion, et c'est le bon comportement — `user_public` n'est
 * lisible que par `authenticated`, et le prototype ferme lui aussi le réseau
 * aux visiteurs (voir la page « Recherche des ami·es »). Aucune modification
 * du proxy n'est nécessaire.
 *
 * MAQUETTE : les profils sont ceux de `lib/social/mock-social`. Un identifiant
 * inconnu renvoie une 404, comme le fera la vraie page.
 */
export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const person = getMockPerson(id);

  if (!person) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <ProfileView person={person} />
      </main>
      <AppFooter />
    </div>
  );
}
