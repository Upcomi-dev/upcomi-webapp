"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAppStorageImage } from "@/lib/storage/urls";

export interface RecommendableEvent {
  id: number;
  nomEvent: string | null;
  image: string | null;
}

interface RecommendedEventsPickerProps {
  selected: RecommendableEvent[];
  onChange: (events: RecommendableEvent[]) => void;
  disabled?: boolean;
}

const SEARCH_DEBOUNCE_MS = 250;
const MAX_RESULTS = 6;
const MIN_QUERY_LENGTH = 2;

/**
 * `ilike` prend le motif tel quel : `%` et `_` saisis par l'utilisatrice
 * seraient interprétés comme des jokers et feraient remonter n'importe quoi.
 */
function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

export function RecommendedEventsPicker({
  selected,
  onChange,
  disabled = false,
}: RecommendedEventsPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecommendableEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedIds = useMemo(() => new Set(selected.map((event) => event.id)), [selected]);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // La recherche est déclenchée par la frappe plutôt que par un effet : elle
  // réagit à une action, pas à un état à synchroniser.
  const search = (rawQuery: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmedQuery = rawQuery.trim();
    // Un identifiant par requête : une réponse plus lente que la frappe
    // suivante ne doit pas écraser un résultat plus récent.
    const requestId = ++requestIdRef.current;

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("id, nomEvent, image")
        .eq("verifie", true)
        .ilike("nomEvent", `%${escapeLikePattern(trimmedQuery)}%`)
        .order("dateEvent", { ascending: false })
        .limit(MAX_RESULTS * 2);

      if (requestId !== requestIdRef.current) return;

      setResults((data as RecommendableEvent[] | null) ?? []);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    search(value);
  };

  const visibleResults = results
    .filter((event) => !selectedIds.has(event.id))
    .slice(0, MAX_RESULTS);

  const addEvent = (event: RecommendableEvent) => {
    if (selectedIds.has(event.id)) return;
    onChange([...selected, event]);
    setQuery("");
    setResults([]);
    requestIdRef.current += 1;
  };

  const removeEvent = (eventId: number) => {
    onChange(selected.filter((event) => event.id !== eventId));
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="space-y-2">
          {selected.map((event) => (
            <li
              key={event.id}
              className="soft-ring flex items-center gap-3 rounded-[var(--radius-sm)] bg-white/72 px-2.5 py-2"
            >
              <EventThumb event={event} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {event.nomEvent || "Événement"}
              </span>
              <button
                type="button"
                onClick={() => removeEvent(event.id)}
                disabled={disabled}
                aria-label={`Retirer ${event.nomEvent || "cet événement"}`}
                className="flex size-7 flex-none items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/6 hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/35" />
        <input
          type="text"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder="Rechercher un événement…"
          className="w-full rounded-[var(--radius-sm)] border border-foreground/14 bg-white/80 py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-foreground/35 transition-colors focus:border-orange/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/25 disabled:opacity-50"
        />

        {query.trim().length >= MIN_QUERY_LENGTH && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[220px] overflow-y-auto rounded-[var(--radius-sm)] border border-white/60 bg-white/95 p-1 shadow-[0_12px_40px_rgba(40,24,11,0.14)] backdrop-blur-sm">
            {visibleResults.length > 0 ? (
              visibleResults.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => addEvent(event)}
                  className="flex w-full items-center gap-3 rounded-[calc(var(--radius-sm)-4px)] px-2 py-1.5 text-left transition-colors hover:bg-orange/8"
                >
                  <EventThumb event={event} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {event.nomEvent || "Événement"}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2.5 text-[13px] text-foreground/55">
                {searching ? "Recherche…" : "Aucun événement trouvé."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventThumb({ event }: { event: RecommendableEvent }) {
  const eventImage = getAppStorageImage(event.image);

  return (
    <div className="relative size-9 flex-none overflow-hidden rounded-[10px] bg-foreground/8">
      {eventImage ? (
        <Image
          src={eventImage.src}
          alt=""
          fill
          unoptimized={eventImage.unoptimized}
          className="object-cover"
          sizes="36px"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-foreground/45">
          {event.nomEvent?.substring(0, 2).toUpperCase() || "EV"}
        </span>
      )}
    </div>
  );
}
