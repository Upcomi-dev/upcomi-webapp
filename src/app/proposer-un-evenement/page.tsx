import type { Metadata } from "next";
import Link from "next/link";
import { EventProposalForm } from "@/components/events/event-proposal-form";
import { TopNav } from "@/components/layout/top-nav";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Proposer un événement",
  description: "Proposez un événement vélo à ajouter sur Upcomi.",
  alternates: {
    canonical: "/proposer-un-evenement",
  },
};

export default async function ProposerUnEvenementPage() {
  const supabase = createAdminClient();
  const { data: organizerRows } = await supabase
    .from("organisateurs")
    .select("nom_orga")
    .not("nom_orga", "is", null)
    .order("nom_orga", { ascending: true });
  const seenOrganizers = new Set<string>();
  const organizers = (organizerRows ?? [])
    .map((row) => (typeof row.nom_orga === "string" ? row.nom_orga.trim() : ""))
    .filter((name) => {
      const key = name.toLocaleLowerCase("fr-FR");
      if (!name || seenOrganizers.has(key)) return false;
      seenOrganizers.add(key);
      return true;
    });

  return (
    <div className="min-h-screen bg-[#f5efe6]">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <Link
          href="/"
          className="glass mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-foreground/55 transition-all hover:bg-white/80 hover:text-coral"
        >
          ← Retour à la carte
        </Link>

        <section className="mb-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
            Organisateurs
          </p>
          <h1 className="mt-2 font-serif text-[38px] leading-tight text-foreground md:text-[48px]">
            Proposer un événement
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-foreground/62">
            Renseigne les informations de l&apos;événement. Il sera publié après validation par l’équipe Upcomi.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,239,228,0.9))] p-5 shadow-[var(--shadow-sm)] md:p-6">
          <EventProposalForm organizers={organizers} />
        </section>
      </main>
    </div>
  );
}
