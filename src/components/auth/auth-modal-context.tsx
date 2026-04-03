"use client";

import { createContext, useCallback, useContext, useState } from "react";

type AuthModalView = "login" | "signup";

interface AuthModalContextValue {
  isOpen: boolean;
  view: AuthModalView;
  redirectAfterAuth: string;
  openAuthModal: (opts?: { view?: AuthModalView; redirect?: string }) => void;
  closeAuthModal: () => void;
  setView: (view: AuthModalView) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthModalView>("login");
  const [redirectAfterAuth, setRedirectAfterAuth] = useState("/");

  const openAuthModal = useCallback(
    (opts?: { view?: AuthModalView; redirect?: string }) => {
      setView(opts?.view ?? "login");
      setRedirectAfterAuth(opts?.redirect ?? "/");
      setIsOpen(true);
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
