import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSupabasePublicStorageUrl } from "@/lib/storage/urls";

const APP_STORAGE_BUCKETS = new Set(["upcomi", "flutterflow"]);
const SIGNED_URL_TTL_SECONDS = 60;
const IMAGE_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

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

async function hasAppReference(bucket: string, objectPath: string) {
  const publicUrls = buildCandidatePublicUrls(bucket, objectPath);
  if (publicUrls.length === 0) return false;

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

    if ((eventResult.count ?? 0) > 0 || (userResult.count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

export async function GET(_request: Request, context: StorageRouteContext) {
  const { bucket, path } = await context.params;
  const objectPath = path.join("/");

  if (!APP_STORAGE_BUCKETS.has(bucket) || objectPath.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  let isReferenced: boolean;
  try {
    isReferenced = await hasAppReference(bucket, objectPath);
  } catch {
    return new NextResponse("Unable to verify storage access", { status: 500 });
  }

  if (!isReferenced) {
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
  responseHeaders.set("cache-control", IMAGE_CACHE_CONTROL);

  return new NextResponse(storageResponse.body, {
    status: storageResponse.status,
    headers: responseHeaders,
  });
}
