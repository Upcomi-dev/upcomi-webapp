import Image from "next/image";
import Link from "next/link";
import upcomiLogo from "@/assets/brand/upcomi-logo-horizontal-orange.png";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  href?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  ariaLabel?: string;
};

export function AppLogo({
  href,
  priority = false,
  sizes = "180px",
  className,
  imageClassName,
  ariaLabel = "Retour à l'accueil Upcomi",
}: AppLogoProps) {
  const logo = (
    <Image
      src={upcomiLogo}
      alt="Upcomi"
      priority={priority}
      sizes={sizes}
      className={cn("h-8 w-auto", imageClassName)}
    />
  );

  if (!href) {
    return <span className={cn("inline-flex items-center", className)}>{logo}</span>;
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={cn("inline-flex items-center", className)}>
      {logo}
    </Link>
  );
}
