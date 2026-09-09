import "server-only";

const DEFAULT_GEOCODING_API_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_USER_AGENT = "Upcomi/1.0 (https://app.upcomi.cc)";
const REQUEST_TIMEOUT_MS = 8_000;

type NominatimResult = {
  lat?: unknown;
  lon?: unknown;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function parseCoordinate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function geocodeDeparture(city: string, country: string): Promise<Coordinates> {
  const location = [city, country].filter(Boolean).join(", ");
  let endpoint: URL;

  try {
    endpoint = new URL(process.env.GEOCODING_API_URL || DEFAULT_GEOCODING_API_URL);
  } catch {
    throw new Error("Le service de géocodage est mal configuré.");
  }

  endpoint.searchParams.set("city", city);
  if (country) endpoint.searchParams.set("country", country);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("featureType", "settlement");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": "fr",
        "User-Agent": process.env.GEOCODING_USER_AGENT || DEFAULT_USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Le service de géocodage est indisponible. Réessayez dans quelques instants.");
  }

  if (!response.ok) {
    throw new Error("Le service de géocodage est indisponible. Réessayez dans quelques instants.");
  }

  let results: NominatimResult[];
  try {
    const body: unknown = await response.json();
    results = Array.isArray(body) ? body : [];
  } catch {
    throw new Error("Le service de géocodage a renvoyé une réponse invalide.");
  }

  const latitude = parseCoordinate(results[0]?.lat);
  const longitude = parseCoordinate(results[0]?.lon);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(`Lieu introuvable pour « ${location} ». Vérifiez la ville et le pays.`);
  }

  return { latitude, longitude };
}
