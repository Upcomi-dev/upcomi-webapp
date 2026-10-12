"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Barre d'action collante du mobile.
 *
 * Elle porte les mêmes actions que le bloc en haut de fiche : la montrer dès
 * l'arrivée afficherait deux fois la même chose à l'écran. Elle reste donc
 * escamotée tant qu'on n'a pas commencé à lire, puis remonte et ne repart
 * plus — animation discrète, pas de va-et-vient au fil du scroll.
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
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {children}
    </div>
  );
}
