import { CalendarPlus, MapPin, Train, Venus } from "lucide-react";
import { KeyDateReminderButton } from "@/components/events/key-date-reminder-button";
import type { EventKeyDate } from "@/lib/utils/event-key-dates";

interface EventKeyDatesProps {
  eventId: number;
  dates: EventKeyDate[];
}

/**
 * « Pour se préparer » : les dates clés du déplacement sur une timeline
 * verticale — ouverture des inscriptions, clôture, départ (avec le lieu et la
 * gare la plus proche), arrivée.
 *
 * L'accès en train est rattaché au point « Départ » plutôt que traité comme
 * une information à part : venir sans voiture est un critère de décision, pas
 * une pastille.
 */
export function EventKeyDates({ eventId, dates }: EventKeyDatesProps) {
  if (dates.length === 0) return null;

  return (
    <section
      className="glass mb-6 rounded-[var(--radius)] p-5"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <h2 className="mb-4 font-serif text-[22px] leading-tight text-foreground">
        Pour se préparer
      </h2>
      <ol className="flex flex-col">
        {dates.map((date, index) => (
          <li
            key={date.id}
            className={`relative flex items-start gap-3 ${
              index === dates.length - 1 ? "" : "pb-5"
            }`}
          >
            {/* Trait de liaison entre les points, absent sous le dernier. */}
            {index < dates.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[6px] top-4 bottom-[-4px] w-0.5 bg-foreground/12"
              />
            )}
            <span
              aria-hidden
              className={`relative z-[1] mt-0.5 h-3.5 w-3.5 flex-none rounded-full border-[3px] border-[var(--background)] shadow-[0_0_0_1px_rgba(36,23,15,0.12)] ${
                date.dateKey ? "bg-coral" : "bg-foreground/20"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-foreground">{date.dateLabel}</div>
              <div className="mt-px text-sm text-foreground/60">{date.label}</div>

              {date.place && (
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/55">
                  <MapPin className="h-3 w-3 flex-none" strokeWidth={1.8} />
                  {date.place}
                </div>
              )}
              {date.station && (
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/55">
                  <Train className="h-3 w-3 flex-none" strokeWidth={1.8} />
                  {date.station}
                </div>
              )}

              {(date.reminder || date.calendarUrl) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {date.reminder && <KeyDateReminderButton eventId={eventId} />}
                  {date.calendarUrl && (
                    <a
                      href={date.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-small"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Ajouter à mon calendrier
                    </a>
                  )}
                </div>
              )}

              {date.details.map((detail) => (
                <div key={detail} className="mt-1 text-[13px] text-foreground/55">
                  {detail}
                </div>
              ))}

              {/* Ce que l'organisation met en place pour les femmes et
                  minorités de genre : le vert de la charte inclusion et le gras
                  les sortent des précisions grises juste au-dessus. */}
              {date.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="mt-1 flex items-start gap-1.5 text-[13px] font-bold text-green"
                >
                  <Venus className="mt-[3px] h-3 w-3 flex-none" strokeWidth={2} aria-hidden />
                  {highlight}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
