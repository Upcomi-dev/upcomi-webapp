import type { PostgrestError } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils/slugify";

const INVALID_EVENT_SLUG_MESSAGE =
  "Le nom de l'événement doit contenir au moins une lettre ou un chiffre.";

const MAX_UNIQUE_SLUG_ATTEMPTS = 1000;

type SlugSingleResult = {
  data: { id: number } | null;
  error: PostgrestError | null;
};

type SlugSingleQuery = {
  maybeSingle: () => PromiseLike<SlugSingleResult>;
};

type SlugFilteredQuery = SlugSingleQuery & {
  neq: (column: string, value: number) => SlugSingleQuery;
};

type SlugLookupClient = {
  from: (table: "events") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => SlugFilteredQuery;
    };
  };
};

export function getEventSlugFromName(name: string) {
  const slug = slugify(name);
  if (!slug) {
    throw new Error(INVALID_EVENT_SLUG_MESSAGE);
  }
  return slug;
}

/** L'évènement tel qu'il est déjà en base, quand on le modifie. */
export interface ExistingEventSlug {
  id: number;
  nomEvent: string | null;
  dateEvent: string | null;
  slug: string | null;
}

const dayOf = (date: string | null | undefined) => date?.slice(0, 10) ?? "";

/**
 * Les slugs possibles d'un évènement, du préféré au dernier recours — la règle
 * est « nom + année » :
 *
 * 1. `badlands-2027` : le nom et l'année du départ. Les éditions annuelles d'un
 *    même évènement se distinguent ainsi sans numéro arbitraire (`badlands-1`).
 *    L'année n'est pas répétée si le nom la porte déjà, ni inventée sans date.
 * 2. `brm-200-km-audax-club-parisien-20270307` : la date complète, quand deux
 *    évènements du même nom tombent la même année.
 * 3. un suffixe `-1`, `-2`… en tout dernier recours (même nom, même jour).
 *
 * La migration `20261126120000_realign_event_slugs.sql` applique la même règle
 * à l'existant : changer l'une sans l'autre les désaligne.
 */
export function getEventSlugCandidates(name: string, dateEvent: string | null | undefined) {
  const base = getEventSlugFromName(name);
  const day = dayOf(dateEvent);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { preferred: [base], fallback: base };

  const year = day.slice(0, 4);
  const withYear = new RegExp(`(^|-)${year}(-|$)`).test(base) ? base : `${base}-${year}`;
  const withDate = `${base}-${day.replaceAll("-", "")}`;
  return { preferred: [withYear, withDate], fallback: withDate };
}

/**
 * Le slug à enregistrer. Un évènement dont ni le nom ni la date n'ont changé
 * **garde le sien** : une adresse publiée ne bouge pas parce qu'on a corrigé
 * un autre champ de la fiche.
 */
export async function getUniqueEventSlug(
  supabase: unknown,
  name: string,
  dateEvent: string | null | undefined,
  existing?: ExistingEventSlug
) {
  if (
    existing?.slug &&
    existing.nomEvent === name &&
    dayOf(existing.dateEvent) === dayOf(dateEvent)
  ) {
    return existing.slug;
  }

  const { preferred, fallback } = getEventSlugCandidates(name, dateEvent);
  const excludedEventId = existing?.id;
  const client = supabase as SlugLookupClient;

  for (let attempt = 0; attempt < MAX_UNIQUE_SLUG_ATTEMPTS; attempt++) {
    const suffix = attempt - preferred.length + 1;
    const slug = attempt < preferred.length ? preferred[attempt] : `${fallback}-${suffix}`;
    const baseQuery = client.from("events").select("id").eq("slug", slug);
    const { data, error } =
      excludedEventId == null
        ? await baseQuery.maybeSingle()
        : await baseQuery.neq("id", excludedEventId).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return slug;
    }
  }

  throw new Error("Impossible de générer une URL unique pour cet événement.");
}

export function isDuplicateEventSlugError(error: Pick<PostgrestError, "code" | "message"> | null) {
  if (!error) return false;
  return (
    error.code === "23505" &&
    (error.message.includes("events_slug_lower_unique_idx") ||
      error.message.includes("events_slug_key") ||
      error.message.includes("duplicate key"))
  );
}
