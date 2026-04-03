"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/assert-admin";

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
  revalidatePath("/");
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
  revalidatePath("/");
}

export async function deleteCollection(id: string) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("is_auto", false); // Prevent deleting auto collections

  if (error) throw new Error(error.message);
  revalidatePath("/");
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
  revalidatePath("/");
}

export async function removeEventFromCollection(collectionId: string, eventId: number) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collection_events")
    .delete()
    .eq("collection_id", collectionId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function toggleCollectionActive(id: string, isActive: boolean) {
  const { supabase } = await assertAdmin();

  const { error } = await supabase
    .from("collections")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
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

  revalidatePath("/");
}

export async function reorderCollections(orderedIds: string[]) {
  const { supabase } = await assertAdmin();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("collections")
      .update({ order: i })
      .eq("id", orderedIds[i]);
  }

  revalidatePath("/");
}
