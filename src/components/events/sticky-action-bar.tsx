"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/bottom-nav";

/**
 * Barre d'action collante du mobile.
 *
 * Elle porte les mêmes actions que le bloc en haut de fiche : la montrer dès
 * l'arrivée afficherait deux fois la même chose à l'écran. Elle reste donc
 * escamotée tant qu'on n'a pas commencé à lire, puis remonte et ne repart
 * plus — animation discrète, pas de va-et-vient au fil du scroll.
 *
 * Elle se pose **au-dessus** de la barre de navigation du mobile, qui occupe
 * désormais le bas de toutes les pages : sans ce décalage, les deux se
 * recouvrent et le bouton d'inscription passe sous la navigation.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 z-40 transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ bottom: `${BOTTOM_NAV_HEIGHT}px` }}
    >
      {children}
    </div>
  );
}
