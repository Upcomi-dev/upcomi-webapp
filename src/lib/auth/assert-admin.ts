import { createClient } from "@/lib/supabase/server";

export async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!adminRecord) {
    throw new Error("Not authorized: admin access required");
  }

  return { user, supabase };
}
