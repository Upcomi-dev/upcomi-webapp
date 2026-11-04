import { TopNav } from "@/components/layout/top-nav";

// Affiché dès le clic sur un évènement, le temps que la fiche se charge.
export default function EventLoading() {
  return (
    <div className="flex min-h-screen flex-col" aria-busy="true">
      <TopNav />
      <div className="mx-auto w-full max-w-[1040px] flex-1 animate-pulse px-4 pt-8 md:px-6">
        <div className="mb-2 h-6 w-24 rounded-full bg-foreground/8" />
        <div className="mb-5 h-[320px] rounded-[var(--radius)] bg-foreground/8" />
        <div className="mb-6 h-5 w-2/3 rounded-full bg-foreground/8" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-full bg-foreground/6" />
          <div className="h-4 w-11/12 rounded-full bg-foreground/6" />
          <div className="h-4 w-4/5 rounded-full bg-foreground/6" />
        </div>
        <span className="sr-only">Chargement de l&apos;évènement…</span>
      </div>
    </div>
  );
}
