"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { updateFeedbackEntryStatus } from "@/app/admin/actions";
import {
  FEEDBACK_STATUS_OPTIONS,
  getFeedbackKindLabel,
  getFeedbackStatusLabel,
} from "@/lib/feedback";
import type { FeedbackEntry, FeedbackStatus } from "@/lib/types/database";

interface AdminFeedbackClientProps {
  entries: FeedbackEntry[];
}

const inputClassName =
  "w-full rounded-xl border border-foreground/10 bg-white/85 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";

export function AdminFeedbackClient({ entries }: AdminFeedbackClientProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        entry.subject,
        entry.message,
        entry.contact_name,
        entry.contact_email,
        entry.page_path,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [deferredSearchQuery, entries, statusFilter]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      new: entries.filter((entry) => entry.status === "new").length,
      reviewing: entries.filter((entry) => entry.status === "reviewing").length,
      closed: entries.filter((entry) => entry.status === "closed").length,
    }),
    [entries]
  );

  const handleStatusChange = (id: string, status: FeedbackStatus) => {
    startTransition(() => updateFeedbackEntryStatus(id, status));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-[28px] text-foreground">Retours utilisateurs</h2>
          <p className="mt-1 text-[14px] text-foreground/56">
            Centralise les idées, bugs et feedbacks envoyés depuis le header.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Chercher un sujet, un message, un email..."
            className={`${inputClassName} min-w-[280px]`}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | "all")}
            className={`${inputClassName} min-w-[180px]`}
          >
            <option value="all">Tous les statuts ({counts.all})</option>
            <option value="new">Nouveaux ({counts.new})</option>
            <option value="reviewing">En cours ({counts.reviewing})</option>
            <option value="closed">Clôturés ({counts.closed})</option>
          </select>
        </div>
      </div>

      {isPending ? (
        <div className="text-[12px] text-foreground/50">Mise à jour des retours...</div>
      ) : null}

      <div className="grid gap-4">
        {filteredEntries.map((entry) => {
          const contactLabel =
            entry.contact_name ||
            entry.contact_email ||
            (entry.user_id ? `Utilisateur ${entry.user_id.slice(0, 8)}` : "Contact inconnu");

          return (
            <article
              key={entry.id}
              className="overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-semibold text-coral">
                      {getFeedbackKindLabel(entry.kind)}
                    </span>
                    <span className={statusBadgeClassName(entry.status)}>
                      {getFeedbackStatusLabel(entry.status)}
                    </span>
                  </div>

                  <h3 className="mt-3 font-serif text-[24px] text-foreground">
                    {entry.subject}
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-foreground/66">
                    {entry.message}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-foreground/46">
                    <span>Contact: {contactLabel}</span>
                    {entry.contact_email ? <span>Email: {entry.contact_email}</span> : null}
                    <span>Créé le {formatDateTime(entry.created_at)}</span>
                    {entry.page_path ? (
                      entry.page_path.startsWith("/") ? (
                        <Link
                          href={entry.page_path}
                          className="font-medium text-coral transition-colors hover:text-coral-dark"
                        >
                          Ouvrir le contexte
                        </Link>
                      ) : (
                        <span>Contexte: {entry.page_path}</span>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="w-full rounded-[20px] border border-foreground/8 bg-white/82 p-4 lg:w-[220px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                    Traitement
                  </p>
                  <select
                    value={entry.status}
                    onChange={(event) => handleStatusChange(entry.id, event.target.value as FeedbackStatus)}
                    disabled={isPending}
                    className={`${inputClassName} mt-3`}
                  >
                    {FEEDBACK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Aucun retour trouvé</p>
          <p className="mt-1 text-xs text-foreground/45">
            Ajuste la recherche ou le filtre de statut.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function statusBadgeClassName(status: FeedbackStatus) {
  if (status === "new") {
    return "rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700";
  }

  if (status === "reviewing") {
    return "rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700";
  }

  return "rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700";
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
