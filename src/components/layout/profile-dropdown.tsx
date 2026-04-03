"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileDropdownProps {
  onClose: () => void;
}

export function ProfileDropdown({ onClose }: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { email?: string } | null } }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  // Close on click outside — but not when confirming
  useEffect(() => {
    if (confirming) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, confirming]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.refresh();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 z-50 w-[260px] overflow-hidden rounded-[20px] border border-white/50 bg-white/90 shadow-[var(--shadow-md)] backdrop-blur-xl"
    >
      <div className="border-b border-foreground/6 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
          Connecté en tant que
        </p>
        <p className="mt-1 truncate text-[14px] font-medium text-foreground">
          {email || "..."}
        </p>
      </div>

      <div className="p-2">
        {confirming ? (
          <div className="space-y-2 px-1 py-1">
            <p className="text-[13px] text-foreground/70">
              Tu veux vraiment te déconnecter ?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-[12px] bg-red-500 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {loggingOut ? "Déconnexion..." : "Confirmer"}
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-[12px] border border-foreground/12 py-2 text-[12px] font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[13px] text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}
