import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Un récit tel qu'il s'affiche sur la fiche : le prénom de son autrice, son
 * texte libre, le lien vers là où il a été publié. Le nom de famille et
 * l'adresse e-mail ne sortent pas de la base (voir `get_event_stories`).
 */
export interface EventStory {
  userId: string;
  story: string | null;
  storyUrl: string | null;
  createdAt: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

interface EventStoryRow {
  user_id: string;
  story: string | null;
  story_url: string | null;
  created_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
}

/** Nom affiché quand le profil n'a pas encore de prénom. */
export const ANONYMOUS_STORY_AUTHOR = "Un·e participant·e";

/**
 * Les récits d'un évènement, du plus récent au plus ancien.
 *
 * La fonction n'est exécutable que par `authenticated` : appelée sans session,
 * elle répond « permission denied ». C'est un cas normal, pas une panne — on
 * renvoie une liste vide et le bloc bascule sur son teaser.
 */
export async function fetchEventStories(
  supabase: SupabaseClient,
  eventId: number
): Promise<EventStory[]> {
  const { data, error } = await supabase.rpc("get_event_stories", {
    p_event_id: eventId,
  });

  if (error || !data) return [];

  return (data as EventStoryRow[]).map((row) => ({
    userId: row.user_id,
    story: row.story,
    storyUrl: row.story_url,
    createdAt: row.created_at,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
  }));
}

/**
 * Combien de récits sur cet évènement, sans les lire. C'est ce que la fiche
 * annonce aux personnes déconnectées, pour qui `fetchEventStories` ne renvoie
 * rien.
 */
export async function fetchEventStoryCount(
  supabase: SupabaseClient,
  eventId: number
): Promise<number> {
  const { data, error } = await supabase.rpc("get_event_story_counts", {
    p_event_ids: [eventId],
  });

  if (error || !data) return 0;

  const row = (data as { event_id: number; story_count: number }[])[0];
  return row ? Number(row.story_count) || 0 : 0;
}

/**
 * Les évènements sur lesquels l'utilisatrice a déjà déposé un récit. La policy
 * de `select` de `user_event_stories` ne laisse voir que ses propres lignes :
 * une requête directe suffit, pas besoin de passer par une fonction.
 */
export async function fetchOwnStoryEventIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("user_event_stories")
    .select("event_id")
    .eq("user_id", userId);

  if (error || !data) return new Set();

  return new Set((data as { event_id: number }[]).map((row) => row.event_id));
}

/**
 * D'où vient le récit, pour l'annoncer sur le bouton qui y mène. Repris du
 * prototype (`review.js`, `linkLabel`) : les deux plateformes citées dans le
 * champ de saisie sont nommées, le reste retombe sur le nom de domaine.
 */
export function getStoryLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("strava")) return "Strava";
    return host;
  } catch {
    return "Lien";
  }
}

/** Le récit dit-il quelque chose ? La base l'exige, la lecture s'en assure. */
export function hasStoryContent(story: EventStory): boolean {
  return Boolean(story.story?.trim() || story.storyUrl);
}

/**
 * Le récit de l'utilisatrice sur un évènement, pour le pré-remplir quand elle
 * revient le modifier. La policy de `select` garantit qu'on ne lit que le sien.
 */
export async function fetchOwnEventStory(
  supabase: SupabaseClient,
  userId: string,
  eventId: number
): Promise<{ storyUrl: string; story: string } | null> {
  const { data, error } = await supabase
    .from("user_event_stories")
    .select("story_url, story")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { story_url: string | null; story: string | null };
  return { storyUrl: row.story_url ?? "", story: row.story ?? "" };
}
