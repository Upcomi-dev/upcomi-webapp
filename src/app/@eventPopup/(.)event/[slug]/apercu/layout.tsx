import { EventPopup } from "@/components/events/event-popup";

// La popup vit dans le layout : elle s'ouvre une seule fois, et seul son
// contenu passe du squelette (`loading.tsx`) à la fiche. Rendue par la page et
// par le chargement, elle était démontée puis remontée — l'animation
// d'ouverture se rejouait.
export default function EventPopupLayout({ children }: { children: React.ReactNode }) {
  return <EventPopup>{children}</EventPopup>;
}
