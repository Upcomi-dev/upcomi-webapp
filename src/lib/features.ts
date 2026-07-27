import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const EVENT_PROPOSALS_FEATURE_KEY = "event_proposals";

export async function isEventProposalFeatureEnabled() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_features")
    .select("enabled")
    .eq("key", EVENT_PROPOSALS_FEATURE_KEY)
    .maybeSingle();

  if (error) {
    console.error("Failed to read event proposal feature flag", error);
    return false;
  }

  return data?.enabled === true;
}
