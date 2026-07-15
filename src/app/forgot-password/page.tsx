import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { HomeMapContent } from "../home-map-content";
import { getPrivatePageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata = getPrivatePageMetadata("Mot de passe oublié", "/forgot-password");

export default function ForgotPasswordPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <ForgotPasswordModal />
    </>
  );
}
