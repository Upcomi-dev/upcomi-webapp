import { TopNavClient } from "@/components/layout/top-nav-client";
import { isEventProposalFeatureEnabled } from "@/lib/features";

export async function TopNav() {
  const eventProposalsEnabled = await isEventProposalFeatureEnabled();

  return <TopNavClient eventProposalsEnabled={eventProposalsEnabled} />;
}
