"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeUserProfile, type UserProfileFormValues } from "@/lib/profile";

/** Doivent rester alignés sur les contraintes de `user_event_stories`. */
export const EVENT_STORY_MAX_LENGTH = 1500;
export const EVENT_STORY_URL_MAX_LENGTH = 2048;

interface SaveUserProfileOptions {
  /**
   * Marque le parcours d'inscription comme terminé. Le parcours V2 enregistre
   * le profil dès l'étape « où roules-tu » (pour ne rien perdre si la session
   * est interrompue) mais ne pose ce drapeau qu'à la toute fin.
   */
  completeOnboarding?: boolean;
}

/**
 * Écrit le profil aux trois endroits qui le composent : `users` (la source),
 * `user_public` (ce que les autres pourront lire) et `user_metadata` (lu sans
 * requête supplémentaire, notamment par le layout).
 */
export async function saveUserProfile(
  supabase: SupabaseClient,
  user: User,
  values: UserProfileFormValues,
  { completeOnboarding = false }: SaveUserProfileOptions = {}
): Promise<{ error: string | null }> {
  const profile = normalizeUserProfile(values);
  const now = new Date().toISOString();
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  const [profileResult, publicProfileResult] = await Promise.all([
    supabase.from("users").upsert(
      {
        uid: user.id,
        email: user.email ?? profile.email ?? null,
        name: profile.firstName || null,
        surname: profile.lastName || null,
        ville: profile.city || null,
        pref1: profile.practiceTypes.length > 0 ? profile.practiceTypes : null,
        pref2: profile.practiceLevel || null,
        genre: profile.gender || null,
        updated_at: now,
      },
      { onConflict: "uid" }
    ),
    supabase.from("user_public").upsert(
      {
        uid: user.id,
        name: profile.firstName || null,
        surname: profile.lastName || null,
        // Niveau et ville sont recopiés ici pour être lisibles des autres
        // membres : la feuille « qui est intéressée » de la fiche évènement
        // les affiche, et `users.pref2` / `users.ville` ne sont visibles que
        // de soi.
        niveau: profile.practiceLevel || null,
        ville: profile.city || null,
        updated_at: now,
      },
      { onConflict: "uid" }
    ),
  ]);

  if (profileResult.error) {
    return { error: profileResult.error.message || "Impossible d'enregistrer ton profil." };
  }

  if (publicProfileResult.error) {
    return {
      error: publicProfileResult.error.message || "Impossible de synchroniser ton profil public.",
    };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      first_name: profile.firstName,
      last_name: profile.lastName,
      name: fullName,
      full_name: fullName,
      city: profile.city,
      practice_types: profile.practiceTypes,
      practice_level: profile.practiceLevel,
      gender: profile.gender,
      ...(completeOnboarding ? { onboarding_completed: true } : {}),
    },
  });

  if (authError) {
    return { error: authError.message || "Impossible de mettre à jour ton compte." };
  }

  return { error: null };
}

/**
 * Remplace la liste des événements recommandés par l'utilisatrice. Les lignes
 * sont réinsérées telles quelles : la table est protégée par RLS, `user_id`
 * ne peut donc désigner qu'elle-même.
 */
export async function saveRecommendedEvents(
  supabase: SupabaseClient,
  user: User,
  eventIds: number[]
): Promise<{ error: string | null }> {
  if (eventIds.length === 0) {
    return { error: null };
  }

  const { error } = await supabase.from("user_recommended_events").upsert(
    eventIds.map((eventId) => ({ user_id: user.id, event_id: eventId })),
    { onConflict: "user_id,event_id", ignoreDuplicates: true }
  );

  return { error: error ? error.message || "Impossible d'enregistrer tes recommandations." : null };
}

export interface EventStoryDraft {
  eventId: number;
  /** Lien vers le récit publié ailleurs (Instagram, Strava, blog…). */
  storyUrl: string;
  /** Texte libre, pas encore saisi par le parcours mais prévu par la table. */
  story?: string;
}

/**
 * Le proto accepte un lien collé sans protocole (`instagram.com/p/…`) et le
 * complète : la contrainte `user_event_stories_url_shape` exige `http(s)://`.
 */
function normalizeStoryUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    // Seul le protocole est vérifié : c'est ce qu'exige la contrainte en base.
    // Exiger un point dans le nom d'hôte rejetait `localhost:3000` et, plus
    // largement, refusait de coller une adresse pour une raison que le champ
    // n'annonce pas. Le proto, lui, préfixe et accepte.
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, EVENT_STORY_URL_MAX_LENGTH);
  } catch {
    return null;
  }
}

/**
 * Enregistre le récit proposé à la dernière étape du parcours. Un récit sans
 * lien ni texte n'est pas écrit : la table le refuse, et ne rien partager n'est
 * pas une donnée à conserver.
 */
export async function saveEventStory(
  supabase: SupabaseClient,
  user: User,
  draft: EventStoryDraft
): Promise<{ error: string | null; saved: boolean }> {
  const story = draft.story?.trim().slice(0, EVENT_STORY_MAX_LENGTH) || null;
  const rawUrl = draft.storyUrl.trim();
  const storyUrl = normalizeStoryUrl(rawUrl);

  if (rawUrl && !storyUrl) {
    return { error: "Ce lien ne semble pas valide. Colle l'adresse complète de ton récit.", saved: false };
  }

  if (!storyUrl && !story) {
    return { error: null, saved: false };
  }

  const { error } = await supabase.from("user_event_stories").upsert(
    {
      user_id: user.id,
      event_id: draft.eventId,
      story_url: storyUrl,
      story,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,event_id" }
  );

  return {
    error: error ? error.message || "Impossible d'enregistrer ton récit." : null,
    saved: !error,
  };
}

/**
 * Parmi `eventIds`, ceux qui ont déjà un récit — de n'importe qui. Le parcours
 * s'en sert pour ne proposer que l'événement encore sans récit. En cas d'échec
 * (fonction pas encore déployée, réseau), on répond « aucun » : proposer un
 * récit de trop vaut mieux que casser la fin du parcours.
 */
export async function fetchEventsWithStories(
  supabase: SupabaseClient,
  eventIds: number[]
): Promise<Set<number>> {
  if (eventIds.length === 0) return new Set();

  const { data, error } = await supabase.rpc("get_events_with_stories", {
    p_event_ids: eventIds,
  });

  if (error || !data) return new Set();

  return new Set((data as { event_id: number }[]).map((row) => row.event_id));
}
