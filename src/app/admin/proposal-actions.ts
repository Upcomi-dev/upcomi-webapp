"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getUniqueEventSlug } from "@/lib/events/slugs";
import { buildSupabasePublicStorageUrl, parseSupabasePublicStorageUrl } from "@/lib/storage/urls";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProposalActionResult = { ok: true; message: string } | { ok: false; message: string };

type ReviewStatus = "pending" | "approved" | "rejected";
type RouteInput = {
  name: string;
  eventType: string;
  bikeType: string;
  distance: number;
  elevation: number | null;
  price: number;
  fixedTrack: boolean;
  delay: string;
};

const BIKE_TYPES = new Set(["Route", "Gravel", "VTT"]);
const IMAGE_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const STORAGE_BUCKET = "upcomi";

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function required(formData: FormData, name: string, label: string, max: number) {
  const value = getText(formData, name);
  if (!value) throw new Error(`${label} est requis.`);
  if (value.length > max) throw new Error(`${label} est trop long.`);
  return value;
}

function optional(formData: FormData, name: string, label: string, max: number) {
  const value = getText(formData, name);
  if (value.length > max) throw new Error(`${label} est trop long.`);
  return value;
}

function dateValue(formData: FormData, name: string, label: string, isRequired: boolean) {
  const value = getText(formData, name);
  if (!value && !isRequired) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${label} est invalide.`);
  }
  return value;
}

function httpUrl(formData: FormData) {
  const value = optional(formData, "URL", "Le site", 500);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("Le site doit être une URL HTTP(S) valide.");
  }
  return value;
}

function parseRoutes(formData: FormData): RouteInput[] {
  const ids = formData.getAll("route_id");
  const names = formData.getAll("route_name");
  const eventTypes = formData.getAll("route_type_event");
  const bikeTypes = formData.getAll("route_bike_type");
  const distances = formData.getAll("route_distance");
  const elevations = formData.getAll("route_elevation");
  const prices = formData.getAll("route_price");
  const delays = formData.getAll("route_delay");
  const fixed = new Set(formData.getAll("route_trace_fixe"));
  const fields = [names, eventTypes, bikeTypes, distances, elevations, prices, delays];
  if (ids.length === 0 || ids.length > 50 || fields.some((values) => values.length !== ids.length)) {
    throw new Error("Ajoutez entre 1 et 50 parcours complets.");
  }

  return ids.map((rawId, index) => {
    const id = typeof rawId === "string" ? rawId : "";
    const eventType = typeof eventTypes[index] === "string" ? eventTypes[index] : "";
    const bikeType = typeof bikeTypes[index] === "string" ? bikeTypes[index] : "";
    const distance = Number(distances[index]);
    const price = Number(prices[index]);
    const rawElevation = elevations[index];
    const elevation = typeof rawElevation === "string" && rawElevation !== "" ? Number(rawElevation) : null;
    if (!eventType || eventType.length > 80) throw new Error(`Le type du parcours ${index + 1} est invalide.`);
    if (!BIKE_TYPES.has(bikeType)) throw new Error(`Le vélo du parcours ${index + 1} est invalide.`);
    if (!Number.isSafeInteger(distance) || distance <= 0 || distance > 32767) throw new Error(`La distance du parcours ${index + 1} est invalide.`);
    if (!Number.isSafeInteger(price) || price < 0 || price > 32767) throw new Error(`Le prix du parcours ${index + 1} est invalide.`);
    if (elevation !== null && (!Number.isSafeInteger(elevation) || elevation < 0)) throw new Error(`Le dénivelé du parcours ${index + 1} est invalide.`);
    const name = typeof names[index] === "string" ? names[index].trim() : "";
    const delay = typeof delays[index] === "string" ? delays[index].trim() : "";
    if (name.length > 180 || delay.length > 120) throw new Error(`Le parcours ${index + 1} contient un texte trop long.`);
    return { name, eventType, bikeType, distance, elevation, price, fixedTrack: fixed.has(id), delay };
  });
}

async function parseImage(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = IMAGE_TYPES.get(file.type);
  if (!extension) throw new Error("L’image doit être au format JPEG, PNG ou WebP.");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("L’image ne doit pas dépasser 6 Mo.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = (file.type === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || (file.type === "image/png" && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => header[i] === byte))
    || (file.type === "image/webp" && String.fromCharCode(...header.slice(0, 4)) === "RIFF" && String.fromCharCode(...header.slice(8, 12)) === "WEBP");
  if (!valid) throw new Error("Le contenu du fichier image est invalide.");
  return { file, extension };
}

function distanceFilter(distances: number[]) {
  const values = new Set<string>();
  for (const distance of distances) {
    if (distance < 200) values.add("Moins de 200km");
    else if (distance <= 500) values.add("Entre 200 et 500km");
    else if (distance <= 1000) values.add("Entre 500 et 1000km");
    else values.add("Plus de 1000km");
  }
  return [...values].join(", ");
}

async function persistProposal(eventId: number, formData: FormData, status: ReviewStatus | null, reason: string | null) {
  const { user } = await assertAdmin();
  const admin = createAdminClient();
  const name = required(formData, "nomEvent", "Le nom", 180);
  const city = required(formData, "villeDepart", "La ville", 120);
  const description = required(formData, "description", "La description", 4000);
  const organizerInput = required(formData, "organisateur", "L’organisateur", 180);
  const startDate = dateValue(formData, "dateEvent", "La date de début", true);
  const endDate = dateValue(formData, "dateFin", "La date de fin", false);
  if (endDate && endDate < startDate) throw new Error("La date de fin doit être postérieure à la date de début.");
  const routes = parseRoutes(formData);
  if (status === "rejected" && !reason?.trim()) throw new Error("Le motif de refus est obligatoire.");

  const { data: current, error: currentError } = await admin.from("events").select("image").eq("id", eventId).single();
  if (currentError) throw new Error(currentError.message);
  const oldImage = typeof current.image === "string" ? current.image : "";
  const image = await parseImage(formData);
  const { data: organizer, error: organizerError } = await admin.rpc("ensure_organisateur", { organizer_name: organizerInput });
  if (organizerError || typeof organizer !== "string") throw new Error("Impossible d’enregistrer l’organisateur.");
  const slug = await getUniqueEventSlug(admin, name, eventId);
  let uploadedPath: string | null = null;
  let imageUrl = oldImage;

  try {
    if (image) {
      uploadedPath = `events/proposals/${slug}-${randomUUID()}.${image.extension}`;
      const { error } = await admin.storage.from(STORAGE_BUCKET).upload(uploadedPath, image.file, { contentType: image.file.type, upsert: false });
      if (error) throw new Error("Impossible d’envoyer la nouvelle image.");
      imageUrl = buildSupabasePublicStorageUrl(STORAGE_BUCKET, uploadedPath) ?? "";
    }

    const distances = routes.map((route) => route.distance).sort((a, b) => a - b);
    const summary = distances.length === 1 ? `${distances[0]} km` : `${distances.join(" / ")} km`;
    const range = distances.length === 1 ? `${distances[0]} km` : `${distances[0]}-${distances.at(-1)} km`;
    const eventPayload = {
      name, slug, startDate, endDate, city,
      country: optional(formData, "paysDepart", "Le pays", 120),
      description, url: httpUrl(formData), image: imageUrl, organizer,
      mint: formData.has("mint"),
      eventType: [...new Set(routes.map((route) => route.eventType))].join(", "),
      bikeType: [...new Set(routes.map((route) => route.bikeType))].join(", "),
      distance: summary, distanceRange: range, distanceFilter: distanceFilter(distances),
    };
    const { error } = await admin.rpc("save_event_proposal_review", {
      p_event_id: eventId,
      p_event: eventPayload,
      p_routes: routes,
      p_status: status,
      p_reason: reason,
      p_reviewer: user.id,
    } as never);
    if (error) throw new Error(error.message);

    if (image && oldImage) {
      const parsed = parseSupabasePublicStorageUrl(oldImage);
      if (parsed?.bucket === STORAGE_BUCKET) await admin.storage.from(STORAGE_BUCKET).remove([parsed.objectPath]);
    }
    uploadedPath = null;
  } finally {
    if (uploadedPath) await admin.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/event/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

async function run(action: () => Promise<void>, success: string): Promise<ProposalActionResult> {
  try {
    await action();
    return { ok: true, message: success };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Une erreur inattendue est survenue." };
  }
}

export async function saveEventProposal(eventId: number, formData: FormData) {
  return run(() => persistProposal(eventId, formData, null, null), "Modifications enregistrées.");
}

export async function approveEventProposal(eventId: number, formData: FormData) {
  return run(() => persistProposal(eventId, formData, "approved", null), "Proposition validée et publiée.");
}

export async function rejectEventProposal(eventId: number, formData: FormData) {
  const reason = getText(formData, "review_reason");
  return run(() => persistProposal(eventId, formData, "rejected", reason), "Proposition refusée et conservée.");
}

export async function reopenEventProposal(eventId: number, formData: FormData) {
  return run(() => persistProposal(eventId, formData, "pending", null), "Proposition remise en attente.");
}
