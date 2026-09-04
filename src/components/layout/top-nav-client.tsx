"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Menu, User, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { useFlyingHeart } from "@/components/favorites/flying-heart";
import { AppLogo } from "@/components/layout/app-logo";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { AppLegalInfo } from "@/components/layout/app-footer";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { MAIN_NAV_ITEMS, isNavItemActive } from "@/components/layout/main-nav-items";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function TopNavClient({ eventProposalsEnabled }: { eventProposalsEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const { count } = useFavorites();
  const flyingHeart = useFlyingHeart();
  const isAuthenticated = user !== null;
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Repasser en desktop referme le menu latéral : sans ça, il reste ouvert
  // en arrière-plan et rend la page inerte au clic.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      if (!mediaQuery.matches) setShowMobileMenu(false);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const toggleProfile = useCallback(() => {
    setShowProfile((prev) => !prev);
  }, []);

  const closeProfile = useCallback(() => {
    setShowProfile(false);
  }, []);

  const handleMobileMenuChange = useCallback((open: boolean) => {
    setShowMobileMenu(open);
    if (!open) {
      setShowProfile(false);
    }
  }, []);

  const closeMobileMenu = useCallback(() => {
    handleMobileMenuChange(false);
  }, [handleMobileMenuChange]);

  const openMobileAuth = useCallback(() => {
    closeMobileMenu();
    openAuthModal({ view: "login" });
  }, [closeMobileMenu, openAuthModal]);

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50 border-b border-white/45">
        <div className="flex h-[75px] items-center gap-4 px-4 md:px-6">
          <AppLogo
            href="https://upcomi.cc/"
            priority
            className="min-w-0"
            sizes="(max-width: 767px) 156px, 188px"
            imageClassName="h-12 md:h-14 w-auto"
            ariaLabel="Accéder au site Upcomi"
          />
          {/* Les quatre espaces, au même niveau visuel. « Mes évènements »
              n'ouvre plus un popover de favoris : c'est une page, comme les
              trois autres — voir `main-nav-items`. */}
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Navigation principale">
            {MAIN_NAV_ITEMS.map((item) => {
              if (item.authOnly && (!ready || !isAuthenticated)) return null;
              const Icon = item.icon;
              const active = isNavItemActive(item, pathname);
              const badgeCount = item.badge === "favorites" && isAuthenticated ? count : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-all ${
                    active
                      ? "bg-white/70 text-coral shadow-[var(--shadow-xs)]"
                      : "text-foreground/60 hover:bg-white/58 hover:text-coral"
                  }`}
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.badge === "favorites" ? (
                      // Le compteur est toujours rendu — c'est la cible du
                      // cœur volant — mais masqué aux lecteurs d'écran : sans
                      // ça, le lien s'annonce « 0 Mes évènements ».
                      <span
                        ref={flyingHeart?.counterRef}
                        aria-hidden="true"
                        className={`absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)] transition-transform ${badgeCount > 0 ? "scale-100" : "scale-0"}`}
                      >
                        {badgeCount}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Les actions, séparées des espaces : proposer un évènement et
              donner un retour ne sont pas des endroits où l'on navigue.
              « Proposer » passe en icône — le libellé prenait la place que la
              navigation réclame maintenant. */}
          <div className="hidden items-center gap-2.5 md:flex">
            {eventProposalsEnabled ? (
              <Link
                href="/proposer-un-evenement"
                title="J'organise un évènement"
                aria-label="J'organise un évènement"
                className="soft-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:text-coral"
              >
                <CalendarPlus className="h-4 w-4" />
              </Link>
            ) : null}
            <FeedbackDialog />

            {!ready ? (
              <div
                className="h-10 w-[124px] rounded-full border border-white/50 bg-white/30"
                aria-hidden="true"
              />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleProfile}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral"
                >
                  Mon compte
                </button>
                {showProfile && (
                  <ProfileDropdown
                    onClose={closeProfile}
                  />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal({ view: "login" })}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral"
              >
                Connexion
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleMobileMenuChange(true)}
            className="soft-ring ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/58 text-foreground/68 transition-colors hover:bg-white/80 hover:text-coral md:hidden"
            aria-label="Ouvrir le menu"
            aria-expanded={showMobileMenu}
            aria-controls="mobile-header-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <Dialog open={showMobileMenu} onOpenChange={handleMobileMenuChange}>
        <DialogContent
          id="mobile-header-menu"
          showCloseButton={false}
          className="top-0 right-0 bottom-0 left-auto flex h-dvh max-h-dvh w-[min(88vw,380px)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(243,235,223,0.97))] p-0 data-open:slide-in-from-right data-closed:slide-out-to-right md:hidden"
        >
          <div className="flex h-[75px] shrink-0 items-center justify-end border-b border-foreground/8 px-5">
            <DialogTitle className="sr-only">
              Menu
            </DialogTitle>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="soft-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/62 text-foreground/60 transition-colors hover:bg-white/85 hover:text-coral"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="space-y-1">
              {!ready ? (
                <div className="h-14 animate-pulse rounded-[18px] bg-white/45" aria-hidden="true" />
              ) : isAuthenticated ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowProfile((previous) => !previous)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3 text-left text-[14px] font-semibold text-foreground/72 transition-colors hover:bg-white/62 hover:text-coral"
                    aria-expanded={showProfile}
                  >
                    <span className="soft-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] text-orange-dark">
                      <User className="h-4 w-4" />
                    </span>
                    Mon compte
                  </button>
                  {showProfile ? (
                    <ProfileDropdown variant="inline" onClose={closeMobileMenu} />
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openMobileAuth}
                  className="flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3 text-left text-[14px] font-semibold text-foreground/72 transition-colors hover:bg-white/62 hover:text-coral"
                >
                  <span className="soft-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] text-orange-dark">
                    <User className="h-4 w-4" />
                  </span>
                  Connexion
                </button>
              )}

            </div>

            <div className="my-4 h-px bg-foreground/8" />

            {/* Les mêmes quatre espaces que la barre du bas et l'en-tête. Le
                menu ne montre pas autre chose que la navigation : il la répète
                en toutes lettres, là où la barre du bas doit abréger. */}
            <div className="space-y-1">
              {MAIN_NAV_ITEMS.map((item) => {
                if (item.authOnly && (!ready || !isAuthenticated)) return null;
                const Icon = item.icon;
                const badgeCount = item.badge === "favorites" && isAuthenticated ? count : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    aria-current={isNavItemActive(item, pathname) ? "page" : undefined}
                    className="flex min-h-14 items-center gap-3 rounded-[18px] px-3 text-[14px] font-semibold text-foreground/72 transition-colors hover:bg-white/62 hover:text-coral"
                  >
                    <span className="soft-ring relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/58 text-coral">
                      <Icon className="h-4 w-4" />
                      {badgeCount > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white">
                          {badgeCount}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="my-4 h-px bg-foreground/8" />

            <div className="space-y-1">
              <FeedbackDialog variant="menu" />

              {eventProposalsEnabled ? (
                <Link
                  href="/proposer-un-evenement"
                  onClick={closeMobileMenu}
                  className="flex min-h-14 items-center gap-3 rounded-[18px] px-3 text-[14px] font-semibold text-foreground/72 transition-colors hover:bg-white/62 hover:text-coral"
                >
                  <span className="soft-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/58 text-coral">
                    <CalendarPlus className="h-4 w-4" />
                  </span>
                  Proposer un événement
                </Link>
              ) : null}
            </div>
          </div>

          <div
            className="shrink-0 border-t border-foreground/8 px-5 pt-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <AppLegalInfo variant="mobile-menu" />
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
