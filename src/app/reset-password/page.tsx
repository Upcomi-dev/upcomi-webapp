import { ResetPasswordModal } from "@/components/auth/reset-password-modal";
import { HomeMapContent } from "../home-map-content";
import { getPrivatePageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata = getPrivatePageMetadata("Réinitialiser le mot de passe", "/reset-password");

export default function ResetPasswordPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <ResetPasswordModal />
    </>
  );
}
