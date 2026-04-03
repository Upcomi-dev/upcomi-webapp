import slugifyLib from "slugify";

export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: "fr",
  });
}

export function makeEventSlug(id: number, name: string | null): string {
  const slug = name ? slugify(name) : "event";
  return `${id}-${slug}`;
}

export function parseEventSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
