/**
 * Fonctionnalités sociales — MAQUETTE, données en dur.
 *
 * Personnes, abonné·es, abonnements, notifications et listes d'évènements du
 * profil : tout ce fichier est fictif. Rien n'est lu ni écrit en base, et
 * l'état de suivi ne survit pas à un rechargement (voir `follow-context`).
 *
 * ------------------------------------------------------------------
 * À lire avant de brancher pour de vrai
 * ------------------------------------------------------------------
 *
 * Le plan V2 (§2.1) dit que T4 « ne dépend plus d'un socle » : `friendships`
 * existe et est lisible par tout le monde, `user_public` est lisible par les
 * comptes connectés. C'est vrai — mais la maquette rend visible tout ce que le
 * proto suppose **et qui n'existe pas** :
 *
 * 1. **`friendships` n'a qu'une policy de `select`.** Ni `insert` ni `delete` :
 *    « Suivre » et « Ne plus suivre » ne peuvent rien écrire. C'est le même
 *    bloquant que celui de `favourite_events` en §9, sous un autre nom.
 *
 * 2. **Le profil privé n'existe pas.** Le proto a des profils privés, et donc
 *    des **demandes** de suivi à accepter ou refuser (`Store.respondFollowRequest`).
 *    Il faut un drapeau (`user_public.is_private`) et un vrai usage de
 *    `friendships.status` — `pending` / `accepted`.
 *
 * 3. **Les notifications n'existent nulle part** — ni table, ni ligne dans le
 *    plan. Le proto en a un centre complet : badge de non-lus, demandes de
 *    suivi à trancher, nouveaux abonné·es. C'est une brique à soi seule, et
 *    elle manque au découpage.
 *
 * 4. **`user_public` ne porte pas ce que le profil affiche.** Elle a `uid`,
 *    `name`, `surname`, `avatar_url`, `niveau` et `ville` (migration
 *    `20260904160000`). Le proto montre en plus la **pratique** (« Gravel ») et
 *    un lien **Strava**. `public.users` reste fermée aux autres et doit le
 *    rester : tout ce qu'on montre de quelqu'un passe par `user_public`.
 *
 * 5. **« Ses inscriptions à venir » suppose l'inscription publique**, qui
 *    n'existe pas : `favourite_events.participates` est un booléen, pas le
 *    cycle favori → inscrite → inscrite publique. Le plan le note déjà comme
 *    manquant (§2.1, « État de la base »). Sans lui, cette section du profil
 *    n'est pas branchable.
 *
 * 6. **« Recommandé » = les récits**, donc cette section dépend de
 *    `feat/partage-experience`, qui n'est pas encore dans `preprod`.
 *
 * Migration prévisible, additive :
 *
 *   alter table public.user_public add column if not exists is_private boolean not null default false;
 *   alter table public.user_public add column if not exists pratique   text;
 *   alter table public.user_public add column if not exists strava_url text;
 *
 *   create policy "Follow someone"   on public.friendships for insert to authenticated
 *     with check ((select auth.uid()) = follower_id);
 *   create policy "Unfollow someone" on public.friendships for delete to authenticated
 *     using ((select auth.uid()) = follower_id);
 *
 * plus la table de notifications, à concevoir.
 */

export interface MockPerson {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  practice: string;
  stravaUrl: string | null;
  /** Profil privé : ses listes restent fermées, et « Suivre » devient une demande. */
  isPrivate: boolean;
}

export interface MockProfileEvent {
  id: number;
  slug: string;
  nomEvent: string;
  dateEvent: string;
  dateFin: string | null;
  image: string;
  bike_type: string | null;
  type_event: string | null;
  villeDepart: string;
  paysDepart: string;
  distance: string;
  maxElevation: number | null;
  mint: boolean;
}

export type MockNotificationType = "follow_request" | "new_follower";

export interface MockNotification {
  id: string;
  type: MockNotificationType;
  personId: string;
  createdAt: string;
  read: boolean;
}

export const MOCK_PEOPLE: MockPerson[] = [
  {
    id: "camille-dupont",
    firstName: "Camille",
    lastName: "Dupont",
    city: "Lyon",
    practice: "Gravel",
    stravaUrl: "https://www.strava.com/athletes/upcomi",
    isPrivate: false,
  },
  {
    id: "nina-roy",
    firstName: "Nina",
    lastName: "Roy",
    city: "Bordeaux",
    practice: "Bikepacking",
    stravaUrl: null,
    isPrivate: false,
  },
  {
    id: "sacha-bernard",
    firstName: "Sacha",
    lastName: "Bernard",
    city: "Grenoble",
    practice: "Route",
    stravaUrl: null,
    isPrivate: true,
  },
  {
    id: "theo-lefevre",
    firstName: "Théo",
    lastName: "Lefèvre",
    city: "Nantes",
    practice: "Gravel",
    stravaUrl: "https://www.strava.com/athletes/upcomi",
    isPrivate: false,
  },
  {
    id: "louise-marchand",
    firstName: "Louise",
    lastName: "Marchand",
    city: "Toulouse",
    practice: "Ultra",
    stravaUrl: null,
    isPrivate: false,
  },
  {
    id: "yasmine-benali",
    firstName: "Yasmine",
    lastName: "Benali",
    city: "Marseille",
    practice: "Gravel",
    stravaUrl: null,
    isPrivate: false,
  },
  {
    id: "manon-girard",
    firstName: "Manon",
    lastName: "Girard",
    city: "Rennes",
    practice: "Bikepacking",
    stravaUrl: null,
    isPrivate: true,
  },
  {
    id: "elena-costa",
    firstName: "Elena",
    lastName: "Costa",
    city: "Nice",
    practice: "Route",
    stravaUrl: null,
    isPrivate: false,
  },
];

export function getMockPerson(id: string): MockPerson | null {
  return MOCK_PEOPLE.find((person) => person.id === id) ?? null;
}

export function getPersonFullName(person: MockPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function getPersonInitials(person: MockPerson): string {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

/** Qui me suit, moi, au chargement de la maquette. */
export const MOCK_MY_FOLLOWER_IDS = ["nina-roy", "louise-marchand"];

/** Qui je suis, moi, au chargement de la maquette. */
export const MOCK_MY_FOLLOWING_IDS = ["camille-dupont"];

/** Le réseau des autres — sert à remplir les compteurs d'un profil consulté. */
const MOCK_NETWORK: Record<string, { followers: string[]; following: string[] }> = {
  "camille-dupont": {
    followers: ["nina-roy", "theo-lefevre", "yasmine-benali"],
    following: ["louise-marchand", "elena-costa"],
  },
  "nina-roy": {
    followers: ["camille-dupont"],
    following: ["camille-dupont", "theo-lefevre"],
  },
  "sacha-bernard": { followers: ["manon-girard"], following: ["camille-dupont"] },
  "theo-lefevre": {
    followers: ["camille-dupont", "elena-costa"],
    following: ["nina-roy"],
  },
  "louise-marchand": { followers: ["camille-dupont"], following: [] },
  "yasmine-benali": { followers: [], following: ["camille-dupont", "nina-roy"] },
  "manon-girard": { followers: ["sacha-bernard"], following: [] },
  "elena-costa": { followers: ["camille-dupont"], following: ["theo-lefevre"] },
};

export function getPersonFollowers(id: string): MockPerson[] {
  return (MOCK_NETWORK[id]?.followers ?? [])
    .map(getMockPerson)
    .filter((person): person is MockPerson => person !== null);
}

export function getPersonFollowing(id: string): MockPerson[] {
  return (MOCK_NETWORK[id]?.following ?? [])
    .map(getMockPerson)
    .filter((person): person is MockPerson => person !== null);
}

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif-1",
    type: "follow_request",
    personId: "sacha-bernard",
    createdAt: "2026-09-02T14:20:00.000Z",
    read: false,
  },
  {
    id: "notif-2",
    type: "follow_request",
    personId: "manon-girard",
    createdAt: "2026-09-01T08:05:00.000Z",
    read: false,
  },
  {
    id: "notif-3",
    type: "new_follower",
    personId: "nina-roy",
    createdAt: "2026-08-27T09:00:00.000Z",
    read: true,
  },
];

/**
 * Identifiants hors de portée du catalogue réel (900 000+) : une carte de
 * maquette ne doit jamais tomber sur un vrai évènement ni écrire un favori sur
 * un `id` existant. En contrepartie ses liens ne mènent nulle part.
 */
const MOCK_EVENTS: MockProfileEvent[] = [
  {
    id: 900_101,
    slug: "maquette-diagonale-des-cimes",
    nomEvent: "La Diagonale des Cimes",
    dateEvent: "2026-09-13",
    dateFin: "2026-09-20",
    image:
      "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Ultra",
    villeDepart: "Briançon",
    paysDepart: "France",
    distance: "1300 km",
    maxElevation: 19000,
    mint: false,
  },
  {
    id: 900_102,
    slug: "maquette-traversee-du-morvan",
    nomEvent: "La Traversée du Morvan",
    dateEvent: "2026-10-03",
    dateFin: "2026-10-04",
    image:
      "https://images.unsplash.com/photo-1618048558171-8c9edde77055?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Aventure",
    villeDepart: "Autun",
    paysDepart: "France",
    distance: "240 km",
    maxElevation: 3400,
    mint: true,
  },
  {
    id: 900_103,
    slug: "maquette-nuits-des-causses",
    nomEvent: "Les Nuits des Causses",
    dateEvent: "2026-11-07",
    dateFin: "2026-11-08",
    image:
      "https://images.unsplash.com/photo-1673949285591-2cfa0f39e2e8?q=80&w=800&auto=format&fit=crop",
    bike_type: "Bikepacking",
    type_event: "Aventure",
    villeDepart: "Millau",
    paysDepart: "France",
    distance: "320 km",
    maxElevation: 5100,
    mint: false,
  },
  {
    id: 900_104,
    slug: "maquette-sel-et-bitume",
    nomEvent: "Sel & Bitume",
    dateEvent: "2026-05-14",
    dateFin: "2026-05-19",
    image:
      "https://images.unsplash.com/photo-1587241321921-91a834d6d191?q=80&w=800&auto=format&fit=crop",
    bike_type: "Gravel",
    type_event: "Aventure",
    villeDepart: "Arles",
    paysDepart: "France",
    distance: "1000 km",
    maxElevation: 14000,
    mint: false,
  },
  {
    id: 900_105,
    slug: "maquette-cap-vers-le-sud",
    nomEvent: "Cap vers le Sud",
    dateEvent: "2026-04-17",
    dateFin: "2026-04-22",
    image:
      "https://images.unsplash.com/photo-1616350428103-cc6bf12d46f0?q=80&w=800&auto=format&fit=crop",
    bike_type: "Route",
    type_event: "Ultra",
    villeDepart: "Clermont-Ferrand",
    paysDepart: "France",
    distance: "900 km",
    maxElevation: 11500,
    mint: false,
  },
];

/**
 * Les quatre listes d'un profil. La maquette les découpe dans le même petit
 * jeu d'évènements — l'important est de voir les quatre sections peuplées,
 * vides, et ce que ça donne quand l'une l'est et pas l'autre.
 */
export interface MockProfileLists {
  interested: MockProfileEvent[];
  recommended: MockProfileEvent[];
  upcoming: MockProfileEvent[];
  past: MockProfileEvent[];
}

export function getMockProfileLists(personId: string | null): MockProfileLists {
  // Un profil consulté au hasard ne montre pas exactement les mêmes listes que
  // le mien : sans ça, la maquette laisse croire que tout le monde a le même
  // profil, et la section vide — celle qui pose le plus de questions de
  // design — ne se voit jamais.
  if (personId === "louise-marchand") {
    return {
      interested: [MOCK_EVENTS[1]],
      recommended: [],
      upcoming: [],
      past: [MOCK_EVENTS[4]],
    };
  }

  return {
    interested: [MOCK_EVENTS[0], MOCK_EVENTS[1]],
    recommended: [MOCK_EVENTS[3]],
    upcoming: [MOCK_EVENTS[2]],
    past: [MOCK_EVENTS[3], MOCK_EVENTS[4]],
  };
}
