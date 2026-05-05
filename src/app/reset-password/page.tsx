import { ResetPasswordModal } from "@/components/auth/reset-password-modal";
import { HomeMapContent } from "../home-map-content";

export const revalidate = 300;

export default function ResetPasswordPage() {
  return (
    <>
      <HomeMapContent params={{}} />
      <ResetPasswordModal />
    </>
  );
}
