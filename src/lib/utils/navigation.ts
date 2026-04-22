export function buildRelativeUrl(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function withReturnTo(pathname: string, returnTo: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);
  return `${pathname}?${params.toString()}`;
}

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function getEventBackLabel(returnTo: string): string {
  if (returnTo === "/favorites" || returnTo.startsWith("/favorites?")) {
    return "Retour aux favoris";
  }

  if (returnTo.startsWith("/event/")) {
    return "Retour à l'événement";
  }

  if (returnTo.includes("view=map")) {
    return "Retour à la carte";
  }

  return "Retour à la liste";
}
