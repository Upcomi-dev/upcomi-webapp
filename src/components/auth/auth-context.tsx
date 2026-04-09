"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  /** `true` once the initial auth check has completed. */
  ready: boolean;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * User hydrated on the server (via the middleware-refreshed cookies).
   * When provided, `ready` starts as `true` so the UI doesn't flicker between
   * "Connexion" and "Mon compte" on cold loads.
   */
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [ready, setReady] = useState(initialUser !== null);
  const userIdRef = useRef<string | null>(initialUser?.id ?? null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Always validate on mount: the server-provided `initialUser` may be
    // stale (e.g. if the token was revoked between SSR and hydration).
    (async () => {
      const {
        data: { user: fetched },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      userIdRef.current = fetched?.id ?? null;
      setUser(fetched ?? null);
      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (event === "INITIAL_SESSION") return;

      const nextUser = session?.user ?? null;
      // Short-circuit when nothing meaningful changed — prevents needless
      // re-renders on TOKEN_REFRESHED events where the user identity is stable.
      if (nextUser?.id === userIdRef.current && event === "TOKEN_REFRESHED") {
        return;
      }

      userIdRef.current = nextUser?.id ?? null;
      setUser(nextUser);
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Force server components to re-render with cleared cookies.
      router.replace("/");
      router.refresh();
    }
    return { error: error ?? null };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, ready, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
