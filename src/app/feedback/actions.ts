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

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawKind = getText(formData, "kind");
  if (!isFeedbackKind(rawKind)) {
    throw new Error("Le type de retour est invalide.");
  }

  const subject = getText(formData, "subject");
  const message = getText(formData, "message");
  const contactName = getNullableText(formData, "contact_name");
  const fallbackEmail = getNullableText(formData, "contact_email");
  const pagePath = getNullableText(formData, "page_path");

  if (!subject) {
    throw new Error("Le sujet est requis.");
  }

  if (!message) {
    throw new Error("Le message est requis.");
  }

  const contactEmail = user?.email ?? fallbackEmail;
  if (!contactEmail) {
    throw new Error("Connecte-toi ou renseigne un email de contact.");
  }

  let resolvedContactName = contactName;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("name, surname")
      .eq("uid", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ").trim();
    resolvedContactName = fullName || resolvedContactName;
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
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}
