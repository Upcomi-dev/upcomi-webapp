"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModalDialog } from "./auth-modal";

interface RouteAuthModalProps {
  initialView: "login" | "signup";
}

export function RouteAuthModal({ initialView }: RouteAuthModalProps) {
  const [view, setView] = useState<"login" | "signup" | "forgot-password">(
    initialView
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  return (
    <AuthModalDialog
      open
      view={view}
      redirectTo={redirectTo}
      onClose={() => router.replace("/")}
      onViewChange={setView}
      showCloseButton={false}
    />
  );
}
