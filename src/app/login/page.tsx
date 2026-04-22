"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AppLogo } from "@/components/layout/app-logo";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <AppLogo
            href="/"
            priority
            className="justify-center"
            imageClassName="h-10 w-auto"
          />
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
