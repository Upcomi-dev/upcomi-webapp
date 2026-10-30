import "server-only";

const FFVELO_API_URL = "https://ffvelo-sync.osc-fr1.scalingo.io/api";
const FFVELO_USERNAME = "upcomi";
// L'API rafraîchit ses données toutes les 12 h : inutile de la rappeler plus souvent.
const FFVELO_REVALIDATE_SECONDS = 12 * 60 * 60;

type Raw = Record<string, unknown>;

const FFVELO_PRACTICES = ["Route", "VTT", "Gravel", "Marche"] as const;
export type FfveloPractice = (typeof FFVELO_PRACTICES)[number];

export interface FfveloCircuit {
  distance: number;
  elevation: number;
  /** 1 (facile) à 4 (très difficile), 0 si non renseigné. */
  difficulty: number;
}

export interface FfveloEvent {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  hours: string;
  closingTime: string;
  place: string;
  address: string;
  city: string;
  zip: string;
  department: string;
  region: string;
  club: string;
  practices: Partial<Record<FfveloPractice, FfveloCircuit[]>>;
  prices: { licAdult: string; licYoung: string; nonLicAdult: string; nonLicYoung: string };
  licensedOnly: boolean;
  registrationUrl: string;
  onlineRegistration: boolean;
  website: string;
  gpx: string[];
  flyer: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  accessible: boolean;
  sustainable: boolean;
  women: boolean;
  longDistance: boolean;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());
const flag = (value: unknown) => Number(value) === 1;
const coord = (value: unknown) => (text(value) && Number.isFinite(Number(value)) ? Number(value) : null);
// "027 - CODEP EURE" → "Eure (027)" ; "09 - COREG NORMANDIE" → "Normandie"
const titleCase = (value: string) =>
  value.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (char) => char.toUpperCase());
const label = (value: unknown, prefix: RegExp) => {
  const match = text(value).match(/^(\w+)\s*-\s*(.*)$/);
  return match ? { code: match[1], name: titleCase(match[2].replace(prefix, "").trim()) } : null;
};

function circuits(row: Raw, practice: FfveloPractice): FfveloCircuit[] {
  const result: FfveloCircuit[] = [];
  for (let i = 1; i <= 6; i++) {
    const distance = Number(row[`Oin${practice}Dist_${i}`]) || 0;
    if (!distance) continue;
    result.push({
      distance,
      elevation: Number(row[`Oin${practice}Deniv_${i}`]) || 0,
      difficulty: Number(row[`Oin${practice}Diff_${i}`]) || 0,
    });
  }
  return result.sort((a, b) => a.distance - b.distance);
}

function toEvent(row: Raw): FfveloEvent {
  const department = label(row.StructureDep, /^CODEP\s+/i);
  const region = label(row.StructureReg, /^COREG\s+/i);
  const practices: FfveloEvent["practices"] = {};
  for (const practice of FFVELO_PRACTICES) {
    if (flag(row[`Pratique_${practice}`])) practices[practice] = circuits(row, practice);
  }
  const contact = [text(row.Contact_Prenom), text(row.Contact_Nom)].filter(Boolean).map(titleCase);

  return {
    id: text(row.ManifId) || text(row.OBJECTID),
    name: text(row.Nom),
    type: text(row.Type),
    startDate: text(row.Accueil_DateDbt).slice(0, 10),
    endDate: text(row.Arrivee_DateFin).slice(0, 10),
    hours: text(row.heures),
    closingTime: text(row.heureDeCloture),
    place: titleCase(text(row.Accueil_Lieu)),
    address: titleCase(text(row.Accueil_Adresse)),
    city: titleCase(text(row.Accueil_Commune)),
    zip: text(row.Accueil_CP),
    department: department ? `${department.name} (${department.code})` : "",
    region: region?.name ?? "",
    club: titleCase(text(row.Structure).replace(/^\d+\s*-\s*/, "")),
    practices,
    prices: {
      licAdult: text(row.OinManifLicTarifAdulte),
      licYoung: text(row.OinManifLicTarifJeune),
      nonLicAdult: text(row.OinManifNonLicTarifAdulte),
      nonLicYoung: text(row.OinManifNonLicTarifJeune),
    },
    licensedOnly: flag(row.OinManifReserveLicencie),
    registrationUrl: text(row.InscriptionWeb),
    onlineRegistration: flag(row.InscriptionLigne) || Boolean(text(row.InscriptionWeb)),
    website: text(row.AdresseWeb),
    gpx: text(row.FichierGpx).split(",").map((url) => url.trim()).filter(Boolean),
    flyer: text(row.FichierFlyer),
    notes: text(row.OinManifObservation),
    contactName: contact.join(" "),
    contactEmail: text(row.AdresseMail),
    accessible: flag(row.AccesPSH),
    sustainable: flag(row.DevDurable),
    women: flag(row.SpeFem),
    longDistance: flag(row.LabelLongueDistance),
    lat: coord(row.Accueil_Lat),
    lng: coord(row.Accueil_Long),
    createdAt: text(row.date_creation).slice(0, 10),
  };
}

async function getToken() {
  const password = process.env.FFVELO_API_PASSWORD;
  if (!password) throw new Error("FFVELO_API_PASSWORD manquant");

  const res = await fetch(`${FFVELO_API_URL}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: FFVELO_USERNAME, password }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Login FFVélo refusé (${res.status})`);

  const { token } = (await res.json()) as { token?: string };
  if (!token) throw new Error("Login FFVélo : pas de token dans la réponse");
  return token;
}

export async function getFfveloManifestations(): Promise<FfveloEvent[]> {
  const token = await getToken();
  const res = await fetch(`${FFVELO_API_URL}/manifestations`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: FFVELO_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Manifestations FFVélo indisponibles (${res.status})`);

  // Format Esri : une manifestation par `features[].attributes`.
  const data = (await res.json()) as { features?: { attributes?: Raw }[] };
  return (data.features ?? []).map((feature) => toEvent(feature.attributes ?? {}));
}
