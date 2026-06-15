"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type EventProposalResult =
  | { ok: true }
  | { ok: false; message: string };

const genericSubmissionError =
  "Impossible d'envoyer la proposition pour le moment. Réessaie dans quelques instants.";

function proposalError(message: string): EventProposalResult {
  return { ok: false, message };
}

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getRequiredText(formData: FormData, name: string, label: string, maxLength: number) {
  const value = getText(formData, name);
  if (!value) {
    throw new Error(`${label} est requis.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} est trop long.`);
  }
  return value;
}

function getRequiredDate(formData: FormData, name: string, label: string) {
  const value = getRequiredText(formData, name, label, 32);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} est invalide.`);
  }
  return value;
}

function getRequiredHttpUrl(formData: FormData, name: string, label: string) {
  const value = getRequiredText(formData, name, label, 500);
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} doit être une URL valide.`);
  }
  return value;
}

function assertDateOrder(dateEvent: string, dateFin: string, dateInscription: string, clotureInscription: string) {
  if (dateFin < dateEvent) {
    throw new Error("La date de fin doit être après la date de début.");
  }
  if (clotureInscription < dateInscription) {
    throw new Error("La clôture des inscriptions doit être après l'ouverture.");
  }
  if (clotureInscription > dateEvent) {
    throw new Error("La clôture des inscriptions doit être avant le début de l'événement.");
  }
}

function getRequiredEmail(formData: FormData) {
  const email = getRequiredText(formData, "contact_email", "L'email de contact", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L'email de contact est invalide.");
  }
  return email;
}

export async function submitEventProposal(formData: FormData): Promise<EventProposalResult> {
  try {
    if (getText(formData, "company_url")) {
      return { ok: true };
    }

    const contactName = getRequiredText(formData, "contact_name", "Le nom de contact", 160);
    const contactEmail = getRequiredEmail(formData);
    const departureAddress = getRequiredText(formData, "departure_address", "L'adresse de départ", 240);
    const departurePostalCode = getRequiredText(formData, "departure_postal_code", "Le code postal de départ", 32);
    const departureCity = getRequiredText(formData, "villeDepart", "La ville de départ", 120);
    const departureCountry = getRequiredText(formData, "paysDepart", "Le pays de départ", 120);
    const dateEvent = getRequiredDate(formData, "dateEvent", "La date de début");
    const dateFin = getRequiredDate(formData, "dateFin", "La date de fin");
    const dateInscription = getRequiredDate(formData, "dateInscription", "La date d'ouverture des inscriptions");
    const clotureInscription = getRequiredDate(formData, "clotureInscription", "La date de clôture des inscriptions");

    assertDateOrder(dateEvent, dateFin, dateInscription, clotureInscription);

    const payload = {
      nomEvent: getRequiredText(formData, "nomEvent", "Le nom de l'événement", 180),
      type_event: getRequiredText(formData, "type_event", "Le type d'événement", 80),
      bike_type: getRequiredText(formData, "bike_type", "Le type de vélo", 120),
      distance: getRequiredText(formData, "distance", "La distance", 120),
      description: getRequiredText(formData, "description", "La description", 4000),
      image: getRequiredHttpUrl(formData, "image", "L'image"),
      dateEvent,
      dateFin,
      villeDepart: departureCity,
      paysDepart: departureCountry,
      region: getRequiredText(formData, "region", "La région", 120),
      budget: getRequiredText(formData, "budget", "Le budget", 80),
      dateInscription,
      clotureInscription,
      URL: getRequiredHttpUrl(formData, "URL", "Le site de l'événement"),
      organisateur: getRequiredText(formData, "organisateur", "L'organisateur", 180),
      inscriptions_ouvertes: formData.has("inscriptions_ouvertes"),
      Dotwatching: formData.has("Dotwatching"),
      mint: formData.has("mint"),
      verifie: false,
      notified: false,
      tag: false,
    };

    const supabase = createAdminClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (eventError || !event?.id) {
      console.error("Event proposal insert failed", eventError);
      return proposalError(genericSubmissionError);
    }

    const eventId = Number(event.id);
    const { error: contactError } = await supabase
      .from("event_submission_contacts")
      .insert({
        event_id: eventId,
        contact_name: contactName,
        contact_email: contactEmail,
        departure_address: departureAddress,
        departure_postal_code: departurePostalCode,
        departure_city: departureCity,
        departure_country: departureCountry,
      });

    if (contactError) {
      console.error("Event proposal contact insert failed", contactError);
      await supabase.from("events").delete().eq("id", eventId);
      return proposalError(genericSubmissionError);
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/event/[slug]", "page");
    revalidatePath("/sitemap.xml");

    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return proposalError(error.message);
    }
    console.error("Unexpected event proposal error", error);
    return proposalError(genericSubmissionError);
  }
}
