"use server";

import { revalidatePath } from "next/cache";
import { isFeedbackKind } from "@/lib/feedback";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableText(formData: FormData, name: string) {
  const value = getText(formData, name);
  return value || null;
}

type FeedbackSubmissionResult =
  | { ok: true }
  | { ok: false; message: string };

const genericSubmissionError =
  "Impossible d'envoyer le retour pour le moment. Réessaie dans quelques instants.";

function feedbackError(message: string): FeedbackSubmissionResult {
  return { ok: false, message };
}

export async function submitFeedback(formData: FormData): Promise<FeedbackSubmissionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rawKind = getText(formData, "kind");
    if (!isFeedbackKind(rawKind)) {
      return feedbackError("Le type de retour est invalide.");
    }

    const subject = getText(formData, "subject");
    const message = getText(formData, "message");
    const contactName = getNullableText(formData, "contact_name");
    const fallbackEmail = getNullableText(formData, "contact_email");
    const pagePath = getNullableText(formData, "page_path");

    if (!subject) {
      return feedbackError("Le sujet est requis.");
    }

    if (!message) {
      return feedbackError("Le message est requis.");
    }

    const contactEmail = user?.email ?? fallbackEmail;
    if (!contactEmail) {
      return feedbackError("Connecte-toi ou renseigne un email de contact.");
    }

    let resolvedContactName = contactName;

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("name, surname")
        .eq("uid", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Feedback profile lookup failed", profileError);
      } else {
        const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ").trim();
        resolvedContactName = fullName || resolvedContactName;
      }
    }

    const { error } = await supabase.from("feedback_entries").insert({
      user_id: user?.id ?? null,
      kind: rawKind,
      subject,
      message,
      contact_name: resolvedContactName,
      contact_email: contactEmail,
      page_path: pagePath,
    });

    if (error) {
      console.error("Feedback submission failed", error);
      return feedbackError(genericSubmissionError);
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("Unexpected feedback submission error", error);
    return feedbackError(genericSubmissionError);
  }
}
