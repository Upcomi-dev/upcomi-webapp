import { Suspense } from "react";
import { RouteAuthModal } from "@/components/auth/route-auth-modal";
import { HomeMapContent } from "../home-map-content";
import { getPrivatePageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata = getPrivatePageMetadata("Connexion", "/login");

export default function LoginPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <Suspense>
        <RouteAuthModal initialView="login" />
      </Suspense>
    </>
  );
}
