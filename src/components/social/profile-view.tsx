"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MoreVertical, Flag, Search } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { FollowButton } from "@/components/social/follow-button";
import { PeopleSheet, type PeopleSheetRow } from "@/components/social/people-sheet";
import { useFollow } from "@/components/social/follow-context";
import { useProfileSettings } from "@/components/social/profile-settings-context";
import { cn } from "@/lib/utils";
import {
  getMockProfileLists,
  getPersonFollowers,
  getPersonFollowing,
  getPersonFullName,
  MOCK_PEOPLE,
  type MockPerson,
  type MockProfileEvent,
} from "@/lib/social/mock-social";

/**
 * La page profil, dans ses deux usages : le mien et celui de quelqu'un
 * d'autre. Un seul composant, parce que c'est un seul écran — ce qui change
 * est le geste offert en haut (modifier vs suivre) et deux notes qui
 * n'existent que sur le mien.
 *
 * Quatre listes, dans cet ordre : ce qui intéresse la personne, ce qu'elle
 * recommande, ses inscriptions à venir, ses évènements terminés. L'ordre vient
 * du prototype et il n'est pas neutre : on arrive sur un profil pour savoir où
 * cette personne va, pas pour lire son historique.
 *
 * MAQUETTE : voir `lib/social/mock-social` pour ce qui manque en base — dont
 * deux sections qui ne sont pas branchables en l'état (« Ses inscriptions à
 * venir » attend l'inscription publique, « Recommandé » attend
 * `feat/partage-experience`).
 */
export function ProfileView({
  person,
  ownerName,
  ownerCity,
  ownerPractice,
  onEdit,
}: {
  /** `null` = mon propre profil. */
  person: MockPerson | null;
  /** Mon nom, réel, lu en base par la page. Ignoré sur le profil d'autrui. */
  ownerName?: string;
  ownerCity?: string | null;
  ownerPractice?: string | null;
  onEdit?: () => void;
}) {
  const { followerIds, followingIds, isFollowing } = useFollow();
  const { isPrivate: ownIsPrivate, setIsPrivate: setOwnIsPrivate } = useProfileSettings();
  const [openSheet, setOpenSheet] = useState<"followers" | "following" | null>(null);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);

  const isOwn = person === null;
  const name = isOwn ? ownerName || "Mon profil" : getPersonFullName(person);
  const city = isOwn ? ownerCity : person.city;
  const practice = isOwn ? ownerPractice : person.practice;

  // Sur mon profil, les deux listes viennent de l'état courant du contexte :
  // accepter une demande depuis la cloche doit se voir tout de suite dans le
  // compteur d'abonné·es.
  const followers = isOwn
    ? followerIds.map(findPerson).filter(isPerson)
    : getPersonFollowers(person.id);
  const following = isOwn
    ? followingIds.map(findPerson).filter(isPerson)
    : getPersonFollowing(person.id);

  const lists = getMockProfileLists(isOwn ? null : person.id);

  // Un profil privé consulté par quelqu'un d'autre garde ses chiffres visibles
  // mais ne les ouvre pas. Je peux toujours ouvrir mes propres listes, même en
  // profil privé.
  const statsLocked = !isOwn && person.isPrivate && !isFollowing(person.id);

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pt-8 pb-24 md:px-6">
      <div className="mb-2 flex min-h-[32px] items-start justify-end">
        {isOwn ? (
          <button type="button" onClick={onEdit} className="btn-secondary btn-small">
            Modifier
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setReportMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={reportMenuOpen}
              aria-label="Plus d'options"
              className="soft-ring flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <MoreVertical className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
            {reportMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-20 w-[220px] overflow-hidden rounded-[16px] border border-white/55 bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setReported(true);
                    setReportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[13px] text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  Signaler ce profil
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <h1 className="font-serif text-[30px] leading-tight text-foreground">{name}</h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-foreground/60">
        <span>{[city, practice].filter(Boolean).join(" · ")}</span>
        {!isOwn && person.stravaUrl && (
          <a
            href={person.stravaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tertiary btn-small"
          >
            Strava
            <ExternalLink className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-5 text-sm text-foreground/70">
        <Stat
          count={followers.length}
          label="abonné·es"
          locked={statsLocked}
          onClick={() => setOpenSheet("followers")}
        />
        <Stat
          count={following.length}
          label="abonnements"
          locked={statsLocked}
          onClick={() => setOpenSheet("following")}
        />
      </div>

      {isOwn ? (
        <Link
          href="/amis"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-coral no-underline transition-colors hover:text-coral-dark"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Recherche des ami·es
        </Link>
      ) : (
        <div className="mt-4">
          <FollowButton
            personId={person.id}
            personName={name}
            isPrivate={person.isPrivate}
            variant="page"
          />
          {/* Sur un profil privé, l'invitation à suivre est déjà portée par
              le bloc qui remplace les listes : la répéter ici la dirait deux
              fois à trois lignes d'écart. */}
          {!isFollowing(person.id) && !statsLocked && (
            <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-foreground/55">
              {`Suis ${name} pour retrouver facilement les évènements qui l'intéressent.`}
            </p>
          )}
        </div>
      )}

      {reported && (
        <p className="mt-4 rounded-[16px] border border-orange/25 bg-orange/10 px-4 py-3 text-[13px] text-orange-dark">
          Profil signalé. Notre équipe va l&apos;examiner.
        </p>
      )}

      {statsLocked ? (
        <p className="mt-12 rounded-[var(--radius)] border border-white/55 bg-white/55 px-5 py-8 text-center text-sm text-foreground/60">
          {`Ce profil est privé. Suis ${name} pour voir les évènements qui l'intéressent.`}
        </p>
      ) : (
        <div className="mt-12 space-y-9">
          <EventSection
            title="Intéressé·e"
            note={
              isOwn &&
              (ownIsPrivate ? (
                <p className="max-w-[70ch] text-[13px] leading-relaxed text-foreground/55">
                  Ton profil est privé : seules les personnes que tu choisis
                  peuvent le voir. Tu peux{" "}
                  <button
                    type="button"
                    onClick={() => setOwnIsPrivate(false)}
                    className="btn-tertiary btn-small align-baseline"
                  >
                    le rendre à nouveau public
                  </button>{" "}
                  à tout moment.
                </p>
              ) : (
                <p className="max-w-[70ch] text-[13px] leading-relaxed text-foreground/55">
                  Les évènements qui t&apos;intéressent sont visibles par les autres
                  membres de la communauté Upcomi. Si tu le souhaites, tu peux{" "}
                  <button
                    type="button"
                    onClick={onEdit}
                    className="btn-tertiary btn-small align-baseline"
                  >
                    rendre ton profil privé
                  </button>{" "}
                  afin que seules les personnes que tu choisis puissent le voir.
                </p>
              ))
            }
            events={lists.interested}
            empty="Aucun évènement intéressé pour le moment."
          />

          {/* « Recommandé » ne s'affiche que s'il y a quelque chose : une
              section vide y raconterait que la personne ne recommande rien,
              alors qu'elle n'a simplement encore rien raconté. */}
          {lists.recommended.length > 0 && (
            <EventSection title="Recommandé" events={lists.recommended} empty="" />
          )}

          <EventSection
            title={isOwn ? "Mes inscriptions à venir" : "Ses inscriptions à venir"}
            events={lists.upcoming}
            empty="Aucune inscription en cours."
          />

          <EventSection
            title={isOwn ? "Mes évènements terminés" : "Ses évènements terminés"}
            events={lists.past}
            empty="Aucun évènement terminé pour le moment."
          />
        </div>
      )}

      <PeopleSheet
        open={openSheet === "followers"}
        onOpenChange={(open) => setOpenSheet(open ? "followers" : null)}
        title={`${followers.length} abonné·es de ${name}`}
        people={followers.map(toPeopleSheetRow)}
      />
      <PeopleSheet
        open={openSheet === "following"}
        onOpenChange={(open) => setOpenSheet(open ? "following" : null)}
        title={`${following.length} abonnements de ${name}`}
        people={following.map(toPeopleSheetRow)}
      />
    </div>
  );
}

function Stat({
  count,
  label,
  locked,
  onClick,
}: {
  count: number;
  label: string;
  locked: boolean;
  onClick: () => void;
}) {
  if (locked) {
    return (
      <span>
        <strong className="font-semibold text-foreground">{count}</strong> {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="soft-ring rounded-full transition-colors hover:text-foreground"
    >
      <strong className="font-semibold text-foreground">{count}</strong> {label}
    </button>
  );
}

function EventSection({
  title,
  note,
  events,
  empty,
}: {
  title: string;
  /** Affichée entre le titre et les évènements, avant tout le reste de la section. */
  note?: React.ReactNode;
  events: MockProfileEvent[];
  empty: string;
}) {
  return (
    <section>
      <h2 className={cn("font-serif text-[22px] leading-tight text-foreground", !note && "mb-4")}>
        {title}
      </h2>
      {note && <div className="mb-4 mt-2">{note}</div>}
      {events.length === 0 ? (
        <p className="text-sm text-foreground/55">{empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              slug={event.slug}
              nomEvent={event.nomEvent}
              dateEvent={event.dateEvent}
              dateFin={event.dateFin}
              image={event.image}
              bike_type={event.bike_type}
              type_event={event.type_event}
              villeDepart={event.villeDepart}
              paysDepart={event.paysDepart}
              distance={event.distance}
              maxElevation={event.maxElevation}
              mint={event.mint}
              variant="list"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function toPeopleSheetRow(person: MockPerson): PeopleSheetRow {
  return {
    id: person.id,
    name: getPersonFullName(person),
    subtitle: [person.city, person.practice].filter(Boolean).join(" · ") || null,
    isPrivate: person.isPrivate,
  };
}

function findPerson(id: string) {
  return MOCK_PEOPLE.find((person) => person.id === id) ?? null;
}

function isPerson(person: MockPerson | null): person is MockPerson {
  return person !== null;
}
