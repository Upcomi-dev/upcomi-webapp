import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminCollectionsClient } from "@/components/admin/admin-collections-client";

export default async function AdminPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  // Check admin
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!adminRecord) {
    return (
      <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
        <p className="font-serif text-xl text-foreground">Accès refusé</p>
        <p className="mt-2 text-sm text-foreground/55">
          Vous n&apos;avez pas les droits administrateur.
        </p>
      </div>
    );
  }

  // Fetch collections with event counts
  const { data: collections } = await supabase
    .from("collections")
    .select("*, collection_events(event_id)")
    .order("order", { ascending: true });

  // Fetch all events for the search/add feature
  const { data: allEvents } = await supabase
    .from("events")
    .select("id, nomEvent, dateEvent, type_event, villeDepart")
    .order("dateEvent", { ascending: true });

  const collectionsWithCounts = (collections || []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | null,
    order: c.order as number,
    is_auto: c.is_auto as boolean,
    is_active: (c.is_active ?? false) as boolean,
    auto_type: c.auto_type as string | null,
    eventCount: Array.isArray(c.collection_events) ? c.collection_events.length : 0,
    eventIds: Array.isArray(c.collection_events)
      ? (c.collection_events as { event_id: number }[]).map((ce) => ce.event_id)
      : [],
  }));

  const eventsList = (allEvents || []).map((e) => ({
    id: e.id as number,
    name: (e.nomEvent || "Sans nom") as string,
    date: e.dateEvent as string | null,
    type: e.type_event as string | null,
    city: e.villeDepart as string | null,
  }));

  return (
    <AdminCollectionsClient
      collections={collectionsWithCounts}
      events={eventsList}
    />
  );
}
