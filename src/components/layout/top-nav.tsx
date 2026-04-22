"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { useFlyingHeart } from "@/components/favorites/flying-heart";
import { AppLogo } from "@/components/layout/app-logo";
import { FavoritesDropdown } from "@/components/favorites/favorites-dropdown";
import { FavoritesSheet } from "@/components/favorites/favorites-sheet";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";

export function TopNav() {
  const { openAuthModal } = useAuthModal();
  const { user, ready } = useAuth();
  const { count } = useFavorites();
  const flyingHeart = useFlyingHeart();
  const isAuthenticated = user !== null;
  const [isMobile, setIsMobile] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

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

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50 border-b border-white/45">
        <div className="flex h-18 items-center gap-4 px-4 md:px-6">
          <AppLogo
            href="/"
            priority
            className="min-w-0"
            imageClassName="h-9 md:h-10 w-auto"
          />
          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={toggleFavorites}
                className="soft-ring relative flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-foreground/55 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:text-coral"
                aria-label="Voir les favoris"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span
                  ref={flyingHeart?.counterRef}
                  className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)] transition-transform ${count > 0 ? "scale-100" : "scale-0"}`}
                >
                  {count}
                </span>
              </button>
              {showFavorites && !isMobile && (
                <div className="hidden md:block">
                  <FavoritesDropdown onClose={closeFavorites} />
                </div>
              )}
              {isMobile && (
                <FavoritesSheet open={showFavorites} onOpenChange={setShowFavorites} />
              )}
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
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] text-orange-dark transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral md:hidden"
                  aria-label="Ouvrir la connexion"
                >
                  <User className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="hidden h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral md:inline-flex"
                >
                  Connexion
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

    </>
  );
}
