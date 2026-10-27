"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Le réglage « profil privé » de mon propre profil, dans la maquette.
 *
 * **En mémoire uniquement**, comme `FollowContext` : rien n'est écrit en
 * base, un rechargement remet la maquette à son état initial. `user_public`
 * n'a pas encore de colonne `is_private` — voir « Le profil privé n'existe
 * pas » dans `docs/upcomi-v2.md` — ce contexte montre le geste (le bouton
 * « rendre ton profil privé » du profil, le bascule de l'éditeur) sans
 * prétendre à une persistance qui n'existe pas.
 */
interface ProfileSettingsValue {
  isPrivate: boolean;
  setIsPrivate: (isPrivate: boolean) => void;
}

const ProfileSettingsContext = createContext<ProfileSettingsValue | null>(null);

export function ProfileSettingsProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  const value = useMemo<ProfileSettingsValue>(() => ({ isPrivate, setIsPrivate }), [isPrivate]);

  return (
    <ProfileSettingsContext.Provider value={value}>{children}</ProfileSettingsContext.Provider>
  );
}

export function useProfileSettings() {
  const context = useContext(ProfileSettingsContext);
  if (!context) {
    throw new Error("useProfileSettings doit être utilisé dans un ProfileSettingsProvider");
  }
  return context;
}
