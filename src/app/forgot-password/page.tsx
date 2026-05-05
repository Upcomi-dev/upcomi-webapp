import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { HomeMapContent } from "../home-map-content";

export const revalidate = 300;

export default function ForgotPasswordPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <ForgotPasswordModal />
    </>
  );
}
