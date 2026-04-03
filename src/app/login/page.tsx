"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
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
            Connecte-toi pour sauvegarder tes événements favoris
          </p>
        </div>

        <div className="rounded-xl bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
          <LoginForm
            redirectTo={redirect}
            onSwitchToSignup={() => router.push("/signup")}
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
