import type { Metadata } from "next";

export const SITE_URL = "https://app.upcomi.cc";
export const SITE_NAME = "Upcomi";
export const DEFAULT_SEO_DESCRIPTION =
  "Découvre les courses, aventures, brevets et social rides vélo en France et à l'étranger.";

export const SEO_KEYWORDS = [
  "événement vélo",
  "course cycliste",
  "brevet vélo",
  "ultra distance vélo",
  "social ride",
  "aventure vélo",
];

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

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function getPrivatePageMetadata(title: string, path: string): Metadata {
  return {
    title,
    alternates: { canonical: path },
    robots: { index: false, follow: false, noarchive: true },
  };
}
