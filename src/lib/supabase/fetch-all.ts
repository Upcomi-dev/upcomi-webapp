import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Plafond de lignes de PostgREST (`max_rows`, cf. supabase/config.toml et le
 * réglage « Max rows » du dashboard). Au-delà, Supabase tronque la réponse en
 * silence : pas d'erreur, juste 1000 lignes.
 */
export const POSTGREST_MAX_ROWS = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Lit toutes les lignes d'une requête, page par page, sans buter sur
 * `max_rows`. À utiliser pour toute liste dont la taille n'est pas bornée.
 *
 * `page` doit reconstruire la requête à chaque appel et finir par
 * `.range(from, to)`. L'ordre doit être total (ajouter une colonne unique en
 * dernier `.order()`), sinon des lignes peuvent sauter ou doubler entre pages.
 *
 *   fetchAllRows((from, to) =>
 *     supabase.from("events").select("*").order("dateEvent").order("id").range(from, to)
 *   )
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<PageResult<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await page(from, from + POSTGREST_MAX_ROWS - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < POSTGREST_MAX_ROWS) return { data: rows, error: null };
  }
}

/**
 * `fetch` passé aux clients Supabase : signale toute lecture non paginée qui
 * revient pile à `max_rows` lignes — c'est le symptôme d'une liste tronquée.
 * Une requête avec `.limit()` / `.range()` est volontairement bornée et ignorée.
 */
export const truncationGuardFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const match = response.headers.get("content-range")?.match(/^(\d+)-(\d+)\//);
  if (match && Number(match[2]) - Number(match[1]) + 1 === POSTGREST_MAX_ROWS) {
    const url = input instanceof Request ? input.url : String(input);
    if (!/[?&]limit=/.test(url)) {
      console.error(
        `[supabase] Réponse tronquée à ${POSTGREST_MAX_ROWS} lignes : ${url.split("?")[0]}. ` +
          "Paginer avec fetchAllRows() (src/lib/supabase/fetch-all.ts)."
      );
    }
  }
  return response;
};
