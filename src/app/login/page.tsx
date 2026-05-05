import { Suspense } from "react";
import { RouteAuthModal } from "@/components/auth/route-auth-modal";
import { HomeMapContent } from "../home-map-content";

export const revalidate = 300;

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
