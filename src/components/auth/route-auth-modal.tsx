"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModalDialog } from "./auth-modal";
import type { AuthModalView } from "./auth-modal-context";

interface RouteAuthModalProps {
  initialView: AuthModalView;
}

export function RouteAuthModal({ initialView }: RouteAuthModalProps) {
  const [view, setView] = useState<AuthModalView>(initialView);
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
