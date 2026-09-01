"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

export type AuthModalView = "gate" | "login" | "signup" | "forgot-password";

interface AuthModalContextValue {
  isOpen: boolean;
  view: AuthModalView;
  redirectAfterAuth: string;
  /** Titre du gate : le geste qui a amené là. Vide = titre générique. */
  gateTitle: string | undefined;
  openAuthModal: (opts?: {
    view?: AuthModalView;
    redirect?: string;
    title?: string;
  }) => void;
  closeAuthModal: () => void;
  setView: (view: AuthModalView) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Le gate — ce qu'on gagne à avoir un compte — est l'écran d'entrée par
  // défaut : on n'arrive directement sur un formulaire que si l'intention est
  // explicite (lien « Se connecter », route /login).
  const [view, setView] = useState<AuthModalView>("gate");
  const [redirectAfterAuth, setRedirectAfterAuth] = useState("/");
  const [gateTitle, setGateTitle] = useState<string | undefined>(undefined);

  const openAuthModal = useCallback(
    (opts?: { view?: AuthModalView; redirect?: string; title?: string }) => {
      setView(opts?.view ?? "gate");
      setRedirectAfterAuth(opts?.redirect ?? "/");
      setGateTitle(opts?.title);
      setIsOpen(true);
      trackAnalyticsEvent("Auth Modal Opened", {
        view: opts?.view ?? "gate",
        has_redirect: Boolean(opts?.redirect),
      });
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        view,
        redirectAfterAuth,
        gateTitle,
        openAuthModal,
        closeAuthModal,
        setView,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
