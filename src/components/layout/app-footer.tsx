const TERMS_URL =
  "https://www.upcomi.cc/conditions-generales-dutilisation-cgu";
const PRIVACY_URL = "https://www.upcomi.cc/politique-de-confidentialite";

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full shrink-0 border-t border-white/55 bg-white/45 px-4 py-4 backdrop-blur-md md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-center text-[12px] text-foreground/55 sm:flex-row sm:text-left">
        <p>© {currentYear} Upcomi. Tous droits réservés.</p>
        <nav
          aria-label="Informations légales"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end"
        >
          <a
            href={TERMS_URL}
            className="transition-colors hover:text-coral"
          >
            Conditions générales d&apos;utilisation
          </a>
          <a
            href={PRIVACY_URL}
            className="transition-colors hover:text-coral"
          >
            Politique de confidentialité
          </a>
        </nav>
      </div>
    </footer>
  );
}
