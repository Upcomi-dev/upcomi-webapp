"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#f59e42] text-sm font-bold text-white">U</div>
            <span className="font-serif text-3xl font-bold text-[#d47a1a]">upcomi</span>
          </Link>
          <p className="mt-3 text-sm text-[#7C7C7C]">
            Crée ton compte pour sauvegarder tes événements favoris
          </p>
        </div>

        <div className="rounded-xl bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
          <SignupForm
            onSwitchToLogin={() => router.push("/login")}
          />
        </div>
      </div>
    </div>
  );
}
