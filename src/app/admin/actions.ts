"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateAdminViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getRequiredText(formData: FormData, name: string, label: string) {
  const value = getText(formData, name);
  if (!value) {
    throw new Error(`${label} est requis.`);
  }
  return value;
}

function getNullableText(formData: FormData, name: string) {
  const value = getText(formData, name);
  return value ? value : null;
}

function getBoolean(formData: FormData, name: string) {
  return formData.has(name);
}

function getNullableNumber(formData: FormData, name: string) {
  const value = getText(formData, name);
  if (!value) return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`La valeur de ${name} est invalide.`);
  }

  return parsed;
}

function getNullableDate(formData: FormData, name: string) {
  const value = getText(formData, name);
  return value ? value : null;
}

function getNullableTimestamp(formData: FormData, name: string) {
  const value = getText(formData, name);
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`La date de ${name} est invalide.`);
  }

  return parsed.toISOString();
}

function getNullableStringArray(formData: FormData, name: string) {
  const value = getText(formData, name);
  if (!value) return null;

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

function buildEventPayload(formData: FormData) {
  return {
    nomEvent: getRequiredText(formData, "nomEvent", "Le nom de l'événement"),
    dateEvent: getNullableDate(formData, "dateEvent"),
    dateEvent2: getNullableText(formData, "dateEvent2"),
    dateEventLongue: getNullableText(formData, "dateEventLongue"),
    dateFin: getNullableDate(formData, "dateFin"),
    villeDepart: getNullableText(formData, "villeDepart"),
    paysDepart: getNullableText(formData, "paysDepart"),
    dateInscription: getNullableDate(formData, "dateInscription"),
    inscriptions_ouvertes: getBoolean(formData, "inscriptions_ouvertes"),
    clotureInscription: getNullableDate(formData, "clotureInscription"),
    nb_sousEvents: getNullableNumber(formData, "nb_sousEvents"),
    URL: getNullableText(formData, "URL"),
    description: getNullableText(formData, "description"),
    organisateur: getNullableText(formData, "organisateur"),
    image: getNullableText(formData, "image"),
    bike_type: getNullableText(formData, "bike_type"),
    distance: getNullableText(formData, "distance"),
    ["catégorie"]: getNullableText(formData, "categorie"),
    distance_range: getNullableText(formData, "distance_range"),
    distance_range_filter: getNullableText(formData, "distance_range_filter"),
    sous_event1: getNullableText(formData, "sous_event1"),
    sous_event2: getNullableText(formData, "sous_event2"),
    url_tracking: getNullableText(formData, "url_tracking"),
    tag: getBoolean(formData, "tag"),
    nature_tag: getNullableText(formData, "nature_tag"),
    Dotwatching: getBoolean(formData, "Dotwatching"),
    type_event: getNullableText(formData, "type_event"),
    region: getNullableText(formData, "region"),
    budget: getNullableText(formData, "budget"),
    verifie: getBoolean(formData, "verifie"),
    AlaUne: getNullableNumber(formData, "AlaUne"),
    notified: getBoolean(formData, "notified"),
    mint: getBoolean(formData, "mint"),
    latitude: getNullableNumber(formData, "latitude"),
    longitude: getNullableNumber(formData, "longitude"),
  };
}

function buildUserPayload(formData: FormData) {
  return {
    email: getRequiredText(formData, "email", "L'email"),
    name: getNullableText(formData, "name"),
    surname: getNullableText(formData, "surname"),
    avatar_url: getNullableText(formData, "avatar_url"),
    ville: getNullableText(formData, "ville"),
    gender: getNullableText(formData, "gender"),
    pref1: getNullableStringArray(formData, "pref1"),
    pref2: getNullableText(formData, "pref2"),
    pref3: getNullableText(formData, "pref3"),
    premium: getBoolean(formData, "premium"),
    store: getNullableText(formData, "store"),
    product_id: getNullableText(formData, "product_id"),
    revenuecat_id: getNullableText(formData, "revenuecat_id"),
    selection_count: getNullableNumber(formData, "selection_count"),
    billing_issue: getBoolean(formData, "billing_issue"),
    subscription_paused: getBoolean(formData, "subscription_paused"),
    subscription_expires_at: getNullableTimestamp(formData, "subscription_expires_at"),
    grace_period_expires_at: getNullableTimestamp(formData, "grace_period_expires_at"),
    auto_resume_at: getNullableTimestamp(formData, "auto_resume_at"),
    cancel_reason: getNullableText(formData, "cancel_reason"),
    expiration_reason: getNullableText(formData, "expiration_reason"),
    fcm_token: getNullableText(formData, "fcm_token"),
    fcm_last_date: getNullableTimestamp(formData, "fcm_last_date"),
  };
}

function buildAuthMetadata(name: string | null, surname: string | null, existing: Record<string, unknown> = {}) {
  const firstName = name ?? "";
  const lastName = surname ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    ...existing,
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    full_name: fullName,
  };
}

export async function createCollection(formData: FormData) {
  const { supabase } = await assertAdmin();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  const { data: maxOrder } = await supabase
    .from("collections")
    .select("order")
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("collections").insert({
    name,
    description,
    order: (maxOrder?.order ?? -1) + 1,
    is_auto: false,
    auto_type: null,
  });

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function updateCollection(id: string, formData: FormData) {
  const { supabase } = await assertAdmin();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  const { error } = await supabase
    .from("collections")
    .update({ name, description })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function deleteCollection(id: string) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("is_auto", false); // Prevent deleting auto collections

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function addEventToCollection(collectionId: string, eventId: number) {
  const { supabase } = await assertAdmin();

  const { data: maxOrder } = await supabase
    .from("collection_events")
    .select("order")
    .eq("collection_id", collectionId)
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("collection_events").insert({
    collection_id: collectionId,
    event_id: eventId,
    order: (maxOrder?.order ?? -1) + 1,
  });

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function removeEventFromCollection(collectionId: string, eventId: number) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collection_events")
    .delete()
    .eq("collection_id", collectionId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function toggleCollectionActive(id: string, isActive: boolean) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collections")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function reorderEventsInCollection(collectionId: string, orderedEventIds: number[]) {
  const { supabase } = await assertAdmin();

  for (let i = 0; i < orderedEventIds.length; i++) {
    await supabase
      .from("collection_events")
      .update({ order: i })
      .eq("collection_id", collectionId)
      .eq("event_id", orderedEventIds[i]);
  }

  revalidateAdminViews();
}

export async function reorderCollections(orderedIds: string[]) {
  const { supabase } = await assertAdmin();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("collections")
      .update({ order: i })
      .eq("id", orderedIds[i]);
  }

  revalidateAdminViews();
}

export async function createEvent(formData: FormData) {
  const { supabase } = await assertAdmin();
  const payload = buildEventPayload(formData);

  const { error } = await supabase.from("events").insert(payload);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function updateEvent(id: number, formData: FormData) {
  const { supabase } = await assertAdmin();
  const payload = buildEventPayload(formData);

  const { error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function deleteEvent(id: number) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}

export async function createAdminUser(formData: FormData) {
  const { supabase } = await assertAdmin();
  const adminSupabase = createAdminClient();
  const password = getRequiredText(formData, "password", "Le mot de passe");
  const payload = buildUserPayload(formData);

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: payload.email,
    password,
    email_confirm: true,
    user_metadata: buildAuthMetadata(payload.name, payload.surname),
  });

  if (error) throw new Error(error.message);

  const createdUserId = data.user?.id;
  if (!createdUserId) {
    throw new Error("Impossible de récupérer l'utilisateur créé.");
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("uid", createdUserId);

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(createdUserId);
    throw new Error(profileError.message);
  }

  revalidateAdminViews();
}

export async function updateAdminUser(uid: string, formData: FormData) {
  const { supabase } = await assertAdmin();
  const adminSupabase = createAdminClient();
  const payload = buildUserPayload(formData);
  const password = getText(formData, "password");

  const { data: existingAuthUser, error: existingAuthError } = await adminSupabase.auth.admin.getUserById(uid);
  if (existingAuthError) throw new Error(existingAuthError.message);

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(uid, {
    email: payload.email,
    ...(password ? { password } : {}),
    email_confirm: true,
    user_metadata: buildAuthMetadata(
      payload.name,
      payload.surname,
      (existingAuthUser.user?.user_metadata ?? {}) as Record<string, unknown>
    ),
  });

  if (authError) throw new Error(authError.message);

  const { error: profileError } = await supabase
    .from("users")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("uid", uid);

  if (profileError) throw new Error(profileError.message);
  revalidateAdminViews();
}

export async function deleteAdminUser(uid: string) {
  const { user, supabase } = await assertAdmin();
  const adminSupabase = createAdminClient();

  if (user.id === uid) {
    throw new Error("Un admin ne peut pas supprimer son propre compte depuis cette interface.");
  }

  const { error: publicProfileError } = await supabase
    .from("user_public")
    .delete()
    .eq("uid", uid);

  if (publicProfileError) throw new Error(publicProfileError.message);

  const { error } = await adminSupabase.auth.admin.deleteUser(uid);

  if (error) throw new Error(error.message);
  revalidateAdminViews();
}
