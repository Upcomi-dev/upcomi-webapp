import "server-only";

const FFVELO_API_URL = "https://ffvelo-sync.osc-fr1.scalingo.io/api";
const FFVELO_USERNAME = "upcomi";
// L'API rafraîchit ses données toutes les 12 h : inutile de la rappeler plus souvent.
const FFVELO_REVALIDATE_SECONDS = 12 * 60 * 60;

export interface FfveloField {
  name: string;
  alias?: string;
  type?: string;
}

export interface FfveloManifestations {
  fields: FfveloField[];
  rows: Record<string, unknown>[];
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

export async function getFfveloManifestations(): Promise<FfveloManifestations> {
  const token = await getToken();
  const res = await fetch(`${FFVELO_API_URL}/manifestations`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: FFVELO_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Manifestations FFVélo indisponibles (${res.status})`);

  const data = (await res.json()) as {
    fields?: FfveloField[];
    features?: { attributes?: Record<string, unknown> }[];
  };
  const rows = (data.features ?? []).map((feature) => feature.attributes ?? {});
  // Format Esri : `fields` décrit normalement les colonnes ; sinon on les déduit des lignes.
  const fields =
    data.fields?.length
      ? data.fields
      : [...new Set(rows.flatMap((row) => Object.keys(row)))].map((name) => ({ name }));

  return { fields, rows };
}
