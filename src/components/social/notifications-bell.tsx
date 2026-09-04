"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useFollow } from "@/components/social/follow-context";
import { getMockPerson, getPersonFullName } from "@/lib/social/mock-social";

/**
 * Le centre de notifications : demandes de suivi à trancher, et nouveaux
 * abonné·es à constater.
 *
 * ⚠️ **Rien de tout ça n'existe en base, et rien n'est prévu au plan.** Le
 * prototype pose un centre complet — badge de non-lus, accepter / refuser une
 * demande — dont le découpage V2 ne parle nulle part. C'est une brique à part
 * entière, et cette maquette sert d'abord à la rendre visible : il faut une
 * table de notifications, un compteur de non-lus, et un vrai usage de
 * `friendships.status` (`pending` / `accepted`) pour que « demande de suivi »
 * veuille dire quelque chose.
 *
 * Le popover ne s'affiche que connectée : sans compte, il n'y a pas de réseau
 * et donc rien à notifier.
 */
export function NotificationsBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, respondToRequest, markNotificationsRead } =
    useFollow();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  const toggle = () => {
    // Ouvrir vaut lecture : le badge tombe dès qu'on a vu la liste, pas quand
    // on a répondu — répondre est une décision, pas un accusé de réception.
    //
    // `markNotificationsRead()` est appelé ici et non dans la fonction de mise
    // à jour de `setOpen` : React rejoue cette fonction pendant le rendu, et
    // écrire dans un autre composant depuis un rendu lève « Cannot update a
    // component while rendering a different component ».
    if (!open) markNotificationsRead();
    setOpen((current) => !current);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Voir les notifications"
        aria-expanded={open}
        className="soft-ring relative flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:text-coral"
      >
        <Bell className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        <span
          className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[13px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)] transition-transform ${
            unreadCount > 0 ? "scale-100" : "scale-0"
          }`}
        >
          {unreadCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-[20px] border border-white/50 bg-white/95 p-4 shadow-[var(--shadow-md)] backdrop-blur-xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
            Notifications
          </p>

          {notifications.length === 0 ? (
            <p className="text-sm text-foreground/55">
              Aucune notification pour le moment.
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const person = getMockPerson(notification.personId);
                if (!person) return null;
                const name = getPersonFullName(person);

                return (
                  <div
                    key={notification.id}
                    className="border-b border-black/6 py-3 last:border-b-0"
                  >
                    <p className="text-[13px] leading-relaxed text-foreground/80">
                      <Link
                        href={`/profil/${person.id}`}
                        onClick={() => setOpen(false)}
                        className="font-semibold text-foreground no-underline hover:text-coral"
                      >
                        {name}
                      </Link>{" "}
                      {notification.type === "follow_request"
                        ? "souhaite suivre ton profil."
                        : "s'est abonnée à ton profil."}
                    </p>

                    {notification.type === "follow_request" && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => respondToRequest(notification.id, true)}
                          className="btn-primary btn-small"
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          onClick={() => respondToRequest(notification.id, false)}
                          className="btn-secondary btn-small"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
