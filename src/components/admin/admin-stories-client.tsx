"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { updateEventStoryStatus } from "@/app/admin/actions";
import {
  EVENT_STORY_STATUS_OPTIONS,
  getEventStoryStatusLabel,
} from "@/lib/stories-moderation";
import type { EventStoryStatus } from "@/lib/types/database";

export interface AdminStory {
  userId: string;
  eventId: number;
  eventName: string;
  eventSlug: string | null;
  authorName: string;
  authorEmail: string | null;
  story: string | null;
  storyUrl: string | null;
  status: EventStoryStatus;
  createdAt: string;
  reviewedAt: string | null;
}

interface AdminStoriesClientProps {
  stories: AdminStory[];
}

const inputClassName =
  "w-full rounded-xl border border-foreground/10 bg-white/85 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";

/**
 * La file de modération des récits.
 *
 * Elle s'ouvre sur « En attente » et non sur « Tous » : c'est la seule vue qui
 * demande une action, et les récits déjà traités ne feraient que la rallonger.
 */
export function AdminStoriesClient({ stories }: AdminStoriesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStoryStatus | "all">("pending");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const counts = useMemo(
    () => ({
      all: stories.length,
      pending: stories.filter((story) => story.status === "pending").length,
      approved: stories.filter((story) => story.status === "approved").length,
      rejected: stories.filter((story) => story.status === "rejected").length,
    }),
    [stories]
  );

  const filteredStories = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return stories.filter((story) => {
      if (statusFilter !== "all" && story.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      return [story.eventName, story.authorName, story.authorEmail, story.story, story.storyUrl]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [deferredSearchQuery, statusFilter, stories]);

  const handleStatusChange = (story: AdminStory, status: EventStoryStatus) => {
    startTransition(() => updateEventStoryStatus(story.userId, story.eventId, status));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-[28px] text-foreground">Récits d&apos;expérience</h2>
          <p className="mt-1 text-[14px] text-foreground/56">
            Un récit reste invisible sur la fiche de l&apos;évènement tant qu&apos;il n&apos;est
            pas publié ici.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Chercher un évènement, une autrice, un extrait..."
            className={`${inputClassName} min-w-[280px]`}
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as EventStoryStatus | "all")
            }
            className={`${inputClassName} min-w-[180px]`}
          >
            <option value="pending">En attente ({counts.pending})</option>
            <option value="approved">Publiés ({counts.approved})</option>
            <option value="rejected">Refusés ({counts.rejected})</option>
            <option value="all">Tous les récits ({counts.all})</option>
          </select>
        </div>
      </div>

      {isPending ? (
        <div className="text-[13px] text-foreground/50">Mise à jour des récits...</div>
      ) : null}

      <div className="grid gap-4">
        {filteredStories.map((story) => (
          <article
            key={`${story.userId}-${story.eventId}`}
            className="overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={statusBadgeClassName(story.status)}>
                    {getEventStoryStatusLabel(story.status)}
                  </span>
                  {story.eventSlug ? (
                    <Link
                      href={`/event/${story.eventSlug}`}
                      className="rounded-full bg-coral/10 px-2.5 py-1 text-[13px] font-semibold text-coral transition-colors hover:text-coral-dark"
                    >
                      {story.eventName}
                    </Link>
                  ) : (
                    <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[13px] font-semibold text-coral">
                      {story.eventName}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 font-serif text-[22px] text-foreground">
                  {story.authorName}
                </h3>

                {story.story ? (
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-foreground/66">
                    {story.story}
                  </p>
                ) : (
                  <p className="mt-2 text-[14px] italic leading-6 text-foreground/40">
                    Pas de texte — seulement un lien.
                  </p>
                )}

                {/* Le lien part vers un site tiers et fait partie de ce qu'on
                    relit : il s'ouvre à part, jamais dans l'admin. */}
                {story.storyUrl ? (
                  <a
                    href={story.storyUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-3 inline-block max-w-full truncate text-[13px] font-medium text-coral transition-colors hover:text-coral-dark"
                  >
                    {story.storyUrl}
                  </a>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-foreground/46">
                  {story.authorEmail ? <span>Email: {story.authorEmail}</span> : null}
                  <span>Écrit le {formatDateTime(story.createdAt)}</span>
                  {story.reviewedAt ? (
                    <span>Relu le {formatDateTime(story.reviewedAt)}</span>
                  ) : null}
                </div>
              </div>

              <div className="w-full rounded-[20px] border border-foreground/8 bg-white/82 p-4 lg:w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                  Modération
                </p>
                <select
                  value={story.status}
                  onChange={(event) =>
                    handleStatusChange(story, event.target.value as EventStoryStatus)
                  }
                  disabled={isPending}
                  className={`${inputClassName} mt-3`}
                >
                  {EVENT_STORY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredStories.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Aucun récit trouvé</p>
          <p className="mt-1 text-[13px] text-foreground/45">
            {statusFilter === "pending"
              ? "Rien à relire pour le moment."
              : "Ajuste la recherche ou le filtre de statut."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function statusBadgeClassName(status: EventStoryStatus) {
  if (status === "pending") {
    return "rounded-full bg-amber-100 px-2.5 py-1 text-[13px] font-semibold text-amber-700";
  }

  if (status === "approved") {
    return "rounded-full bg-green-100 px-2.5 py-1 text-[13px] font-semibold text-green-700";
  }

  return "rounded-full bg-red-100 px-2.5 py-1 text-[13px] font-semibold text-red-700";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
