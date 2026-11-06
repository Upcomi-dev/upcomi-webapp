// Squelette affiché dans la popup (cf. layout.tsx) le temps que la fiche se charge.
export default function EventPopupLoading() {
  return (
    <div className="animate-pulse p-4 md:p-6" aria-busy="true">
      <div className="mb-5 h-[320px] rounded-[var(--radius)] bg-foreground/8" />
      <div className="mb-6 h-5 w-2/3 rounded-full bg-foreground/8" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded-full bg-foreground/6" />
        <div className="h-4 w-11/12 rounded-full bg-foreground/6" />
        <div className="h-4 w-4/5 rounded-full bg-foreground/6" />
      </div>
      <span className="sr-only">Chargement de l&apos;évènement…</span>
    </div>
  );
}
