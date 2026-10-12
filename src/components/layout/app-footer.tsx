import { cn } from "@/lib/utils";

const TERMS_URL =
  "https://www.upcomi.cc/conditions-generales-dutilisation-cgu";
const PRIVACY_URL = "https://www.upcomi.cc/politique-de-confidentialite";

export function AppLegalInfo({
  variant = "footer",
}: {
  variant?: "footer" | "mobile-menu";
}) {
  const currentYear = new Date().getFullYear();
  const isMobileMenu = variant === "mobile-menu";

  return (
    <div
      className={cn(
        "flex text-foreground/55",
        isMobileMenu
          ? "flex-col items-start gap-2 text-left text-[11px]"
          : "mx-auto w-full max-w-7xl flex-col items-center justify-between gap-2 text-center text-[13px] sm:flex-row sm:text-left"
      )}
    >
      <p>© {currentYear} Upcomi. Tous droits réservés.</p>
      <nav
        aria-label="Informations légales"
        className={cn(
          "flex flex-wrap",
          isMobileMenu
            ? "flex-col items-start gap-1.5"
            : "items-center justify-center gap-x-4 gap-y-1 sm:justify-end"
        )}
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
  );
}

export function AppFooter() {
  return (
    <footer className="hidden w-full shrink-0 border-t border-white/55 bg-white/45 px-4 py-4 backdrop-blur-md md:block md:px-6">
      <AppLegalInfo />
    </footer>
  );
}
