import { notFound } from "next/navigation";
import { OnboardingPreview } from "./preview";

export default function OnboardingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OnboardingPreview />;
}
