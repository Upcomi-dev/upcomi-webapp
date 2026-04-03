import { createClient } from "@/lib/supabase/server";
import type { MapEvent } from "@/lib/types/database";
import { MapPageClient } from "./map-page-client";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id, nomEvent, latitude, longitude, bike_type, type_event, dateEvent, image, distance_range_filter, region, budget, villeDepart, paysDepart"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Impossible de charger les événements
          </h1>
          <p className="mt-2 text-muted-foreground">Réessayez dans quelques instants.</p>
        </div>
      </div>
    );
  }

  return <MapPageClient initialEvents={(events as MapEvent[]) || []} />;
}
