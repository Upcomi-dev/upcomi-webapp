"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/components/auth/auth-modal-context";

const navItems = [
  {
    href: "/",
    label: "Carte",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
        <polygon points="1 6 1 21 8 17 14 21 21 17 21 2 14 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="17" />
        <line x1="14" y1="6" x2="14" y2="21" />
      </svg>
    ),
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

const profileIcon = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
    <path d="M20 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="11" cy="7" r="4" />
  </svg>
);

export function BottomNav() {
  const pathname = usePathname();
  const { openAuthModal } = useAuthModal();

  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-white/45 md:hidden"
      style={{
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        boxShadow: "0 -18px 50px rgba(36,23,15,0.12)",
      }}
    >
      <div className="flex items-center justify-around px-3 pt-2.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-[20px] px-2 py-2 transition-all",
                isActive
                  ? "bg-white/58 text-coral shadow-[var(--shadow-sm)]"
                  : "text-foreground/55"
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="flex flex-1 flex-col items-center gap-1 rounded-[20px] px-2 py-2 text-foreground/55 transition-all"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            {profileIcon}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
            Profil
          </span>
        </button>
      </div>
    </nav>
  );
}
