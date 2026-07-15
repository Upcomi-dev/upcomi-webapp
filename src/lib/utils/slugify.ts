import slugifyLib from "slugify";

export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: "fr",
  });
}

export function makeEventSlug(name: string | null): string {
  return name ? slugify(name) : "event";
}

export function makeLegacyEventSlug(id: number, name: string | null): string {
  const slug = name ? slugify(name) : "event";
  return `${id}-${slug}`;
}

export function parseLegacyEventId(slug: string): number | null {
  const match = slug.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}
