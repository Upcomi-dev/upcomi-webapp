import { Suspense } from "react";
import { RouteAuthModal } from "@/components/auth/route-auth-modal";
import { HomeMapContent } from "../home-map-content";
import { getPrivatePageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata = getPrivatePageMetadata("Créer un compte", "/signup");

export default function SignupPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <Suspense>
        <RouteAuthModal initialView="signup" />
      </Suspense>
    </>
  );
}
