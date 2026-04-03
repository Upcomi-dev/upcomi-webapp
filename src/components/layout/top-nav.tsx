"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { FavoritesDropdown } from "@/components/favorites/favorites-dropdown";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";

export function TopNav() {
  const { openAuthModal } = useAuthModal();
  const { count, isAuthenticated } = useFavorites();
  const [showFavorites, setShowFavorites] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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
    <nav className="glass-nav sticky top-0 z-50 border-b border-white/45">
      <div className="mx-auto flex h-18 max-w-[1400px] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="soft-ring flex h-11 w-11 items-center justify-center rounded-full bg-white/58 text-[11px] font-semibold uppercase tracking-[0.28em] text-coral shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-105">
            U
          </div>
          <div className="font-serif text-[24px] font-bold leading-none tracking-tight text-coral">
            upcomi
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2.5">
          {/* Favorites button + dropdown */}
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
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(235,95,59,0.4)]">
                  {count}
                </span>
              )}
            </button>
            {showFavorites && <FavoritesDropdown onClose={closeFavorites} />}
          </div>

          {isAuthenticated ? (
            /* Logged in: profile button */
            <div className="relative">
              <button
                type="button"
                onClick={toggleProfile}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral"
              >
                Mon compte
              </button>
              {showProfile && <ProfileDropdown onClose={closeProfile} />}
            </div>
          ) : (
            /* Not logged in: open auth modal */
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(235,95,59,0.16),rgba(213,143,56,0.16))] px-4 text-[12px] font-semibold tracking-[0.18em] text-orange-dark uppercase transition-all hover:-translate-y-0.5 hover:border-orange/55 hover:text-coral"
            >
              Connexion
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
