"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { MAIN_NAV_ITEMS, isNavItemActive } from "@/components/layout/main-nav-items";

/**
 * Hauteur occupée par la barre, **hors** marge de sécurité iOS.
 *
 * Elle est fixée, pas mesurée : la rangée a une hauteur explicite
 * (`ROW_HEIGHT`) précisément pour que cette constante reste vraie quand un
 * libellé passe sur deux lignes. Le bottom sheet de la carte et la barre
 * d'action de la fiche évènement s'en servent pour se poser au-dessus.
 */
const ROW_HEIGHT = 56;
const PADDING_TOP = 6;
const PADDING_BOTTOM = 8;
const BORDER_TOP = 1;
export const BOTTOM_NAV_HEIGHT = ROW_HEIGHT + PADDING_TOP + PADDING_BOTTOM + BORDER_TOP;

/**
 * La barre de navigation du mobile : les **mêmes quatre entrées** que
 * l'en-tête desktop, jamais un sous-ensemble. Une entrée qu'on ne trouve que
 * sur un écran n'existe pas vraiment.
 *
 * Ce composant existait déjà mais **n'était monté nulle part** — trois entrées
 * (Carte / Favoris / Profil) dont deux ouvraient une feuille au lieu de
 * naviguer. Il est réécrit sur le modèle partagé et monté dans le layout.
 *
 * `MobileBottomSheet` prévoyait déjà sa place : la constante
 * `BOTTOM_NAV_HEIGHT` y valait 0 en attendant, elle est rebranchée sur celle
 * d'ici.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { count } = useFavorites();
  const isAuthenticated = user !== null;

  // Hauteur pleine et identique pour les quatre : « Mes évènements » passe
  // sur deux lignes à 375 px, et sans hauteur fixe il ferait grandir la barre
  // — donc mentir la constante dont dépendent le sheet et la barre d'action.
  const itemClassName = (active: boolean) =>
    cn(
      "flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-1 transition-all",
      active ? "bg-white/58 text-coral shadow-[var(--shadow-sm)]" : "text-foreground/55"
    );

  return (
    <nav
      className="glass-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/45 md:hidden"
      style={{
        paddingTop: PADDING_TOP,
        paddingBottom: `max(${PADDING_BOTTOM}px, env(safe-area-inset-bottom))`,
        boxShadow: "0 -18px 50px rgba(36,23,15,0.12)",
      }}
      aria-label="Navigation principale"
    >
      <div
        className="flex items-stretch justify-around gap-0.5 px-2"
        style={{ height: ROW_HEIGHT }}
      >
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          // Le compteur de favoris n'a de sens qu'une fois connectée : ils
          // sont rattachés au compte.
          const badgeCount = item.badge === "favorites" && isAuthenticated ? count : 0;

          // Déconnectée, « Mon profil » devient l'invitation à se connecter :
          // l'entrée garde sa place plutôt que de disparaître, sinon la barre
          // change de forme selon l'état du compte.
          if (item.authOnly && ready && !isAuthenticated) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => openAuthModal({ view: "login" })}
                className={itemClassName(false)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.08em]">
                  Compte
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={itemClassName(isNavItemActive(item, pathname))}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white">
                    {badgeCount}
                  </span>
                )}
              </span>
              <span className="text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.08em]">
                {item.short}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
