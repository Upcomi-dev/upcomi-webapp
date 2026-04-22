import Link from "next/link";
import { AdminEventsClient } from "@/components/admin/admin-events-client";
import { AdminCollectionsClient } from "@/components/admin/admin-collections-client";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { requireAdmin } from "@/lib/auth/assert-admin";
import type { Event } from "@/lib/types/database";
import { makeEventSlug } from "@/lib/utils/slugify";

interface AdminCollection {
  id: string;
  name: string;
  description: string | null;
  order: number;
  is_auto: boolean;
  is_active: boolean;
  auto_type: string | null;
  eventCount: number;
  eventIds: number[];
}

interface AdminEvent {
  id: number;
  name: string;
  date: string | null;
  type: string | null;
  city: string | null;
  verified: boolean;
  featuredOrder: number | null;
}

interface AdminPublicUser {
  uid: string;
  name: string | null;
  surname: string | null;
  updated_at: string;
}

interface AdminAppUser {
  uid: string;
  email: string | null;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  ville: string | null;
  gender: string | null;
  pref1: string[] | null;
  pref2: string | null;
  pref3: string | null;
  premium: boolean;
  subscription_expires_at: string | null;
  product_id: string | null;
  store: string | null;
  cancel_reason: string | null;
  expiration_reason: string | null;
  billing_issue: boolean | null;
  grace_period_expires_at: string | null;
  subscription_paused: boolean | null;
  auto_resume_at: string | null;
  updated_at: string | null;
  revenuecat_id: string | null;
  selection_count: number | null;
  fcm_token: string | null;
  fcm_last_date: string | null;
  created_at: string;
}

export default async function AdminPage() {
  const { supabase, user } = await requireAdmin("/admin");
  const today = new Date().toISOString().split("T")[0];

  const collectionsPromise = supabase
    .from("collections")
    .select("*, collection_events(event_id)")
    .order("order", { ascending: true });
  const allEventsPromise = supabase
    .from("events")
    .select("*")
    .order("dateEvent", { ascending: true });
  const upcomingEventsPromise = supabase
    .from("events")
    .select("id, nomEvent, dateEvent, type_event, villeDepart, verifie, AlaUne")
    .gte("dateEvent", today)
    .order("dateEvent", { ascending: true })
    .limit(8);
  const publicProfilesCountPromise = supabase
    .from("user_public")
    .select("uid", { count: "exact", head: true });
  const recentUsersPromise = supabase
    .from("user_public")
    .select("uid, name, surname, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);
  const allUsersPromise = supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  const organisateursPromise = supabase
    .from("organisateurs")
    .select("nom_orga")
    .not("nom_orga", "is", null)
    .order("nom_orga", { ascending: true });
  const favouritesCountPromise = supabase
    .from("favourite_events")
    .select("id", { count: "exact", head: true });

  const [
    collectionsResult,
    allEventsResult,
    upcomingEventsResult,
    publicProfilesCountResult,
    recentUsersResult,
    allUsersResult,
    organisateursResult,
    favouritesCountResult,
  ] = await Promise.all([
    collectionsPromise,
    allEventsPromise,
    upcomingEventsPromise,
    publicProfilesCountPromise,
    recentUsersPromise,
    allUsersPromise,
    organisateursPromise,
    favouritesCountPromise,
  ]);

  const collections = collectionsResult.data ?? [];
  const allEvents = (allEventsResult.data ?? []) as Event[];
  const upcomingEvents = (upcomingEventsResult.data ?? []) as Array<{
    id: number;
    nomEvent: string | null;
    dateEvent: string | null;
    type_event: string | null;
    villeDepart: string | null;
    verifie: boolean;
    AlaUne: number | null;
  }>;
  const publicProfilesCount = publicProfilesCountResult.count ?? 0;
  const recentUsers = (recentUsersResult.data ?? []) as AdminPublicUser[];
  const allUsers = (allUsersResult.data ?? []) as AdminAppUser[];
  const organisateurs = (organisateursResult.data ?? [])
    .map((row) => row.nom_orga as string | null)
    .filter((value): value is string => Boolean(value));
  const favouritesCount = favouritesCountResult.count ?? 0;

  const collectionsWithCounts: AdminCollection[] = collections.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | null,
    order: c.order as number,
    is_auto: c.is_auto as boolean,
    is_active: (c.is_active ?? false) as boolean,
    auto_type: c.auto_type as string | null,
    eventCount: Array.isArray(c.collection_events) ? c.collection_events.length : 0,
    eventIds: Array.isArray(c.collection_events)
      ? (c.collection_events as { event_id: number }[]).map((ce) => ce.event_id)
      : [],
  }));

  const eventsList: AdminEvent[] = allEvents.map((e) => ({
    id: e.id as number,
    name: (e.nomEvent || "Sans nom") as string,
    date: e.dateEvent as string | null,
    type: e.type_event as string | null,
    city: e.villeDepart as string | null,
    verified: Boolean(e.verifie),
    featuredOrder: (e.AlaUne ?? null) as number | null,
  }));

  const activeCollectionsCount = collectionsWithCounts.filter((collection) => collection.is_active).length;
  const verifiedEventsCount = eventsList.filter((event) => event.verified).length;
  const featuredEventsCount = eventsList.filter((event) => event.featuredOrder !== null).length;
  const pendingReviewCount = eventsList.length - verifiedEventsCount;

  return (
    <div className="space-y-10">
      <section className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(250,241,231,0.84))] p-6 shadow-[var(--shadow-md)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
          Vue d&apos;ensemble
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-[32px] text-foreground">Dashboard admin</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-foreground/62">
              Le back-office est désormais réservé aux admins, avec une vue centralisée
              sur les événements, les profils publics et l&apos;édition des collections.
            </p>
          </div>
          <div className="rounded-[22px] border border-coral/15 bg-coral/6 px-4 py-3 text-[13px] text-foreground/66">
            Le back-office permet maintenant de gérer les collections, les événements
            et les comptes utilisateurs depuis la même interface.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Événements"
            value={eventsList.length}
            detail={`${verifiedEventsCount} vérifiés · ${pendingReviewCount} à vérifier`}
          />
          <MetricCard
            label="Collections"
            value={collectionsWithCounts.length}
            detail={`${activeCollectionsCount} actives sur l'app`}
          />
          <MetricCard
            label="Profils publics"
            value={publicProfilesCount}
            detail="Profils visibles par la communauté"
          />
          <MetricCard
            label="Favoris"
            value={favouritesCount}
            detail={`${featuredEventsCount} événements mis à la une`}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[28px] border border-white/60 bg-white/72 p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                Events
              </p>
              <h3 className="mt-1 font-serif text-[24px] text-foreground">
                Prochains événements
              </h3>
            </div>
            <div className="text-right text-[12px] text-foreground/42">
              Lecture seule
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/event/${makeEventSlug(event.id, event.nomEvent)}`}
                  className="flex flex-col gap-3 rounded-[22px] border border-foreground/8 bg-white/70 px-4 py-4 transition-colors hover:border-coral/20 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {event.nomEvent || "Sans nom"}
                      </p>
                      <p className="mt-1 text-[13px] text-foreground/48">
                        {formatAdminDate(event.dateEvent)}
                        {event.villeDepart ? ` · ${event.villeDepart}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill active={event.verifie}>
                        {event.verifie ? "Vérifié" : "À vérifier"}
                      </StatusPill>
                      {event.AlaUne !== null && (
                        <span className="rounded-full bg-coral/12 px-2.5 py-1 text-[11px] font-semibold text-coral">
                          À la une
                        </span>
                      )}
                    </div>
                  </div>
                  {event.type_event && (
                    <p className="text-[12px] uppercase tracking-[0.14em] text-foreground/36">
                      {event.type_event}
                    </p>
                  )}
                </Link>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/50 px-6 py-12 text-center">
                <p className="font-medium text-foreground">Aucun événement à venir</p>
                <p className="mt-1 text-sm text-foreground/45">
                  Les prochains événements apparaîtront ici.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/60 bg-white/72 p-6 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              Users
            </p>
            <h3 className="mt-1 font-serif text-[24px] text-foreground">
              Profils récemment mis à jour
            </h3>

            <div className="mt-5 space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="rounded-[20px] border border-foreground/8 bg-white/68 px-4 py-3"
                  >
                    <p className="text-[14px] font-semibold text-foreground">
                      {formatAdminUserName(user)}
                    </p>
                    <p className="mt-1 text-[12px] text-foreground/45">
                      Mis à jour le {formatAdminDate(user.updated_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/50 px-4 py-6 text-sm text-foreground/45">
                  Aucun profil public accessible pour le moment.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,239,228,0.92))] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              Sécurité
            </p>
            <h3 className="mt-1 font-serif text-[24px] text-foreground">
              Accès verrouillé
            </h3>
            <p className="mt-3 text-[14px] leading-6 text-foreground/62">
              `/admin` est maintenant contrôlé à deux niveaux:
              `proxy.ts` redirige les non-admins hors du back-office, et le layout
              serveur bloque aussi tout rendu côté App Router.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              Gestion éditoriale
            </p>
            <h3 className="mt-1 font-serif text-[26px] text-foreground">Collections</h3>
          </div>
          <p className="max-w-xl text-[14px] leading-6 text-foreground/58">
            Création, activation, réordonnancement et composition des collections
            visibles sur la home.
          </p>
        </div>

        <AdminCollectionsClient collections={collectionsWithCounts} events={eventsList} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              Catalogue
            </p>
            <h3 className="mt-1 font-serif text-[26px] text-foreground">Événements</h3>
          </div>
          <p className="max-w-xl text-[14px] leading-6 text-foreground/58">
            Administrez le catalogue complet des événements et leurs métadonnées.
          </p>
        </div>

        <AdminEventsClient events={allEvents} organisateurs={organisateurs} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              Comptes
            </p>
            <h3 className="mt-1 font-serif text-[26px] text-foreground">Utilisateurs</h3>
          </div>
          <p className="max-w-xl text-[14px] leading-6 text-foreground/58">
            Gérez les comptes applicatifs, leurs abonnements et leurs préférences.
          </p>
        </div>

        <AdminUsersClient users={allUsers} currentAdminId={user.id} />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-[var(--shadow-sm)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/36">
        {label}
      </p>
      <p className="mt-3 font-serif text-[34px] leading-none text-foreground">{value}</p>
      <p className="mt-2 text-[13px] leading-5 text-foreground/52">{detail}</p>
    </div>
  );
}

function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {children}
    </span>
  );
}

function formatAdminDate(value: string | null) {
  if (!value) return "Date non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatAdminUserName(user: AdminPublicUser) {
  const name = [user.name, user.surname].filter(Boolean).join(" ").trim();
  return name || "Profil sans nom";
}
