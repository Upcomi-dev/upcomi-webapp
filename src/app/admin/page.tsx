import Link from "next/link";
import { Suspense } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { AdminEventsClient } from "@/components/admin/admin-events-client";
import { AdminCollectionsClient } from "@/components/admin/admin-collections-client";
import { AdminFeedbackClient } from "@/components/admin/admin-feedback-client";
import { AdminStoriesClient, type AdminStory } from "@/components/admin/admin-stories-client";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { AdminProposalsClient, type AdminProposal } from "@/components/admin/admin-proposals-client";
import { AdminProposalFeatureToggle } from "@/components/admin/admin-proposal-feature-toggle";
import { EVENT_PROPOSALS_FEATURE_KEY } from "@/lib/features";
import { requireAdmin } from "@/lib/auth/assert-admin";
import { parseSupabasePublicStorageUrl } from "@/lib/storage/urls";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import type {
  Event,
  EventSubmissionContact,
  FeedbackEntry,
  SousEvent,
  UserEventStory,
} from "@/lib/types/database";
import { makeLegacyEventSlug } from "@/lib/utils/slugify";

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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
  events: AdminCollectionEvent[];
}

interface AdminCollectionEvent {
  id: number;
  name: string;
  date: string | null;
  type: string | null;
  city: string | null;
  favouriteCount: number;
}

interface AdminEvent {
  id: number;
  name: string;
  date: string | null;
  type: string | null;
  city: string | null;
  verified: boolean;
  featuredOrder: number | null;
  favouriteCount: number;
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

const ADMIN_TABS = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    eyebrow: "Pilotage",
    title: "Dashboard admin",
    description: "Repérez l'essentiel, puis basculez rapidement vers l'espace à gérer.",
  },
  {
    id: "collections",
    label: "Collections",
    eyebrow: "Gestion éditoriale",
    title: "Collections",
    description: "Créez, activez et réorganisez les collections visibles dans l'app.",
  },
  {
    id: "proposals",
    label: "Propositions",
    eyebrow: "Modération",
    title: "Propositions d’événements",
    description: "Relisez, corrigez et validez les événements proposés par les organisateurs.",
  },
  {
    id: "events",
    label: "Événements",
    eyebrow: "Catalogue",
    title: "Événements",
    description: "Administrez le catalogue complet des événements et leurs métadonnées.",
  },
  {
    id: "users",
    label: "Utilisateurs",
    eyebrow: "Comptes",
    title: "Utilisateurs",
    description: "Gérez les comptes, les abonnements et les préférences applicatives.",
  },
  {
    id: "stories",
    label: "Récits",
    eyebrow: "Modération",
    title: "Récits d'expérience",
    description:
      "Relisez les récits écrits par la communauté avant qu'ils n'apparaissent sur les fiches.",
  },
  {
    id: "feedback",
    label: "Retours",
    eyebrow: "Produit",
    title: "Retours utilisateurs",
    description: "Consultez les idées, bugs et feedbacks remontés directement depuis l'app.",
  },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

const POPULAR_COLLECTION_LIMIT = 10;

type AdminSupabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Chaque onglet ne charge que ses propres données : avant, chaque clic d'onglet
// relisait tout le back-office (tous les événements, tous les comptes, une URL
// signée par proposition…). Le bandeau d'onglets s'affiche tout de suite, le
// contenu arrive en streaming derrière un Suspense.
export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const activeTab = parseAdminTab(params.tab);
  const activeTabMeta = ADMIN_TABS.find((tab) => tab.id === activeTab) ?? ADMIN_TABS[0];

  const { supabase, user } = await requireAdmin("/admin");
  const tabCountsPromise = loadTabCounts(supabase);

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(250,241,231,0.84))] p-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
              {activeTabMeta.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-[32px] text-foreground">{activeTabMeta.title}</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-foreground/62">
              {activeTabMeta.description}
            </p>
          </div>
          <div className="rounded-[22px] border border-coral/15 bg-coral/6 px-4 py-3 text-[13px] text-foreground/66">
            `/admin` est désormais découpé en espaces clairs pour limiter le bruit
            visuel et accélérer la gestion.
          </div>
        </div>

        <nav
          aria-label="Sections d'administration"
          className="mt-6 flex flex-wrap gap-3"
        >
          {ADMIN_TABS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                href={tab.id === "overview" ? "/admin" : `/admin?tab=${tab.id}`}
                aria-current={isActive ? "page" : undefined}
                className={`min-w-[180px] flex-1 rounded-[22px] border px-4 py-3 transition-colors sm:min-w-[220px] ${
                  isActive
                    ? "border-coral/25 bg-coral/10 text-foreground"
                    : "border-white/70 bg-white/60 text-foreground/72 hover:border-coral/18 hover:bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{tab.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${
                      isActive
                        ? "bg-coral text-white"
                        : "bg-foreground/6 text-foreground/52"
                    }`}
                  >
                    <Suspense fallback="…">
                      <TabCount countsPromise={tabCountsPromise} tab={tab.id} />
                    </Suspense>
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-5 opacity-75">{tab.description}</p>
              </Link>
            );
          })}
        </nav>
      </section>

      <Suspense key={activeTab} fallback={<TabLoading />}>
        {activeTab === "overview" && <OverviewTab supabase={supabase} />}
        {activeTab === "collections" && <CollectionsTab supabase={supabase} />}
        {activeTab === "proposals" && <ProposalsTab supabase={supabase} />}
        {activeTab === "events" && <EventsTab supabase={supabase} />}
        {activeTab === "users" && <UsersTab supabase={supabase} currentAdminId={user.id} />}
        {activeTab === "stories" && <StoriesTab supabase={supabase} />}
        {activeTab === "feedback" && <FeedbackTab supabase={supabase} />}
      </Suspense>
    </div>
  );
}

async function TabCount({
  countsPromise,
  tab,
}: {
  countsPromise: Promise<Record<AdminTabId, number>>;
  tab: AdminTabId;
}) {
  const counts = await countsPromise;
  return counts[tab];
}

function TabLoading() {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/70 px-6 py-16 text-center text-[14px] text-foreground/45 shadow-[var(--shadow-sm)]">
      Chargement…
    </div>
  );
}

// Compte des lignes sans les rapatrier (`head: true`).
function countRows(query: PromiseLike<{ count: number | null }>) {
  return Promise.resolve(query).then((result) => result.count ?? 0);
}

async function loadTabCounts(supabase: AdminSupabase): Promise<Record<AdminTabId, number>> {
  const head = { count: "exact", head: true } as const;
  const [events, collections, users, feedback, proposals, stories] = await Promise.all([
    countRows(supabase.from("events").select("id", head)),
    countRows(supabase.from("collections").select("id", head)),
    countRows(supabase.from("users").select("uid", head)),
    countRows(supabase.from("feedback_entries").select("id", head)),
    countRows(
      supabase.from("event_submission_contacts").select("event_id", head).eq("review_status", "pending")
    ),
    countRows(supabase.from("user_event_stories").select("event_id", head).eq("status", "pending")),
  ]);

  return {
    overview: events + collections + users + feedback,
    collections,
    proposals,
    events,
    users,
    stories,
    feedback,
  };
}

/**
 * Lecture par lots d'identifiants (`.in()`), pour ne pas faire exploser
 * l'URL PostgREST, chaque lot étant lui-même paginé.
 */
async function fetchByIds<T, Id>(
  ids: Id[],
  page: (chunk: Id[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const chunks: Id[][] = [];
  for (let index = 0; index < ids.length; index += 200) chunks.push(ids.slice(index, index + 200));
  const results = await Promise.all(
    chunks.map((chunk) => fetchAllRows<T>((from, to) => page(chunk, from, to)))
  );
  return results.flatMap((result) => result.data ?? []);
}

function fetchOrganisateurs(supabase: AdminSupabase) {
  return fetchAllRows((from, to) =>
    supabase
      .from("organisateurs")
      .select("nom_orga")
      .not("nom_orga", "is", null)
      .order("nom_orga", { ascending: true })
      .range(from, to)
  ).then((result) =>
    (result.data ?? [])
      .map((row) => row.nom_orga as string | null)
      .filter((value): value is string => Boolean(value))
  );
}

function fetchSubmissionContacts(supabase: AdminSupabase) {
  return fetchAllRows((from, to) =>
    supabase
      .from("event_submission_contacts")
      .select("*")
      .order("submitted_at", { ascending: false })
      .order("event_id", { ascending: true })
      .range(from, to)
  ).then((result) => (result.data ?? []) as EventSubmissionContact[]);
}

async function OverviewTab({ supabase }: { supabase: AdminSupabase }) {
  const head = { count: "exact", head: true } as const;
  const today = new Date().toISOString().split("T")[0];

  const [
    eventsCount,
    verifiedEventsCount,
    featuredEventsCount,
    collectionsResult,
    publicProfilesCount,
    favouritesCount,
    feedbackCount,
    newFeedbackCount,
    reviewingFeedbackCount,
    premiumUsersCount,
    pendingStoriesCount,
    upcomingEventsResult,
    recentUsersResult,
  ] = await Promise.all([
    countRows(supabase.from("events").select("id", head)),
    countRows(supabase.from("events").select("id", head).eq("verifie", true)),
    countRows(supabase.from("events").select("id", head).not("AlaUne", "is", null)),
    supabase.from("collections").select("is_active, is_auto"),
    countRows(supabase.from("user_public").select("uid", head)),
    countRows(supabase.from("favourite_events").select("id", head)),
    countRows(supabase.from("feedback_entries").select("id", head)),
    countRows(supabase.from("feedback_entries").select("id", head).eq("status", "new")),
    countRows(supabase.from("feedback_entries").select("id", head).eq("status", "reviewing")),
    countRows(supabase.from("users").select("uid", head).eq("premium", true)),
    countRows(supabase.from("user_event_stories").select("event_id", head).eq("status", "pending")),
    supabase
      .from("events")
      .select("id, slug, nomEvent, dateEvent, type_event, villeDepart, verifie, AlaUne")
      .gte("dateEvent", today)
      .order("dateEvent", { ascending: true })
      .limit(8),
    supabase
      .from("user_public")
      .select("uid, name, surname, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const collections = collectionsResult.data ?? [];
  const collectionsCount = collections.length;
  const activeCollectionsCount = collections.filter((collection) => collection.is_active).length;
  const automaticCollectionsCount = collections.filter((collection) => collection.is_auto).length;
  const pendingReviewCount = eventsCount - verifiedEventsCount;
  const upcomingEvents = (upcomingEventsResult.data ?? []) as Array<{
    id: number;
    slug: string | null;
    nomEvent: string | null;
    dateEvent: string | null;
    type_event: string | null;
    villeDepart: string | null;
    verifie: boolean;
    AlaUne: number | null;
  }>;
  const recentUsers = (recentUsersResult.data ?? []) as AdminPublicUser[];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Événements"
          value={eventsCount}
          detail={`${verifiedEventsCount} vérifiés · ${pendingReviewCount} à vérifier`}
        />
        <MetricCard
          label="Collections"
          value={collectionsCount}
          detail={`${activeCollectionsCount} actives · ${automaticCollectionsCount} automatiques`}
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
        <MetricCard
          label="Retours"
          value={feedbackCount}
          detail={`${newFeedbackCount} nouveaux · ${reviewingFeedbackCount} en cours`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/60 bg-white/72 p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                  Accès rapide
                </p>
                <h3 className="mt-1 font-serif text-[24px] text-foreground">
                  Espaces métier
                </h3>
              </div>
              <div className="text-right text-[13px] text-foreground/42">
                Navigation par onglets
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickAccessCard
                href="/admin?tab=collections"
                label="Collections"
                value={`${activeCollectionsCount}/${collectionsCount}`}
                detail="actives"
                description="Réordonner les sélections éditoriales et gérer leur contenu."
              />
              <QuickAccessCard
                href="/admin?tab=events"
                label="Événements"
                value={`${pendingReviewCount}`}
                detail="à vérifier"
                description="Ouvrir le catalogue complet pour créer, éditer ou supprimer."
              />
              <QuickAccessCard
                href="/admin?tab=users"
                label="Utilisateurs"
                value={`${premiumUsersCount}`}
                detail="premium"
                description="Retrouver les comptes applicatifs et gérer les abonnements."
              />
              <QuickAccessCard
                href="/admin?tab=stories"
                label="Récits"
                value={`${pendingStoriesCount}`}
                detail="à relire"
                description="Relire les récits avant qu'ils n'apparaissent sur les fiches."
              />
              <QuickAccessCard
                href="/admin?tab=feedback"
                label="Retours"
                value={`${newFeedbackCount}`}
                detail="nouveaux"
                description="Traiter les idées, bugs et feedbacks remontés depuis le header."
              />
            </div>
          </div>

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
              <Link
                href="/admin?tab=events"
                className="text-[13px] font-semibold text-coral transition-colors hover:text-coral-dark"
              >
                Ouvrir le catalogue
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/event/${event.slug || makeLegacyEventSlug(event.id, event.nomEvent)}`}
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
                          <span className="rounded-full bg-coral/12 px-2.5 py-1 text-[13px] font-semibold text-coral">
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
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/60 bg-white/72 p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                  Users
                </p>
                <h3 className="mt-1 font-serif text-[24px] text-foreground">
                  Profils récemment mis à jour
                </h3>
              </div>
              <Link
                href="/admin?tab=users"
                className="text-[13px] font-semibold text-coral transition-colors hover:text-coral-dark"
              >
                Ouvrir les comptes
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((recentUser) => (
                  <div
                    key={recentUser.uid}
                    className="rounded-[20px] border border-foreground/8 bg-white/68 px-4 py-3"
                  >
                    <p className="text-[14px] font-semibold text-foreground">
                      {formatAdminUserName(recentUser)}
                    </p>
                    <p className="mt-1 text-[13px] text-foreground/45">
                      Mis à jour le {formatAdminDate(recentUser.updated_at)}
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
            <h3 className="mt-1 font-serif text-[24px] text-foreground">Accès verrouillé</h3>
            <p className="mt-3 text-[14px] leading-6 text-foreground/62">
              `/admin` est contrôlé à deux niveaux: `proxy.ts` redirige les non-admins
              hors du back-office, et le layout serveur bloque aussi tout rendu côté
              App Router.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

async function CollectionsTab({ supabase }: { supabase: AdminSupabase }) {
  const [collectionsResult, eventsResult, popularEventsResult] = await Promise.all([
    supabase
      .from("collections")
      .select("*, collection_events(event_id, order)")
      .order("order", { ascending: true }),
    fetchAllRows((from, to) =>
      supabase
        .from("events")
        .select("id, nomEvent, dateEvent, type_event, villeDepart, verifie, AlaUne")
        .order("dateEvent", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    supabase.rpc("get_popular_events", { p_limit: POPULAR_COLLECTION_LIMIT }),
  ]);

  const collections = collectionsResult.data ?? [];
  const allEvents = (eventsResult.data ?? []) as Event[];
  const eventById = new Map(allEvents.map((event) => [event.id as number, event]));
  const popularRows = normalizePopularRows(popularEventsResult.data);
  const manualCollectionEventIds = collections.flatMap((collection) =>
    Array.isArray(collection.collection_events)
      ? (collection.collection_events as Array<{ event_id: number }>).map((ce) => ce.event_id)
      : []
  );
  const collectionEventIds = [
    ...new Set([...manualCollectionEventIds, ...popularRows.map((row) => row.event_id)]),
  ];
  const favouriteCountsByEventId = new Map<number, number>(
    popularRows.map((row) => [row.event_id, row.fav_count])
  );

  if (collectionEventIds.length > 0) {
    const { data: favouriteCountRows } = await supabase.rpc("get_event_favourite_counts", {
      p_event_ids: collectionEventIds,
    });

    for (const row of normalizeFavouriteCountRows(favouriteCountRows)) {
      favouriteCountsByEventId.set(row.event_id, row.fav_count);
    }
  }

  const collectionsWithCounts: AdminCollection[] = collections.map((c) => {
    const isAuto = c.is_auto as boolean;
    const autoType = c.auto_type as string | null;
    const manualEventIds = Array.isArray(c.collection_events)
      ? [...(c.collection_events as Array<{ event_id: number; order: number | null }>)]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((ce) => ce.event_id)
      : [];
    const eventIds = isAuto && autoType === "popular"
      ? popularRows.map((row) => row.event_id).filter((id) => eventById.has(id))
      : manualEventIds;
    const events = buildAdminCollectionEvents(eventIds, eventById, favouriteCountsByEventId);

    return {
      id: c.id as string,
      name: c.name as string,
      description: c.description as string | null,
      order: c.order as number,
      is_auto: isAuto,
      is_active: (c.is_active ?? false) as boolean,
      auto_type: autoType,
      eventCount: events.length,
      eventIds,
      events,
    };
  });

  const eventsList: AdminEvent[] = allEvents.map((e) => ({
    id: e.id as number,
    name: (e.nomEvent || "Sans nom") as string,
    date: e.dateEvent as string | null,
    type: e.type_event as string | null,
    city: e.villeDepart as string | null,
    verified: Boolean(e.verifie),
    featuredOrder: (e.AlaUne ?? null) as number | null,
    favouriteCount: favouriteCountsByEventId.get(e.id as number) ?? 0,
  }));

  const activeCollectionsCount = collectionsWithCounts.filter((collection) => collection.is_active).length;
  const automaticCollectionsCount = collectionsWithCounts.filter((collection) => collection.is_auto).length;

  return (
    <AdminSectionShell
      eyebrow="Gestion éditoriale"
      title="Collections"
      description="Retrouvez ici toute la gestion des collections sans être noyé par les événements et les comptes."
      stats={[
        { label: "Total", value: collectionsWithCounts.length.toString() },
        { label: "Actives", value: activeCollectionsCount.toString() },
        { label: "Automatiques", value: automaticCollectionsCount.toString() },
      ]}
    >
      <AdminCollectionsClient collections={collectionsWithCounts} events={eventsList} />
    </AdminSectionShell>
  );
}

async function ProposalsTab({ supabase }: { supabase: AdminSupabase }) {
  const adminStorage = createAdminClient();
  const [contacts, organisateurs, eventProposalFeatureResult] = await Promise.all([
    fetchSubmissionContacts(supabase),
    fetchOrganisateurs(supabase),
    adminStorage
      .from("app_features")
      .select("enabled")
      .eq("key", EVENT_PROPOSALS_FEATURE_KEY)
      .maybeSingle(),
  ]);

  const eventIds = [...new Set(contacts.map((contact) => contact.event_id))];
  const [events, routes] = await Promise.all([
    fetchByIds<Event, number>(eventIds, (chunk, from, to) =>
      supabase.from("events").select("*").in("id", chunk).order("id", { ascending: true }).range(from, to)
    ),
    fetchByIds<SousEvent, number>(eventIds, (chunk, from, to) =>
      supabase
        .from("sous_events")
        .select("*")
        .in("event_id", chunk)
        .order("sousEventID", { ascending: true })
        .range(from, to)
    ),
  ]);
  const eventById = new Map(events.map((event) => [event.id as number, event]));
  const imagePreviewUrlByEventId = await signEventImages(adminStorage, events);

  const proposals: AdminProposal[] = contacts
    .filter((contact) => eventById.has(contact.event_id))
    .map((contact) => {
      const event = eventById.get(contact.event_id)!;
      return {
        event,
        contact,
        routes: routes.filter((route) => route.event_id === contact.event_id),
        imagePreviewUrl: imagePreviewUrlByEventId.get(event.id as number) ?? null,
      };
    });

  return (
    <AdminSectionShell
      eyebrow="Modération"
      title="Propositions d’événements"
      description="Modifiez les informations et les parcours avant de décider de leur publication."
      stats={[
        { label: "Total", value: proposals.length.toString() },
        { label: "En attente", value: proposals.filter(({ contact }) => contact.review_status === "pending").length.toString() },
        { label: "Refusées", value: proposals.filter(({ contact }) => contact.review_status === "rejected").length.toString() },
      ]}
    >
      <AdminProposalFeatureToggle enabled={eventProposalFeatureResult.data?.enabled === true} />
      <AdminProposalsClient proposals={proposals} organizers={organisateurs} />
    </AdminSectionShell>
  );
}

// Une requête de signature par bucket (createSignedUrls) au lieu d'une par image.
async function signEventImages(
  adminStorage: ReturnType<typeof createAdminClient>,
  events: Event[]
) {
  const urlByEventId = new Map<number, string | null>();
  const pathsByBucket = new Map<string, Array<{ eventId: number; objectPath: string }>>();

  for (const event of events) {
    const parsedImage = parseSupabasePublicStorageUrl(event.image);
    if (!parsedImage) {
      urlByEventId.set(event.id as number, event.image ?? null);
      continue;
    }
    const entries = pathsByBucket.get(parsedImage.bucket) ?? [];
    entries.push({ eventId: event.id as number, objectPath: parsedImage.objectPath });
    pathsByBucket.set(parsedImage.bucket, entries);
  }

  await Promise.all(
    [...pathsByBucket].map(async ([bucket, entries]) => {
      const { data } = await adminStorage.storage
        .from(bucket)
        .createSignedUrls(entries.map((entry) => entry.objectPath), 3600);
      entries.forEach((entry, index) => {
        urlByEventId.set(entry.eventId, data?.[index]?.signedUrl ?? null);
      });
    })
  );

  return urlByEventId;
}

async function EventsTab({ supabase }: { supabase: AdminSupabase }) {
  const [eventsResult, organisateurs, submissionContacts] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("events")
        .select("*")
        .order("dateEvent", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchOrganisateurs(supabase),
    fetchSubmissionContacts(supabase),
  ]);
  const allEvents = (eventsResult.data ?? []) as Event[];
  const verifiedEventsCount = allEvents.filter((event) => event.verifie).length;

  return (
    <AdminSectionShell
      eyebrow="Catalogue"
      title="Événements"
      description="Concentrez-vous sur le catalogue complet, la modération et l'édition des fiches."
      stats={[
        { label: "Total", value: allEvents.length.toString() },
        { label: "Vérifiés", value: verifiedEventsCount.toString() },
        { label: "À vérifier", value: (allEvents.length - verifiedEventsCount).toString() },
      ]}
    >
      <AdminEventsClient
        events={allEvents}
        organisateurs={organisateurs}
        submissionContacts={submissionContacts}
      />
    </AdminSectionShell>
  );
}

async function UsersTab({
  supabase,
  currentAdminId,
}: {
  supabase: AdminSupabase;
  currentAdminId: string;
}) {
  const [usersResult, publicProfilesCount] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .order("uid", { ascending: true })
        .range(from, to)
    ),
    countRows(supabase.from("user_public").select("uid", { count: "exact", head: true })),
  ]);
  const allUsers = (usersResult.data ?? []) as AdminAppUser[];
  const premiumUsersCount = allUsers.filter((userRecord) => userRecord.premium).length;

  return (
    <AdminSectionShell
      eyebrow="Comptes"
      title="Utilisateurs"
      description="Travaillez sur les comptes et abonnements dans un espace dédié, sans interférer avec le reste du back-office."
      stats={[
        { label: "Comptes", value: allUsers.length.toString() },
        { label: "Premium", value: premiumUsersCount.toString() },
        { label: "Profils publics", value: publicProfilesCount.toString() },
      ]}
    >
      <AdminUsersClient users={allUsers} currentAdminId={currentAdminId} />
    </AdminSectionShell>
  );
}

async function StoriesTab({ supabase }: { supabase: AdminSupabase }) {
  // Les récits se lisent en tant qu'admin : c'est la policy de modération
  // (20260905110000) qui ouvre la table au-delà de sa seule autrice.
  const storiesResult = await fetchAllRows((from, to) =>
    supabase
      .from("user_event_stories")
      .select("*")
      .order("created_at", { ascending: false })
      .order("user_id", { ascending: true })
      .order("event_id", { ascending: true })
      .range(from, to)
  );
  const storyRows = (storiesResult.data ?? []) as UserEventStory[];

  // Le récit ne porte que deux identifiants ; l'évènement et l'autrice sont
  // recomposés ici. `user_event_stories.user_id` pointe sur `auth.users` et
  // non sur `public.users` : PostgREST ne sait pas les embarquer.
  const [events, authors] = await Promise.all([
    fetchByIds<Pick<Event, "id" | "nomEvent" | "slug">, number>(
      [...new Set(storyRows.map((row) => row.event_id))],
      (chunk, from, to) =>
        supabase
          .from("events")
          .select("id, nomEvent, slug")
          .in("id", chunk)
          .order("id", { ascending: true })
          .range(from, to)
    ),
    fetchByIds<Pick<AdminAppUser, "uid" | "name" | "surname" | "email">, string>(
      [...new Set(storyRows.map((row) => row.user_id))],
      (chunk, from, to) =>
        supabase
          .from("users")
          .select("uid, name, surname, email")
          .in("uid", chunk)
          .order("uid", { ascending: true })
          .range(from, to)
    ),
  ]);
  const eventById = new Map(events.map((event) => [event.id as number, event]));
  const userByUid = new Map(authors.map((row) => [row.uid, row]));

  const eventStories: AdminStory[] = storyRows.map((row) => {
    const event = eventById.get(row.event_id);
    const author = userByUid.get(row.user_id);
    const authorName = [author?.name, author?.surname].filter(Boolean).join(" ").trim();

    return {
      userId: row.user_id,
      eventId: row.event_id,
      eventName: (event?.nomEvent as string | null) || `Évènement ${row.event_id}`,
      eventSlug: (event?.slug as string | null) ?? null,
      authorName: authorName || `Membre ${row.user_id.slice(0, 8)}`,
      authorEmail: author?.email ?? null,
      story: row.story,
      storyUrl: row.story_url,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    };
  });
  const countStatus = (status: string) =>
    eventStories.filter((story) => story.status === status).length.toString();

  return (
    <AdminSectionShell
      eyebrow="Modération"
      title="Récits d'expérience"
      description="Un récit reste invisible sur la fiche de son évènement tant qu'il n'est pas publié ici."
      stats={[
        { label: "Total", value: eventStories.length.toString() },
        { label: "En attente", value: countStatus("pending") },
        { label: "Publiés", value: countStatus("approved") },
        { label: "Refusés", value: countStatus("rejected") },
      ]}
    >
      <AdminStoriesClient stories={eventStories} />
    </AdminSectionShell>
  );
}

async function FeedbackTab({ supabase }: { supabase: AdminSupabase }) {
  const feedbackResult = await fetchAllRows((from, to) =>
    supabase
      .from("feedback_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
  );
  const feedbackEntries = (feedbackResult.data ?? []) as FeedbackEntry[];
  const countStatus = (status: string) =>
    feedbackEntries.filter((entry) => entry.status === status).length.toString();

  return (
    <AdminSectionShell
      eyebrow="Produit"
      title="Retours utilisateurs"
      description="Traitez les bugs, idées et feedbacks collectés depuis l'interface publique dans un espace dédié."
      stats={[
        { label: "Total", value: feedbackEntries.length.toString() },
        { label: "Nouveaux", value: countStatus("new") },
        { label: "En cours", value: countStatus("reviewing") },
        { label: "Clôturés", value: countStatus("closed") },
      ]}
    >
      <AdminFeedbackClient entries={feedbackEntries} />
    </AdminSectionShell>
  );
}

function AdminSectionShell({
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
              {eyebrow}
            </p>
            <h3 className="mt-1 font-serif text-[28px] text-foreground">{title}</h3>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-foreground/58">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[112px] rounded-[20px] border border-foreground/8 bg-white/72 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/34">
                  {stat.label}
                </p>
                <p className="mt-2 font-serif text-[24px] leading-none text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

function QuickAccessCard({
  href,
  label,
  value,
  detail,
  description,
}: {
  href: string;
  label: string;
  value: string;
  detail: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-foreground/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,239,228,0.7))] p-5 transition-colors hover:border-coral/18 hover:bg-white"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/36">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="font-serif text-[34px] leading-none text-foreground">{value}</p>
        <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[13px] font-semibold text-coral">
          {detail}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-foreground/54">{description}</p>
    </Link>
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
      className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {children}
    </span>
  );
}

function normalizePopularRows(value: unknown) {
  return normalizeFavouriteCountRows(value)
    .filter((row) => row.fav_count > 0)
    .sort((a, b) => b.fav_count - a.fav_count)
    .slice(0, POPULAR_COLLECTION_LIMIT);
}

function normalizeFavouriteCountRows(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => {
      const record = row as { event_id?: unknown; fav_count?: unknown };
      const eventId = Number(record.event_id);
      const favouriteCount = Number(record.fav_count ?? 0);

      if (!Number.isInteger(eventId) || Number.isNaN(favouriteCount)) {
        return null;
      }

      return { event_id: eventId, fav_count: favouriteCount };
    })
    .filter((row): row is { event_id: number; fav_count: number } => row !== null);
}

function buildAdminCollectionEvents(
  eventIds: number[],
  eventById: Map<number, Event>,
  favouriteCountsByEventId: Map<number, number>
): AdminCollectionEvent[] {
  return eventIds
    .map((eventId) => {
      const event = eventById.get(eventId);
      if (!event) return null;

      return {
        id: eventId,
        name: event.nomEvent || "Sans nom",
        date: event.dateEvent,
        type: event.type_event,
        city: event.villeDepart,
        favouriteCount: favouriteCountsByEventId.get(eventId) ?? 0,
      };
    })
    .filter((event): event is AdminCollectionEvent => event !== null);
}

function parseAdminTab(value: string | string[] | undefined): AdminTabId {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "collections" ||
    normalized === "proposals" ||
    normalized === "events" ||
    normalized === "users" ||
    normalized === "stories" ||
    normalized === "feedback"
  ) {
    return normalized;
  }

  return "overview";
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
