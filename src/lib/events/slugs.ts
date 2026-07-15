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

export async function getUniqueEventSlug(
  supabase: unknown,
  name: string,
  excludedEventId?: number
) {
  const baseSlug = getEventSlugFromName(name);
  const client = supabase as SlugLookupClient;

  for (let suffix = 0; suffix < MAX_UNIQUE_SLUG_ATTEMPTS; suffix++) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
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
