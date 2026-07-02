import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildSupabasePublicStorageUrl } from "@/lib/storage/urls";

const APP_STORAGE_BUCKETS = new Set(["upcomi"]);
const SIGNED_URL_TTL_SECONDS = 60;
const PUBLIC_IMAGE_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";
const PRIVATE_IMAGE_CACHE_CONTROL = "private, max-age=300";

type StorageReferenceKind = "event" | "avatar";

type StorageRouteContext = {
  params: Promise<{
    bucket: string;
    path: string[];
  }>;
};

function buildCandidatePublicUrls(bucket: string, objectPath: string) {
  const encodedUrl = buildSupabasePublicStorageUrl(bucket, objectPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const decodedUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
    : null;

  return Array.from(new Set([encodedUrl, decodedUrl].filter(Boolean))) as string[];
}

async function findAppReference(
  bucket: string,
  objectPath: string
): Promise<StorageReferenceKind | null> {
  const publicUrls = buildCandidatePublicUrls(bucket, objectPath);
  if (publicUrls.length === 0) return null;

  const supabase = createAdminClient();

  for (const publicUrl of publicUrls) {
    const [eventResult, userResult] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("verifie", true)
        .eq("image", publicUrl),
      supabase
        .from("users")
        .select("uid", { count: "exact", head: true })
        .eq("avatar_url", publicUrl),
    ]);

    if (eventResult.error || userResult.error) {
      throw eventResult.error ?? userResult.error;
    }

    if ((eventResult.count ?? 0) > 0) {
      return "event";
    }

    if ((userResult.count ?? 0) > 0) {
      return "avatar";
    }
  }

  return null;
}

async function hasAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user != null;
}

export async function GET(_request: Request, context: StorageRouteContext) {
  const { bucket, path } = await context.params;
  const objectPath = path.join("/");

  if (!APP_STORAGE_BUCKETS.has(bucket) || objectPath.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  let referenceKind: StorageReferenceKind | null;
  try {
    referenceKind = await findAppReference(bucket, objectPath);
  } catch {
    return new NextResponse("Unable to verify storage access", { status: 500 });
  }

  if (!referenceKind) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (referenceKind === "avatar" && !(await hasAuthenticatedUser())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  const storageResponse = await fetch(data.signedUrl);
  if (!storageResponse.ok || !storageResponse.body) {
    return new NextResponse("Not found", { status: storageResponse.status });
  }

  const responseHeaders = new Headers();
  const contentType = storageResponse.headers.get("content-type");
  const contentLength = storageResponse.headers.get("content-length");
  const etag = storageResponse.headers.get("etag");

  if (contentType) responseHeaders.set("content-type", contentType);
  if (contentLength) responseHeaders.set("content-length", contentLength);
  if (etag) responseHeaders.set("etag", etag);
  responseHeaders.set(
    "cache-control",
    referenceKind === "event"
      ? PUBLIC_IMAGE_CACHE_CONTROL
      : PRIVATE_IMAGE_CACHE_CONTROL
  );

  return new NextResponse(storageResponse.body, {
    status: storageResponse.status,
    headers: responseHeaders,
  });
}
