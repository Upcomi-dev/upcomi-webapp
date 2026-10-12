import garesData from "@/lib/data/gares.json";

/**
 * Référentiel des gares SNCF (voyageurs), extrait statique de data.sncf.com
 * embarqué dans le dépôt : la gare la plus proche est calculée au rendu
 * serveur, sans appel réseau ni clé d'API.
 *
 * La source liste une entrée par voie ; le fichier a été dédoublonné par
 * (nom, commune) en gardant le barycentre.
 */
interface Station {
  /** Nom de la gare. */
  n: string;
  /** Commune. */
  c: string;
  lat: number;
  lng: number;
}

const stations = garesData as Station[];

/**
 * Au-delà de ce rayon, la gare la plus proche n'est plus une information
 * d'accès : elle devient du bruit (et pour un départ hors de France, le
 * référentiel n'a de toute façon rien de pertinent à proposer).
 *
 * Venir sans voiture est un critère décisif relevé en test utilisateur ; le
 * prototype portait cette information par un booléen saisi à la main
 * (`trainAccess`), inexistant côté base. C'est la distance à la gare qui en
 * tient lieu ici, et elle est affichée en clair pour que l'utilisatrice juge
 * elle-même.
 */
const MAX_STATION_DISTANCE_KM = 30;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distance à vol d'oiseau en kilomètres (formule de Haversine). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export function formatStationDistance(km: number): string {
  return km < 10
    ? `${km.toFixed(1).replace(".", ",")} km`
    : `${Math.round(km)} km`;
}

export interface NearestStation {
  name: string;
  city: string;
  km: number;
  /** Libellé prêt à afficher, par exemple « Gare de Millau à 3,4 km ». */
  label: string;
}

/**
 * Gare la plus proche d'un point, ou `null` si les coordonnées manquent ou
 * qu'aucune gare ne tombe dans MAX_STATION_DISTANCE_KM.
 */
export function findNearestStation(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): NearestStation | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let best: Station | null = null;
  let bestKm = Infinity;

  for (const station of stations) {
    const km = distanceKm(latitude, longitude, station.lat, station.lng);
    if (km < bestKm) {
      bestKm = km;
      best = station;
    }
  }

  if (!best || bestKm > MAX_STATION_DISTANCE_KM) return null;

  return {
    name: best.n,
    city: best.c,
    km: bestKm,
    label: `Gare de ${best.n} à ${formatStationDistance(bestKm)}`,
  };
}
