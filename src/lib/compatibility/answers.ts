import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ITINERARY_QUESTION_KEY, type CompatAnswers } from "@/lib/compatibility/questions";

/**
 * Lecture et écriture des réponses au questionnaire d'adéquation.
 *
 * Le profil est **global**, pas par évènement : on répond une fois, et le
 * résultat se rejoue sur chaque fiche. Seule la question « itinéraire » est
 * propre à l'évènement en cours et n'est jamais enregistrée.
 */

interface AnswerRow {
  question_key: string;
  answer_value: string;
}

export async function fetchCompatAnswers(
  supabase: SupabaseClient,
  user: User
): Promise<CompatAnswers | null> {
  const { data, error } = await supabase
    .from("user_compatibility_answers")
    .select("question_key, answer_value")
    .eq("user_id", user.id);

  if (error || !data || data.length === 0) return null;

  return Object.fromEntries(
    (data as AnswerRow[]).map((row) => [row.question_key, row.answer_value])
  );
}

export async function saveCompatAnswers(
  supabase: SupabaseClient,
  user: User,
  answers: CompatAnswers
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const rows = Object.entries(answers)
    .filter(([key, value]) => key !== ITINERARY_QUESTION_KEY && Boolean(value))
    .map(([question_key, answer_value]) => ({
      user_id: user.id,
      question_key,
      answer_value,
      updated_at: now,
    }));

  if (rows.length === 0) return { error: null };

  const { error } = await supabase
    .from("user_compatibility_answers")
    .upsert(rows, { onConflict: "user_id,question_key" });

  return {
    error: error ? error.message || "Impossible d'enregistrer tes réponses." : null,
  };
}

/**
 * « Recommencer » repart vraiment de zéro : sans effacer, les anciennes
 * réponses reviendraient au prochain chargement de la fiche.
 */
export async function clearCompatAnswers(
  supabase: SupabaseClient,
  user: User
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_compatibility_answers")
    .delete()
    .eq("user_id", user.id);

  return { error: error ? error.message || "Impossible d'effacer tes réponses." : null };
}
