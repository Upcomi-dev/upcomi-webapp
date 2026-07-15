export const SITE_URL = "https://upcomi.com";
export const SITE_NAME = "Upcomi";
export const DEFAULT_SEO_DESCRIPTION =
  "Découvre les courses, aventures, brevets et social rides vélo en France et à l'étranger.";

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function getEventPath(slug: string) {
  return `/event/${slug}`;
}

export function getEventUrl(slug: string) {
  return getCanonicalUrl(getEventPath(slug));
}
