import { CalendarDays, Compass, Heart, User } from "lucide-react";

/**
 * Les entrées de navigation, définies une fois pour les trois surfaces qui les
 * affichent : l'en-tête desktop, la barre du bas en mobile, et le menu latéral.
 *
 * Quatre espaces, tous au même niveau : **Évènements** (l'accueil),
 * **Calendrier des inscriptions**, **Mes évènements**, **Mon profil**. Il n'y a
 * pas de hiérarchie entre eux — ce sont quatre endroits où l'on va, pas un
 * principal et trois secondaires.
 *
 * « Proposer un évènement » et le feedback n'en font délibérément **pas**
 * partie : ce sont des actions, pas des espaces où l'on navigue. Elles restent
 * dans les actions de l'en-tête.
 *
 * `short` est le libellé de la barre du bas, où « Calendrier des inscriptions »
 * ne tient pas sur une ligne.
 */
export interface MainNavItem {
  href: string;
  label: string;
  short: string;
  icon: typeof Compass;
  /** Le compteur de favoris se pose sur cette entrée-là. */
  badge?: "favorites";
  /** Entrée réservée aux comptes connectés. */
  authOnly?: boolean;
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { href: "/", label: "Évènements", short: "Évènements", icon: Compass },
  {
    // ⚠️ MAQUETTE — cette route n'existe pas encore dans `preprod` : elle
    // arrive avec `feat/calendrier-inscriptions` (§6), écrite et jamais
    // fusionnée. Tant que cette branche n'est pas mergée, l'entrée mène à
    // une 404.
    href: "/calendrier-des-inscriptions",
    label: "Calendrier des inscriptions",
    short: "Calendrier",
    icon: CalendarDays,
  },
  {
    href: "/favorites",
    label: "Mes évènements",
    short: "Mes évènements",
    icon: Heart,
    badge: "favorites",
  },
  {
    href: "/profil",
    label: "Mon profil",
    short: "Profil",
    icon: User,
    authOnly: true,
  },
];

/**
 * L'accueil ne doit s'allumer que sur l'accueil : `startsWith("/")` allumerait
 * toutes les pages du site.
 */
export function isNavItemActive(item: MainNavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
