import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppFooter } from "@/components/layout/app-footer";
import { TopNav } from "@/components/layout/top-nav";
import { getCanonicalUrl } from "@/lib/seo";
import { getLocalDateKey } from "@/lib/utils/event-dates";
import type { RegistrationEvent } from "@/lib/utils/registration-calendar";
import { RegistrationCalendarClient } from "./registration-calendar-client";

export const revalidate = 300;

const REGISTRATION_EVENT_SELECT =
  "id, slug, nomEvent, dateEvent, dateFin, villeDepart, paysDepart, type_event, dateInscription";

const POPULAR_EVENTS_LIMIT = 10;

const PAGE_DESCRIPTION =
  "Retrouve en un coup d'œil les ouvertures d'inscription des prochains événements vélo.";

export const metadata: Metadata = {
  title: "Calendrier des inscriptions",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/calendrier-des-inscriptions" },
  openGraph: {
    title: "Calendrier des inscriptions",
    description: PAGE_DESCRIPTION,
    url: getCanonicalUrl("/calendrier-des-inscriptions"),
    type: "website",
  },
};

export default async function RegistrationCalendarPage() {
  const supabase = await createClient();
  const today = getLocalDateKey();

  const [eventsResult, popularResult] = await Promise.all([
    supabase
      .from("events")
      .select(REGISTRATION_EVENT_SELECT)
      .eq("verifie", true)
      .not("dateInscription", "is", null)
      // L'événement lui-même ne doit pas être passé.
      .or(`dateFin.gte.${today},and(dateFin.is.null,dateEvent.gte.${today})`)
      // Une inscription déjà close n'a plus sa place dans un calendrier
      // tourné vers les ouvertures à venir et en cours.
      .or(`clotureInscription.is.null,clotureInscription.gte.${today}`)
      .order("dateInscription", { ascending: true }),
    supabase.rpc("get_popular_events", { p_limit: POPULAR_EVENTS_LIMIT }),
  ]);

  const events = (eventsResult.data as RegistrationEvent[] | null) ?? [];
  const popularEventIds =
    (popularResult.data as { event_id: number }[] | null)?.map((row) => row.event_id) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />

      <div className="mx-auto w-full max-w-[980px] flex-1 px-4 pt-8 pb-12 md:px-6">
        <h1 className="font-serif text-[30px] leading-tight text-foreground md:text-[36px]">
          Calendrier des inscriptions
        </h1>
        <p className="mt-2 mb-7 max-w-[62ch] text-[15px] text-foreground/58">
          {PAGE_DESCRIPTION}
        </p>

        <RegistrationCalendarClient
          events={events}
          popularEventIds={popularEventIds}
          todayKey={today}
        />
      </div>

      <AppFooter />
    </div>
  );
}
