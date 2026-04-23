import Link from "next/link";
import { AdminEventsClient } from "@/components/admin/admin-events-client";
import { AdminCollectionsClient } from "@/components/admin/admin-collections-client";
import { AdminFeedbackClient } from "@/components/admin/admin-feedback-client";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { requireAdmin } from "@/lib/auth/assert-admin";
import type { Event, FeedbackEntry } from "@/lib/types/database";
import { makeEventSlug } from "@/lib/utils/slugify";

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
    id: "feedback",
    label: "Retours",
    eyebrow: "Produit",
    title: "Retours utilisateurs",
    description: "Consultez les idées, bugs et feedbacks remontés directement depuis l'app.",
  },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const activeTab = parseAdminTab(params.tab);
  const activeTabMeta = ADMIN_TABS.find((tab) => tab.id === activeTab) ?? ADMIN_TABS[0];

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
  const feedbackEntriesPromise = supabase
    .from("feedback_entries")
    .select("*")
    .order("created_at", { ascending: false });

  const [
    collectionsResult,
    allEventsResult,
    upcomingEventsResult,
    publicProfilesCountResult,
    recentUsersResult,
    allUsersResult,
    organisateursResult,
    favouritesCountResult,
    feedbackEntriesResult,
  ] = await Promise.all([
    collectionsPromise,
    allEventsPromise,
    upcomingEventsPromise,
    publicProfilesCountPromise,
    recentUsersPromise,
    allUsersPromise,
    organisateursPromise,
    favouritesCountPromise,
    feedbackEntriesPromise,
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
  const feedbackEntries = (feedbackEntriesResult.data ?? []) as FeedbackEntry[];

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
  const automaticCollectionsCount = collectionsWithCounts.filter((collection) => collection.is_auto).length;
  const verifiedEventsCount = eventsList.filter((event) => event.verified).length;
  const featuredEventsCount = eventsList.filter((event) => event.featuredOrder !== null).length;
  const pendingReviewCount = eventsList.length - verifiedEventsCount;
  const premiumUsersCount = allUsers.filter((userRecord) => userRecord.premium).length;
  const newFeedbackCount = feedbackEntries.filter((entry) => entry.status === "new").length;
  const reviewingFeedbackCount = feedbackEntries.filter((entry) => entry.status === "reviewing").length;
  const closedFeedbackCount = feedbackEntries.filter((entry) => entry.status === "closed").length;

  const tabCounts: Record<AdminTabId, number> = {
    overview: eventsList.length + collectionsWithCounts.length + allUsers.length + feedbackEntries.length,
    collections: collectionsWithCounts.length,
    events: eventsList.length,
    users: allUsers.length,
    feedback: feedbackEntries.length,
  };

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
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isActive
                        ? "bg-coral text-white"
                        : "bg-foreground/6 text-foreground/52"
                    }`}
                  >
                    {tabCounts[tab.id]}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-5 opacity-75">{tab.description}</p>
              </Link>
            );
          })}
        </nav>
      </section>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Événements"
              value={eventsList.length}
              detail={`${verifiedEventsCount} vérifiés · ${pendingReviewCount} à vérifier`}
            />
            <MetricCard
              label="Collections"
              value={collectionsWithCounts.length}
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
              value={feedbackEntries.length}
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
                  <div className="text-right text-[12px] text-foreground/42">
                    Navigation par onglets
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <QuickAccessCard
                    href="/admin?tab=collections"
                    label="Collections"
                    value={`${activeCollectionsCount}/${collectionsWithCounts.length}`}
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
                    className="text-[12px] font-semibold text-coral transition-colors hover:text-coral-dark"
                  >
                    Ouvrir le catalogue
                  </Link>
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
                    className="text-[12px] font-semibold text-coral transition-colors hover:text-coral-dark"
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
                        <p className="mt-1 text-[12px] text-foreground/45">
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
      )}

      {activeTab === "collections" && (
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
      )}

      {activeTab === "events" && (
        <AdminSectionShell
          eyebrow="Catalogue"
          title="Événements"
          description="Concentrez-vous sur le catalogue complet, la modération et l'édition des fiches."
          stats={[
            { label: "Total", value: eventsList.length.toString() },
            { label: "Vérifiés", value: verifiedEventsCount.toString() },
            { label: "À vérifier", value: pendingReviewCount.toString() },
          ]}
        >
          <AdminEventsClient events={allEvents} organisateurs={organisateurs} />
        </AdminSectionShell>
      )}

      {activeTab === "users" && (
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
          <AdminUsersClient users={allUsers} currentAdminId={user.id} />
        </AdminSectionShell>
      )}

      {activeTab === "feedback" && (
        <AdminSectionShell
          eyebrow="Produit"
          title="Retours utilisateurs"
          description="Traitez les bugs, idées et feedbacks collectés depuis l'interface publique dans un espace dédié."
          stats={[
            { label: "Total", value: feedbackEntries.length.toString() },
            { label: "Nouveaux", value: newFeedbackCount.toString() },
            { label: "En cours", value: reviewingFeedbackCount.toString() },
            { label: "Clôturés", value: closedFeedbackCount.toString() },
          ]}
        >
          <AdminFeedbackClient entries={feedbackEntries} />
        </AdminSectionShell>
      )}
    </div>
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
        <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-semibold text-coral">
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

function parseAdminTab(value: string | string[] | undefined): AdminTabId {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === "collections" ||
    normalized === "events" ||
    normalized === "users" ||
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
