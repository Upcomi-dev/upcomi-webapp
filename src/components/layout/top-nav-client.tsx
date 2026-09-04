"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarPlus, Check, Heart, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { useFlyingHeart } from "@/components/favorites/flying-heart";
import { AppLogo } from "@/components/layout/app-logo";
import { FavoritesDropdown } from "@/components/favorites/favorites-dropdown";
import { FavoritesSheet } from "@/components/favorites/favorites-sheet";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { AppLegalInfo } from "@/components/layout/app-footer";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function TopNavClient({ eventProposalsEnabled }: { eventProposalsEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();
  const { user, ready, signOut } = useAuth();
  const { count, participationCount } = useFavorites();
  const flyingHeart = useFlyingHeart();
  const isAuthenticated = user !== null;
  const favoritesButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritesInitialTab, setFavoritesInitialTab] = useState<"favorites" | "participations">("favorites");
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setShowMobileMenu(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const toggleFavorites = useCallback(() => {
    setShowFavorites((prev) => !prev);
    setShowProfile(false);
  }, []);

  const closeFavorites = useCallback(() => {
    setShowFavorites(false);
  }, []);

  const toggleProfile = useCallback(() => {
    setShowProfile((prev) => !prev);
    setShowFavorites(false);
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

  const openMobileFavorites = useCallback(
    (tab: "favorites" | "participations") => {
      closeMobileMenu();
      setFavoritesInitialTab(tab);
      setShowFavorites(true);
    },
    [closeMobileMenu]
  );

  const openMobileAuth = useCallback(() => {
    closeMobileMenu();
    openAuthModal();
  }, [closeMobileMenu, openAuthModal]);

  const handleMobileLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const { error } = await signOut();
    setLoggingOut(false);
    if (!error) {
      closeMobileMenu();
    }
  }, [loggingOut, signOut, closeMobileMenu]);

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
          <div className="ml-auto hidden items-center gap-2.5 md:flex">
            {eventProposalsEnabled ? (
              <Link
                href="/proposer-un-evenement"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-white/58 px-4 text-[12px] font-semibold tracking-[0.08em] text-foreground/55 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:bg-white/80 hover:text-coral"
              >
                Proposer un événement
              </Link>
            ) : null}
            <FeedbackDialog />

            <div className="relative">
              <button
                ref={favoritesButtonRef}
                type="button"
                onClick={toggleFavorites}
                className="soft-ring relative flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:text-coral"
                aria-label="Voir les favoris"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span
                  ref={!isMobile ? flyingHeart?.counterRef : undefined}
                  className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)] transition-transform ${count > 0 ? "scale-100" : "scale-0"}`}
                >
                  {count}
                </span>
              </button>
              {showFavorites && !isMobile ? (
                <FavoritesDropdown
                  anchorRef={favoritesButtonRef}
                  onClose={closeFavorites}
                />
              ) : null}
            </div>

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
                onClick={() => openAuthModal()}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral"
              >
                Connexion
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => openMobileFavorites("favorites")}
              className="soft-ring relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/58 text-foreground/68 transition-colors hover:bg-white/80 hover:text-coral"
              aria-label="Voir mes favoris"
            >
              <Heart className="h-5 w-5" />
              <span
                ref={isMobile ? flyingHeart?.counterRef : undefined}
                className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)] transition-transform ${count > 0 ? "scale-100" : "scale-0"}`}
              >
                {count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileMenuChange(true)}
              className="soft-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/58 text-foreground/68 transition-colors hover:bg-white/80 hover:text-coral"
              aria-label="Ouvrir le menu"
              aria-expanded={showMobileMenu}
              aria-controls="mobile-header-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
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
              <button
                type="button"
                onClick={() => openMobileFavorites("favorites")}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral"
              >
                <span className="flex items-center gap-3">
                  <Heart className="h-[18px] w-[18px] shrink-0" />
                  Mes favoris
                </span>
                {count > 0 ? (
                  <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[11px] font-bold text-coral">
                    {count}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => openMobileFavorites("participations")}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral"
              >
                <span className="flex items-center gap-3">
                  <Check className="h-[18px] w-[18px] shrink-0" />
                  Mes participations
                </span>
                {participationCount > 0 ? (
                  <span className="rounded-full bg-coral/12 px-2 py-0.5 text-[11px] font-bold text-coral">
                    {participationCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="my-3 h-px bg-foreground/10" />

            <div className="space-y-1">
              {!ready ? (
                <div className="h-12 animate-pulse rounded-[14px] bg-white/45" aria-hidden="true" />
              ) : isAuthenticated ? (
                <>
                  <div className="px-3 pb-1 pt-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/38">
                      Connecté en tant que
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-medium text-foreground/80">
                      {user?.email ?? "(email non renseigné)"}
                    </p>
                  </div>

                  <Link
                    href="/profil"
                    onClick={closeMobileMenu}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral"
                  >
                    <User className="h-[18px] w-[18px] shrink-0" />
                    Mon profil
                  </Link>

                  <button
                    type="button"
                    onClick={handleMobileLogout}
                    disabled={loggingOut}
                    className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral disabled:opacity-60"
                  >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                    {loggingOut ? "Déconnexion..." : "Se déconnecter"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openMobileAuth}
                  className="flex min-h-12 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral"
                >
                  <User className="h-[18px] w-[18px] shrink-0" />
                  Connexion
                </button>
              )}
            </div>

            <div className="my-3 h-px bg-foreground/10" />

            <div className="space-y-1">
              <FeedbackDialog variant="menu-plain" />

              {eventProposalsEnabled ? (
                <Link
                  href="/proposer-un-evenement"
                  onClick={closeMobileMenu}
                  className="flex min-h-12 items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium text-foreground/78 transition-colors hover:bg-white/55 hover:text-coral"
                >
                  <CalendarPlus className="h-[18px] w-[18px] shrink-0" />
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

      {isMobile ? (
        <FavoritesSheet
          open={showFavorites}
          onOpenChange={setShowFavorites}
          initialTab={favoritesInitialTab}
        />
      ) : null}
    </>
  );
}
