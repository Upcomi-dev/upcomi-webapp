"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getUniqueEventSlug, isDuplicateEventSlugError } from "@/lib/events/slugs";
import { buildSupabasePublicStorageUrl } from "@/lib/storage/urls";
import { createAdminClient } from "@/lib/supabase/admin";

type EventProposalResult = { ok: true } | { ok: false; message: string };
type RouteProposal = {
  name: string | null;
  eventType: string;
  bikeType: string;
  distance: number;
  elevation: number | null;
  price: number;
  fixedTrack: boolean;
  delay: string | null;
};

const EVENT_TYPES = new Set(["Social Ride", "Aventure", "Brevet", "Course", "Ultra", "Événement", "Autre"]);
const BIKE_TYPES = new Set(["Route", "Gravel", "VTT"]);
const IMAGE_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const STORAGE_BUCKET = "upcomi";
const genericSubmissionError = "Impossible d'envoyer la proposition pour le moment. Réessaie dans quelques instants.";

function proposalError(message: string): EventProposalResult { return { ok: false, message }; }
function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
function getRequiredText(formData: FormData, name: string, label: string, maxLength: number) {
  const value = getText(formData, name);
  if (!value) throw new Error(`${label} est requis.`);
  if (value.length > maxLength) throw new Error(`${label} est trop long.`);
  return value;
}
function getOptionalText(formData: FormData, name: string, label: string, maxLength: number) {
  const value = getText(formData, name);
  if (value.length > maxLength) throw new Error(`${label} est trop long.`);
  return value || null;
}
function getRequiredDate(formData: FormData, name: string, label: string) {
  const value = getRequiredText(formData, name, label, 32);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} est invalide.`);
  return value;
}
function getOptionalDate(formData: FormData, name: string, label: string) {
  const value = getText(formData, name);
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} est invalide.`);
  return value;
}
function getOptionalHttpUrl(formData: FormData) {
  const value = getOptionalText(formData, "URL", "Le site ou la page Instagram", 500);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error();
  } catch { throw new Error("Le site ou la page Instagram doit être une URL valide."); }
  return value;
}
function getRequiredEmail(formData: FormData) {
  const email = getRequiredText(formData, "contact_email", "L'email de contact", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("L'email de contact est invalide.");
  return email;
}
function getRoutes(formData: FormData): RouteProposal[] {
  const routeIds = formData.getAll("route_id");
  const names = formData.getAll("route_name");
  const eventTypes = formData.getAll("route_type_event");
  const bikeTypes = formData.getAll("route_bike_type");
  const distances = formData.getAll("route_distance");
  const elevations = formData.getAll("route_elevation");
  const prices = formData.getAll("route_price");
  const delays = formData.getAll("route_delay");
  const fixedRouteIds = new Set(formData.getAll("route_trace_fixe").filter((value): value is string => typeof value === "string"));
  const fieldGroups = [names, eventTypes, bikeTypes, distances, elevations, prices, delays];
  if (routeIds.length === 0 || fieldGroups.some((values) => values.length !== routeIds.length)) throw new Error("Ajoutez au moins un parcours complet.");
  if (distances.length > 50) throw new Error("Un événement ne peut pas contenir plus de 50 parcours.");
  return distances.map((rawDistance, index) => {
    const routeId = routeIds[index];
    if (typeof routeId !== "string" || !/^\d+$/.test(routeId)) throw new Error(`Le parcours ${index + 1} est invalide.`);
    const selectedEventType = eventTypes[index];
    if (typeof selectedEventType !== "string" || !EVENT_TYPES.has(selectedEventType)) throw new Error(`Le type d'événement du parcours ${index + 1} est invalide.`);
    const eventType = selectedEventType === "Autre"
      ? getRequiredText(formData, `route_type_other_${routeId}`, `Le type personnalisé du parcours ${index + 1}`, 80)
      : selectedEventType;
    const bikeType = bikeTypes[index];
    if (typeof bikeType !== "string" || !BIKE_TYPES.has(bikeType)) throw new Error(`Le type de vélo du parcours ${index + 1} est invalide.`);
    const distance = typeof rawDistance === "string" ? Number(rawDistance) : NaN;
    const rawElevation = elevations[index];
    const elevation = typeof rawElevation === "string" && rawElevation !== "" ? Number(rawElevation) : null;
    const rawPrice = prices[index];
    const price = typeof rawPrice === "string" ? Number(rawPrice) : NaN;
    if (!Number.isSafeInteger(distance) || distance <= 0) throw new Error(`La distance du parcours ${index + 1} doit être un nombre entier positif.`);
    if (elevation !== null && (!Number.isSafeInteger(elevation) || elevation < 0)) throw new Error(`Le dénivelé du parcours ${index + 1} est invalide.`);
    if (typeof rawPrice !== "string" || !/^\d+$/.test(rawPrice) || !Number.isSafeInteger(price) || price < 0) {
      throw new Error(`Le prix du parcours ${index + 1} est invalide.`);
    }
    const rawName = names[index];
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (name.length > 180) throw new Error(`Le nom du parcours ${index + 1} est trop long.`);
    const rawDelay = delays[index];
    const delay = typeof rawDelay === "string" ? rawDelay.trim() : "";
    if (delay.length > 120) throw new Error(`Le délai du parcours ${index + 1} est trop long.`);
    return { name: name || null, eventType, bikeType, distance, elevation, price, fixedTrack: fixedRouteIds.has(routeId), delay: delay || null };
  });
}
async function getImage(formData: FormData) {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return null;
  const extension = IMAGE_TYPES.get(image.type);
  if (!extension) throw new Error("L'image doit être au format JPEG, PNG ou WebP.");
  if (image.size > MAX_IMAGE_SIZE) throw new Error("L'image ne doit pas dépasser 6 Mo.");

  const header = new Uint8Array(await image.slice(0, 12).arrayBuffer());
  const isJpeg = image.type === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = image.type === "image/png" && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte);
  const isWebp = image.type === "image/webp"
    && String.fromCharCode(...header.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw new Error("Le contenu du fichier image est invalide.");
  return { image, extension };
}

function getDistanceFilterValues(distances: number[]) {
  const values = new Set<string>();
  for (const distance of distances) {
    if (distance < 200) values.add("Moins de 200km");
    else if (distance <= 500) values.add("Entre 200 et 500km");
    else if (distance <= 1000) values.add("Entre 500 et 1000km");
    else values.add("Plus de 1000km");
  }
  return [...values].join(", ");
}

export async function submitEventProposal(formData: FormData): Promise<EventProposalResult> {
  let uploadedImagePath: string | null = null;
  let createdEventId: number | null = null;
  const supabase = createAdminClient();

  try {
    if (getText(formData, "company_url")) return { ok: true };

    const contactName = getOptionalText(formData, "contact_name", "Le nom de contact", 160);
    const contactEmail = getRequiredEmail(formData);
    const departureCity = getRequiredText(formData, "villeDepart", "La ville de départ", 120);
    const departureCountry = getOptionalText(formData, "paysDepart", "Le pays de départ", 120);
    const dateEvent = getRequiredDate(formData, "dateEvent", "La date de début");
    const dateFin = getOptionalDate(formData, "dateFin", "La date de fin");
    if (dateFin && dateFin < dateEvent) throw new Error("La date de fin doit être après la date de début.");

    const routes = getRoutes(formData);
    const eventType = [...new Set(routes.map((route) => route.eventType))].join(", ");
    const bikeType = [...new Set(routes.map((route) => route.bikeType))].join(", ");
    const eventName = getRequiredText(formData, "nomEvent", "Le nom de l'événement", 180);
    const organizerInput = getRequiredText(formData, "organisateur", "L'organisateur", 180);
    const description = getRequiredText(formData, "description", "La description", 4000);
    const eventUrl = getOptionalHttpUrl(formData);
    let slug = await getUniqueEventSlug(supabase, eventName);
    const imageData = await getImage(formData);

    const { data: organizerName, error: organizerError } = await supabase.rpc("ensure_organisateur", { organizer_name: organizerInput });
    if (organizerError || typeof organizerName !== "string") {
      console.error("Organizer creation failed", organizerError);
      return proposalError(genericSubmissionError);
    }

    let imageUrl: string | null = null;
    if (imageData) {
      uploadedImagePath = `events/proposals/${slug}-${randomUUID()}.${imageData.extension}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(uploadedImagePath, imageData.image, { contentType: imageData.image.type, upsert: false });
      if (uploadError) {
        console.error("Event proposal image upload failed", uploadError);
        return proposalError("Impossible d'envoyer l'image pour le moment. Réessaie dans quelques instants.");
      }
      imageUrl = buildSupabasePublicStorageUrl(STORAGE_BUCKET, uploadedImagePath);
      if (!imageUrl) throw new Error(genericSubmissionError);
    }

    const sortedDistances = routes.map((route) => route.distance).sort((a, b) => a - b);
    const distanceSummary = sortedDistances.length === 1
      ? `${sortedDistances[0]} km`
      : `${sortedDistances.join(" / ")} km`;
    const distanceRange = sortedDistances.length === 1
      ? `${sortedDistances[0]} km`
      : `${sortedDistances[0]}-${sortedDistances[sortedDistances.length - 1]} km`;

    let event: { id: number } | null = null;
    let eventError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabase.from("events").insert({
      nomEvent: eventName,
      slug,
      type_event: eventType,
      bike_type: bikeType,
      distance: distanceSummary,
      distance_range: distanceRange,
      distance_range_filter: getDistanceFilterValues(sortedDistances),
      description,
      image: imageUrl,
      dateEvent,
      dateFin,
      villeDepart: departureCity,
      paysDepart: departureCountry,
      region: null,
      budget: null,
      dateInscription: null,
      clotureInscription: null,
      URL: eventUrl,
      organisateur: organizerName,
      nb_sousEvents: routes.length,
      inscriptions_ouvertes: false,
      Dotwatching: false,
      mint: formData.has("mint"),
      verifie: false,
      notified: false,
      tag: false,
      } as never).select("id").single();

      if (!result.error && result.data?.id) {
        event = result.data as { id: number };
        eventError = null;
        break;
      }
      eventError = result.error;
      if (!isDuplicateEventSlugError(result.error)) break;
      slug = await getUniqueEventSlug(supabase, eventName);
    }

    if (eventError || !event?.id) {
      console.error("Event proposal insert failed", eventError);
      return proposalError(genericSubmissionError);
    }
    createdEventId = Number(event.id);

    const { error: routesError } = await supabase.from("sous_events").insert(routes.map((route) => ({
      event_id: createdEventId,
      event_name: eventName,
      nom: route.name ?? `${route.distance} km`,
      bikeType: route.bikeType,
      distance: route.distance,
      elevation: route.elevation,
      prix: route.price,
      trace_fixe: route.fixedTrack,
      typeEvent: route.eventType,
      delai: route.delay,
    })) as never);
    if (routesError) {
      console.error("Event proposal routes insert failed", routesError);
      return proposalError(genericSubmissionError);
    }

    const { error: contactError } = await supabase.from("event_submission_contacts").insert({
      event_id: createdEventId,
      contact_name: contactName,
      contact_email: contactEmail,
      departure_city: departureCity,
      departure_address: null,
      departure_postal_code: null,
      departure_country: departureCountry,
    } as never);
    if (contactError) {
      console.error("Event proposal contact insert failed", contactError);
      return proposalError(genericSubmissionError);
    }

    createdEventId = null;
    uploadedImagePath = null;
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/event/[slug]", "page");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) return proposalError(error.message);
    console.error("Unexpected event proposal error", error);
    return proposalError(genericSubmissionError);
  } finally {
    if (createdEventId != null) {
      const { error } = await supabase.from("events").delete().eq("id", createdEventId);
      if (error) {
        console.error("Event proposal rollback failed", error);
        uploadedImagePath = null;
      }
    }
    if (uploadedImagePath) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([uploadedImagePath]);
      if (error) console.error("Event proposal image rollback failed", error);
    }
  }
}
