import { EventCard } from "./event-card";
import { getSimilarEvents } from "@/lib/events/similar-events";

/**
 * « Évènements similaires » — dernier bloc de la fiche.
 *
 * Comparer sans sortir d'Upcomi : les formats les plus proches, présentés avec
 * exactement les mêmes repères que dans les résultats de recherche (durée,
 * distance, dénivelé), pour que la comparaison se fasse d'un coup d'œil.
 *
 * Carrousel horizontal d'une seule ligne, pas une grille : le bloc arrive en
 * fin de page, il ne doit pas rallonger la lecture de la fiche qu'on est en
 * train de consulter. Ce sont les grandes tuiles photo (`variant="carousel"`),
 * contrairement à « Leurs autres évènements » sous le bloc organisateur, qui
 * reste en lignes compactes : ici c'est une proposition franche d'aller voir
 * ailleurs, là une note de bas de page sur l'organisation.
 *
 * MAQUETTE : la liste est en dur (voir `lib/events/similar-events`).
 */
export function SimilarEvents({ eventId }: { eventId: number }) {
  const events = getSimilarEvents(eventId);
  if (events.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-3.5 font-serif text-[22px] leading-tight text-foreground">
        Évènements similaires
      </h2>
      {/* Les marges négatives font filer les cartes jusqu'aux bords de
          l'écran : sur mobile, un carrousel qui s'arrête à la gouttière ne se
          lit pas comme quelque chose qui défile. */}
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
        {/* Pas d'enveloppe autour des cartes : `variant="carousel"` porte déjà
            sa largeur, `flex-none` et `snap-start`. */}
        {events.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            slug={event.slug}
            nomEvent={event.nomEvent}
            dateEvent={event.dateEvent}
            dateFin={event.dateFin}
            image={event.image}
            bike_type={event.bike_type}
            type_event={event.type_event}
            villeDepart={event.villeDepart}
            paysDepart={event.paysDepart}
            distance={event.distance}
            maxElevation={event.maxElevation}
            mint={event.mint}
            variant="carousel"
          />
        ))}
      </div>
    </section>
  );
}
