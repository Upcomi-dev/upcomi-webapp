import Link from "next/link";
import { AdminFfveloClient } from "@/components/admin/admin-ffvelo-client";
import { requireAdmin } from "@/lib/auth/assert-admin";
import { getFfveloManifestations, type FfveloEvent } from "@/lib/ffvelo";

export default async function AdminFfveloPage() {
  await requireAdmin("/admin/ffvelo");

  let events: FfveloEvent[] | null = null;
  let error: string | null = null;
  try {
    events = await getFfveloManifestations();
  } catch (err) {
    error = err instanceof Error ? err.message : "Erreur inconnue";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(250,241,231,0.84))] p-6 shadow-[var(--shadow-md)]">
        <Link href="/admin" className="text-[13px] text-foreground/50 hover:text-foreground">
          ← Administration
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
          Source externe
        </p>
        <h2 className="mt-2 font-serif text-[32px] text-foreground">Manifestations FFVélo</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-foreground/62">
          Manifestations à venir publiées par la FFVélo, rafraîchies toutes les 12 h. Lecture seule :
          rien n&apos;est importé dans l&apos;app.
        </p>
      </section>

      {error ? (
        <p className="rounded-[22px] border border-coral/25 bg-coral/10 px-4 py-3 text-[14px] text-foreground">
          {error}
        </p>
      ) : (
        events && <AdminFfveloClient events={events} today={new Date().toISOString().slice(0, 10)} />
      )}
    </div>
  );
}
