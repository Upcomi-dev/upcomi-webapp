import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, supabase, isAdmin: false };
  }

  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    supabase,
    isAdmin: Boolean(adminRecord),
  };
}

export async function assertAdmin() {
  const { user, supabase, isAdmin } = await getAdminContext();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!isAdmin) {
    throw new Error("Not authorized: admin access required");
  }

  return { user, supabase };
}

export async function requireAdmin(redirectPath = "/admin") {
  const { user, supabase, isAdmin } = await getAdminContext();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  if (!isAdmin) {
    notFound();
  }

  return { user, supabase };
}
