import Link from "next/link";
import { requireAdmin } from "@/lib/auth/assert-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,248,241,0.94),rgba(248,239,228,0.84))]">
      <header className="border-b border-white/40 bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[13px] text-foreground/50 transition-colors hover:text-foreground"
            >
              ← Retour
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
                Back-office
              </p>
              <h1 className="font-serif text-[22px] text-foreground">Administration</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
