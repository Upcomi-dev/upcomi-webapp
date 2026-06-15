const STORAGE_PUBLIC_PATH_PREFIX = "/storage/v1/object/public/";
const APP_STORAGE_PATH_PREFIX = "/api/storage";
const FALLBACK_PUBLIC_APP_URL = "https://upcomi.com";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? null;
}

function getPublicAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);

  return (configuredUrl || FALLBACK_PUBLIC_APP_URL).replace(/\/$/, "");
}

export function encodeStorageObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

export function buildSupabasePublicStorageUrl(bucket: string, objectPath: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  return `${supabaseUrl}${STORAGE_PUBLIC_PATH_PREFIX}${encodeURIComponent(bucket)}/${encodeStorageObjectPath(objectPath)}`;
}

export function parseSupabasePublicStorageUrl(value: string | null | undefined) {
  const supabaseUrl = getSupabaseUrl();
  const trimmedValue = value?.trim();
  if (!supabaseUrl || !trimmedValue) return null;

  let sourceUrl: URL;
  let expectedUrl: URL;
  try {
    sourceUrl = new URL(trimmedValue);
    expectedUrl = new URL(supabaseUrl);
  } catch {
    return null;
  }

  if (sourceUrl.origin !== expectedUrl.origin) return null;
  if (!sourceUrl.pathname.startsWith(STORAGE_PUBLIC_PATH_PREFIX)) return null;

  const storagePath = sourceUrl.pathname.slice(STORAGE_PUBLIC_PATH_PREFIX.length);
  const firstSlashIndex = storagePath.indexOf("/");
  if (firstSlashIndex <= 0 || firstSlashIndex === storagePath.length - 1) return null;

  const bucket = decodeURIComponent(storagePath.slice(0, firstSlashIndex));
  const objectPath = storagePath
    .slice(firstSlashIndex + 1)
    .split("/")
    .map(decodeURIComponent)
    .join("/");

  return { bucket, objectPath };
}

export function getAppStorageImageUrl(
  value: string | null | undefined,
  options: { absolute?: boolean } = {}
) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  const parsedStorageUrl = parseSupabasePublicStorageUrl(trimmedValue);
  if (!parsedStorageUrl) return trimmedValue;

  const appPath = `${APP_STORAGE_PATH_PREFIX}/${encodeURIComponent(parsedStorageUrl.bucket)}/${encodeStorageObjectPath(parsedStorageUrl.objectPath)}`;
  return options.absolute ? `${getPublicAppUrl()}${appPath}` : appPath;
}
